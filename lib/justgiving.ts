import { createSupabaseClient } from "./progress";

const FIVE_MINUTES = 300_000;
const HARDCODED_PAGE_SLUG = "karen-elaine-22-miles";
const HARDCODED_FALLBACK_TOTAL = 166;

let cache: {
  totalRaised: number | null;
  updatedAt: number;
  pageSlug: string | null;
} = {
  totalRaised: HARDCODED_FALLBACK_TOTAL,
  updatedAt: 0,
  pageSlug: null,
};

export async function getJustGivingTotal() {
  const pageSlug = await getPageSlug();

  if (!pageSlug) {
    return {
      totalRaised: cache.totalRaised ?? HARDCODED_FALLBACK_TOTAL,
      stale: true,
    };
  }

  if (
    cache.pageSlug === pageSlug &&
    cache.totalRaised !== null &&
    Date.now() - cache.updatedAt < FIVE_MINUTES
  ) {
    return {
      totalRaised: cache.totalRaised,
      stale: false,
    };
  }

  try {
    const response = await fetch(
      `https://api.justgiving.com/v1/fundraising/pages/${encodeURIComponent(pageSlug)}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 300,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`JustGiving request failed with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const totalRaised = extractTotalRaised(payload);

    if (totalRaised === null) {
      throw new Error("Could not find a total raised value in the JustGiving response.");
    }

    cache = {
      totalRaised,
      updatedAt: Date.now(),
      pageSlug,
    };

    return {
      totalRaised,
      stale: false,
    };
  } catch {
    return {
      totalRaised: cache.totalRaised ?? HARDCODED_FALLBACK_TOTAL,
      stale: true,
    };
  }
}

async function getPageSlug() {
  if (process.env.JUSTGIVING_PAGE_SLUG) {
    return normalizePageSlug(process.env.JUSTGIVING_PAGE_SLUG);
  }

  const supabase = createSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("settings")
    .select("justgiving_page_slug")
    .limit(1);

  return (
    normalizePageSlug(data?.[0]?.justgiving_page_slug ?? null) ??
    HARDCODED_PAGE_SLUG
  );
}

function normalizePageSlug(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? null;
  } catch {
    return trimmedValue.replace(/^\/+/, "");
  }
}

function extractTotalRaised(payload: Record<string, unknown>) {
  const candidates = [
    payload.totalRaised,
    payload.totalRaisedOnline,
    payload.amountRaised,
    payload.raisedAmount,
    payload.grandTotalRaisedExcludingGiftAid,
    readNestedNumber(payload, "summary", "totalRaised"),
  ];

  for (const candidate of candidates) {
    const numericValue = toNumber(candidate);

    if (numericValue !== null) {
      return numericValue;
    }
  }

  const totalRaisedOnline = toNumber(payload.totalRaisedOnline);
  const totalRaisedOffline = toNumber(payload.totalRaisedOffline);

  if (totalRaisedOnline !== null || totalRaisedOffline !== null) {
    return (totalRaisedOnline ?? 0) + (totalRaisedOffline ?? 0);
  }

  return null;
}

function readNestedNumber(
  payload: Record<string, unknown>,
  key: string,
  nestedKey: string,
) {
  const nestedValue = payload[key];

  if (!nestedValue || typeof nestedValue !== "object") {
    return null;
  }

  return (nestedValue as Record<string, unknown>)[nestedKey] ?? null;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
}
