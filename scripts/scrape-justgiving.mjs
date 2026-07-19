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

const SANITY_CHECK_MULTIPLIER = 10;

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

  await gotoWithRetry(page, pageUrl);

  // JustGiving is a client-rendered app, so the total is not present at
  // `domcontentloaded`. Give the network a chance to settle and wait for a
  // monetary figure to appear before scraping. Both waits are best-effort so a
  // slow-but-present page still falls through to extraction.
  await page
    .waitForLoadState("networkidle", { timeout: 30_000 })
    .catch(() => {});
  await page
    .waitForFunction(() => /£\s*[\d,]/.test(document.body?.innerText ?? ""), {
      timeout: 30_000,
    })
    .catch(() => {});

  const previousTotal = await fetchCurrentTotal();
  console.log(
    `Previous stored total: ${previousTotal !== null ? `£${previousTotal}` : "(none)"}`,
  );

  const totalRaised = await extractTotalRaised(page);

  if (totalRaised === null) {
    console.error("Could not extract a total raised figure from the page.");
    process.exit(1);
  }

  console.log(`Total raised: £${totalRaised}`);

  const sanityError = checkSanity(totalRaised, previousTotal);
  if (sanityError) {
    console.error(
      `Sanity check failed — ${sanityError}. Keeping last known value (£${previousTotal ?? "unknown"}).`,
    );
    process.exit(1);
  }

  await writeToSupabase(totalRaised);

  console.log("Supabase updated successfully.");
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------

async function gotoWithRetry(page, url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `Navigation attempt ${attempt}/${attempts} failed: ${error.message}`,
      );
      if (attempt < attempts) {
        await page.waitForTimeout(2_000 * attempt);
      }
    }
  }

  throw lastError;
}

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
        "donationsTotal",
        "grandTotalRaisedExcludingGiftAid",
      ];

      for (const key of keys) {
        if (key in node) {
          const raw = node[key];
          // The figure is sometimes wrapped in an object such as
          // `{ value: 166, currencyCode: "GBP" }`.
          const candidate =
            raw && typeof raw === "object"
              ? (raw.value ?? raw.amount ?? raw.total)
              : raw;
          const v = Number(candidate);
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
    console.log(`Extracted via __NEXT_DATA__: parsed £${fromNextData}`);
    return fromNextData;
  }

  // Strategy 2: find the element containing exactly "Total" (standalone, case-
  // sensitive) then look in its parent container for a sibling element whose
  // text contains a £ amount.
  const fromTotalLabel = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
    );
    let node;
    while ((node = walker.nextNode())) {
      // Only match leaf-ish elements whose own trimmed text is exactly "Total"
      if (node.children.length > 2) continue;
      if ((node.textContent?.trim() ?? "") !== "Total") continue;

      // Search siblings of this element, then siblings of its parent
      const candidates = [node, node.parentElement].filter(Boolean);
      for (const base of candidates) {
        let sibling = base.nextElementSibling;
        while (sibling) {
          const sibText = sibling.textContent?.trim() ?? "";
          const match = sibText.match(/£([\d,]+\.?\d*)/);
          if (match) {
            return { text: sibText, value: match[1] };
          }
          sibling = sibling.nextElementSibling;
        }
      }
    }
    return null;
  });

  if (fromTotalLabel !== null) {
    const v = parseFloat(fromTotalLabel.value.replace(/,/g, ""));
    console.log(
      `Extracted via "Total" label DOM traversal: matched text "${fromTotalLabel.text}", parsed £${v}`,
    );
    if (Number.isFinite(v) && v >= 0) return v;
  }

  // Strategy 3: look for a monetary amount in prominent headings/spans
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
    console.log(`Extracted via DOM selector: parsed £${fromDom}`);
    return fromDom;
  }

  // Strategy 4: search the full page text for a "£X,XXX raised" pattern or
  // a "Total £X,XXX" pattern in the Donation Summary section.
  const pageText = await page.evaluate(() => document.body.innerText);
  const fromText = parseRaisedFromText(pageText);
  if (fromText !== null) {
    console.log(`Extracted via page text pattern: parsed £${fromText}`);
    return fromText;
  }

  return null;
}

export function parseRaisedFromText(text) {
  if (typeof text !== "string") return null;

  // JustGiving renders the figure either as "£1,234 raised" or, in some
  // layouts, as "raised of £2,000". Try the amount-then-"raised" order first so
  // we do not accidentally pick up the target amount.
  // Also match the "Donation summary" section format: "Total\n£166.00"
  const patterns = [
    /£\s*([\d,]+(?:\.\d{1,2})?)\s*raised/i,
    /raised[^£\d]*£\s*([\d,]+(?:\.\d{1,2})?)/i,
    /Total\s*£([\d,]+\.\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const matched = match[0];
      const v = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(v) && v >= 0) {
        console.log(
          `Page text match (${pattern.toString()}): matched text "${matched}", parsed £${v}`,
        );
        return v;
      }
    }
  }

  return null;
}

async function fetchCurrentTotal() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await supabase
    .from("settings")
    .select("justgiving_total_raised")
    .not("justgiving_page_slug", "is", null)
    .limit(1);

  const raw = data?.[0]?.justgiving_total_raised;
  if (raw === null || raw === undefined) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

function checkSanity(value, previous) {
  if (value <= 0) {
    return `extracted value £${value} is zero or negative`;
  }

  if (
    previous !== null &&
    previous > 0 &&
    value > previous * SANITY_CHECK_MULTIPLIER
  ) {
    return `extracted value £${value} is more than ${SANITY_CHECK_MULTIPLIER}x the previous value £${previous}`;
  }

  return null;
}

async function writeToSupabase(totalRaised) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("settings")
    .update({ justgiving_total_raised: totalRaised })
    .not("justgiving_page_slug", "is", null)
    .select("justgiving_page_slug");

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Supabase update matched no rows; ensure a settings row exists.",
    );
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
