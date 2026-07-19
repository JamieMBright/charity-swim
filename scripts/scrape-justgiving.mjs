#!/usr/bin/env node
/**
 * Scrapes the JustGiving fundraising page with Playwright and writes the
 * total raised figure back to the Supabase `settings` table.
 *
 * Required environment variables:
 *   SUPABASE_URL            – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – Service-role key (bypasses RLS for the update)
 *   JUSTGIVING_PAGE_SLUG    – e.g. "karen-elaine-22-miles" or the full URL
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE_SLUG =
  process.env.JUSTGIVING_PAGE_SLUG ?? "karen-elaine-22-miles";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const slug = normaliseSlug(PAGE_SLUG);
const pageUrl = `https://www.justgiving.com/page/${encodeURIComponent(slug)}`;

console.log(`Scraping: ${pageUrl}`);

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  const totalRaised = await extractTotalRaised(page);

  if (totalRaised === null) {
    console.error("Could not extract a total raised figure from the page.");
    process.exit(1);
  }

  console.log(`Total raised: £${totalRaised}`);

  await writeToSupabase(totalRaised);

  console.log("Supabase updated successfully.");
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------

async function extractTotalRaised(page) {
  // Strategy 1: parse Next.js embedded page data
  const fromNextData = await page.evaluate(() => {
    try {
      const el = document.getElementById("__NEXT_DATA__");
      if (!el) return null;
      const data = JSON.parse(el.textContent ?? "");
      return findTotalRaised(data);
    } catch {
      return null;
    }

    function findTotalRaised(node, depth = 0) {
      if (depth > 15 || node === null || typeof node !== "object") return null;

      const keys = [
        "totalRaised",
        "totalRaisedOnline",
        "amountRaised",
        "raisedAmount",
        "grandTotalRaisedExcludingGiftAid",
      ];

      for (const key of keys) {
        if (key in node) {
          const v = Number(node[key]);
          if (Number.isFinite(v) && v >= 0) return v;
        }
      }

      for (const value of Object.values(node)) {
        if (value && typeof value === "object") {
          const found = findTotalRaised(value, depth + 1);
          if (found !== null) return found;
        }
      }

      return null;
    }
  });

  if (fromNextData !== null) {
    console.log("Extracted via __NEXT_DATA__");
    return fromNextData;
  }

  // Strategy 2: look for a monetary amount in prominent headings/spans
  const fromDom = await page.evaluate(() => {
    const selectors = [
      "[data-testid*='raised']",
      "[data-testid*='total']",
      "[class*='totalRaised']",
      "[class*='amount-raised']",
      "[class*='amountRaised']",
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent ?? "";
        const match = text.match(/[\d,]+(?:\.\d{1,2})?/);
        if (match) {
          const v = Number(match[0].replace(/,/g, ""));
          if (Number.isFinite(v) && v >= 0) return v;
        }
      }
    }
    return null;
  });

  if (fromDom !== null) {
    console.log("Extracted via DOM selector");
    return fromDom;
  }

  // Strategy 3: search the full page text for a "£X,XXX raised" pattern
  const pageText = await page.evaluate(() => document.body.innerText);
  const match = pageText.match(/£\s*([\d,]+(?:\.\d{1,2})?)\s*raised/i);
  if (match) {
    const v = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(v) && v >= 0) {
      console.log("Extracted via page text pattern");
      return v;
    }
  }

  return null;
}

async function writeToSupabase(totalRaised) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase
    .from("settings")
    .update({ justgiving_total_raised: totalRaised });

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }
}

function normaliseSlug(value) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? trimmed;
  } catch {
    return trimmed.replace(/^\/+/, "");
  }
}
