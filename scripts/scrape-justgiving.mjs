#!/usr/bin/env node
/**
 * Scrapes the JustGiving fundraising page with Playwright and writes the
 * total raised figure back to `data/settings.json`, which the site reads.
 *
 * Optional environment variables:
 *   JUSTGIVING_PAGE_SLUG – e.g. "karen-elaine-22-miles" or the full URL
 *                          (defaults to the slug stored in data/settings.json)
 */

import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const SETTINGS_PATH = new URL("../data/settings.json", import.meta.url);
const settings = JSON.parse(await readFile(SETTINGS_PATH, "utf8"));
const PAGE_SLUG =
  process.env.JUSTGIVING_PAGE_SLUG ??
  settings.justGivingPageSlug ??
  "karen-elaine-22-miles";

const SANITY_CHECK_MULTIPLIER = 10;

const slug = normaliseSlug(PAGE_SLUG);
const pageUrls = buildCandidateUrls(slug);

console.log(`Scraping: ${pageUrls.join(", ")}`);

// `channel: "chromium"` runs the full headless browser rather than the older
// headless shell, which JustGiving's bot protection is far more likely to
// serve a challenge page to.
const browser = await chromium.launch({
  headless: true,
  channel: "chromium",
  args: ["--disable-blink-features=AutomationControlled"],
});

try {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-GB",
    timezoneId: "Europe/London",
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "en-GB,en;q=0.9" },
  });
  // `navigator.webdriver` is the cheapest automation tell to remove.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();

  const previousTotal = readCurrentTotal();
  console.log(
    `Previous stored total: ${previousTotal !== null ? `£${previousTotal}` : "(none)"}`,
  );

  let totalRaised = null;

  for (const pageUrl of pageUrls) {
    totalRaised = await scrapePage(page, pageUrl);
    if (totalRaised !== null) break;
  }

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

  if (previousTotal === totalRaised) {
    console.log("Total is unchanged; leaving data/settings.json alone.");
  } else {
    await writeTotal(totalRaised);
    console.log("data/settings.json updated successfully.");
  }
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------

async function scrapePage(page, pageUrl) {
  console.log(`Trying ${pageUrl}`);

  let response;
  try {
    response = await gotoWithRetry(page, pageUrl);
  } catch (error) {
    console.warn(`Could not load ${pageUrl}: ${error.message}`);
    return null;
  }

  const status = response?.status() ?? "unknown";
  console.log(`HTTP status: ${status}`);

  if (response && response.status() === 404) {
    console.warn(
      `${pageUrl} returned 404; trying the next URL if there is one.`,
    );
    return null;
  }

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

  const totalRaised = await extractTotalRaised(page);

  if (totalRaised === null) {
    await logPageDiagnostics(page);
  }

  return totalRaised;
}

// Logged whenever extraction fails so the workflow run says *why* — a bot
// challenge, a moved page and a rendering change all look identical otherwise.
async function logPageDiagnostics(page) {
  try {
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
    const excerpt = bodyText.replace(/\s+/g, " ").trim().slice(0, 500);
    console.error(`Diagnostics — final URL: ${page.url()}`);
    console.error(`Diagnostics — page title: ${title}`);
    console.error(`Diagnostics — body text excerpt: ${excerpt || "(empty)"}`);
  } catch (error) {
    console.error(`Could not collect page diagnostics: ${error.message}`);
  }
}

async function gotoWithRetry(page, url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
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
          if (Number.isFinite(v) && v > 0) return v;
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
    if (Number.isFinite(v) && v > 0) return v;
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
          if (Number.isFinite(v) && v > 0) return v;
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

  // Strategy 5: JustGiving's App Router pages stream their data into inline
  // `self.__next_f.push(...)` script chunks rather than `__NEXT_DATA__`, so as a
  // last resort scan the raw HTML for a total-raised key.
  const html = await page.content();
  const fromHtml = parseRaisedFromHtml(html);
  if (fromHtml !== null) {
    console.log(`Extracted via embedded page data: parsed £${fromHtml}`);
    return fromHtml;
  }

  return null;
}

export function parseRaisedFromHtml(html) {
  if (typeof html !== "string") return null;

  // Keys appear as `"totalRaised":123.45` in plain JSON and as
  // `\"totalRaised\":\"123.45\"` inside escaped streaming payloads.
  const pattern =
    /\\?"(?:totalRaised|totalRaisedOnline|amountRaised|raisedAmount|donationsTotal|grandTotalRaisedExcludingGiftAid)\\?"\s*:\s*(?:\{[^{}]*?\\?"(?:value|amount|total)\\?"\s*:\s*)?\\?"?(\d+(?:\.\d+)?)/gi;

  for (const match of html.matchAll(pattern)) {
    const v = Number(match[1]);
    if (Number.isFinite(v) && v > 0) return v;
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
      if (Number.isFinite(v) && v > 0) {
        console.log(
          `Page text match (${pattern.toString()}): matched text "${matched}", parsed £${v}`,
        );
        return v;
      }
    }
  }

  return null;
}

function readCurrentTotal() {
  const raw = settings.justGivingTotalRaised;

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

async function writeTotal(totalRaised) {
  const next = {
    ...settings,
    justGivingTotalRaised: totalRaised,
    justGivingUpdatedAt: new Date().toISOString(),
  };

  await writeFile(SETTINGS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
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

// JustGiving serves the same fundraiser under several path prefixes and has
// moved pages between them before, so try each in turn.
export function buildCandidateUrls(pageSlug) {
  const encoded = encodeURIComponent(pageSlug);
  return ["page", "fundraising", "crowdfunding"].map(
    (prefix) => `https://www.justgiving.com/${prefix}/${encoded}`,
  );
}
