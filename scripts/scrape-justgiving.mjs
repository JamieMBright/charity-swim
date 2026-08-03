#!/usr/bin/env node
/**
 * Scrapes the JustGiving fundraising page with Playwright and writes the
 * total raised figure back to `data/settings.json`, which the site reads.
 *
 * Optional environment variables:
 *   JUSTGIVING_PAGE_SLUG – e.g. "karen-elaine-22-miles" or the full URL
 *                          (defaults to the slug stored in data/settings.json)
 *   SCRAPE_DEBUG_DIR     – directory to write the page HTML/screenshot to when
 *                          extraction fails, for post-mortem debugging
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const SETTINGS_PATH = new URL("../data/settings.json", import.meta.url);
const settings = JSON.parse(await readFile(SETTINGS_PATH, "utf8"));
const PAGE_SLUG =
  process.env.JUSTGIVING_PAGE_SLUG ??
  settings.justGivingPageSlug ??
  "karen-elaine-22-miles";

const SANITY_CHECK_MULTIPLIER = 10;

const slug = normaliseSlug(PAGE_SLUG);
// JustGiving serves fundraising pages from a couple of paths and redirects
// between them. Trying each in turn means a change to the canonical path (or a
// transient block on one of them) no longer breaks the scrape.
const candidateUrls = [
  `https://www.justgiving.com/page/${encodeURIComponent(slug)}`,
  `https://www.justgiving.com/fundraising/${encodeURIComponent(slug)}`,
];

const previousTotal = readCurrentTotal();
console.log(
  `Previous stored total: ${previousTotal !== null ? `£${previousTotal}` : "(none)"}`,
);

// `headless: true` uses Chromium's headless shell, which is easy to fingerprint
// and is increasingly served bot-challenge pages. The "chromium" channel runs
// the regular browser build in headless mode instead.
const browser = await chromium.launch({ channel: "chromium", headless: true });

let totalRaised = null;

try {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-GB",
    timezoneId: "Europe/London",
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "en-GB,en;q=0.9" },
  });
  const page = await context.newPage();

  for (const pageUrl of candidateUrls) {
    console.log(`Scraping: ${pageUrl}`);

    let response;
    try {
      response = await gotoWithRetry(page, pageUrl);
    } catch (error) {
      console.warn(`Navigation to ${pageUrl} failed: ${error.message}`);
      continue;
    }

    console.log(
      `Navigation finished: HTTP ${response?.status() ?? "unknown"} at ${page.url()}`,
    );

    // JustGiving is a client-rendered app, so the total is not present at
    // `domcontentloaded`. Give the network a chance to settle and wait for a
    // monetary figure to appear before scraping. Both waits are best-effort so a
    // slow-but-present page still falls through to extraction.
    await page
      .waitForLoadState("networkidle", { timeout: 30_000 })
      .catch(() => {});
    const sawAmount = await page
      .waitForFunction(() => /£\s*[\d,]/.test(document.body?.innerText ?? ""), {
        timeout: 30_000,
      })
      .then(() => true)
      .catch(() => false);

    if (!sawAmount) {
      console.warn("No £ amount appeared on the page within 30s.");
    }

    totalRaised = await extractTotalRaised(page);

    if (totalRaised !== null) break;

    console.warn(`Could not extract a total from ${pageUrl}.`);
    await reportPageDiagnostics(page, slug);
  }
} finally {
  await browser.close();
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

// ---------------------------------------------------------------------------

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

/**
 * Logs (and optionally saves) enough of the page for a human to work out why
 * extraction failed — typically a bot-challenge page, a 404 after a slug
 * change, or a redesign that moved the figure.
 */
async function reportPageDiagnostics(page, slug) {
  const title = await page.title().catch(() => "(unavailable)");
  const text = await page
    .evaluate(() => document.body?.innerText ?? "")
    .catch(() => "");

  console.warn(`Page title: ${title}`);
  console.warn(
    `Page text (first 1000 chars):\n${text.slice(0, 1000).trim() || "(empty)"}`,
  );

  const debugDir = process.env.SCRAPE_DEBUG_DIR;
  if (!debugDir) return;

  try {
    await mkdir(debugDir, { recursive: true });
    // The slug is caller-supplied, so strip anything that is not filename-safe.
    const safeSlug = slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 60);
    const base = join(debugDir, `justgiving-${safeSlug}-${Date.now()}`);
    await writeFile(`${base}.html`, await page.content(), "utf8");
    await page.screenshot({ path: `${base}.png`, fullPage: true });
    console.warn(`Saved page HTML and screenshot to ${base}.{html,png}`);
  } catch (error) {
    console.warn(`Could not save debug artefacts: ${error.message}`);
  }
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
          // Ignore zero/absent figures so the search continues into sibling
          // objects rather than settling on an empty placeholder.
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

  // Strategy 2: scan the raw HTML for the same figures embedded in streamed
  // script payloads. React server components serialise their data into
  // `self.__next_f.push([...])` chunks rather than a `__NEXT_DATA__` element,
  // so the JSON is present but escaped and not parseable as a whole.
  const html = await page.content();
  const fromEmbeddedJson = parseTotalFromEmbeddedJson(html);

  if (fromEmbeddedJson !== null) {
    console.log(
      `Extracted via embedded script JSON: parsed £${fromEmbeddedJson}`,
    );
    return fromEmbeddedJson;
  }

  // Strategy 3: find the element containing exactly "Total" (standalone, case-
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

  // Strategy 4: look for a monetary amount in prominent headings/spans
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

  // Strategy 5: search the full page text for a "£X,XXX raised" pattern or
  // a "Total £X,XXX" pattern in the Donation Summary section.
  const pageText = await page.evaluate(() => document.body.innerText);
  const fromText = parseRaisedFromText(pageText);
  if (fromText !== null) {
    console.log(`Extracted via page text pattern: parsed £${fromText}`);
    return fromText;
  }

  return null;
}

/**
 * Pulls a raised figure out of JSON embedded in the page's scripts. Handles
 * both plain (`"totalRaised":166`) and escaped (`\"totalRaised\":{\"value\":166}`)
 * forms, the latter being how React server component payloads are serialised.
 */
export function parseTotalFromEmbeddedJson(html) {
  if (typeof html !== "string") return null;

  const keys = [
    "totalRaised",
    "totalRaisedOnline",
    "amountRaised",
    "raisedAmount",
    "donationsTotal",
    "grandTotalRaisedExcludingGiftAid",
  ];

  for (const key of keys) {
    const pattern = new RegExp(
      `\\\\?"${key}\\\\?"\\s*:\\s*(?:\\{[^{}]*?\\\\?"(?:value|amount|total)\\\\?"\\s*:\\s*)?"?(\\d+(?:\\.\\d{1,2})?)"?`,
      "g",
    );

    for (const match of html.matchAll(pattern)) {
      const v = Number(match[1]);
      if (Number.isFinite(v) && v > 0) {
        console.log(`Embedded JSON match on "${key}": parsed £${v}`);
        return v;
      }
    }
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
