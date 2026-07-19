import { createClient } from "@supabase/supabase-js";

export const DEFAULT_TARGET_MILES = 22;
export const DEFAULT_TARGET_MONEY = 220;
export const UPDATE_SLUG = "update-xyz123";

const POOL_LENGTH_METRES = 25;
const METRES_PER_MILE = 1609.344;

type ProgressData = {
  totalMiles: number;
  targetMiles: number;
  targetMoney: number;
  startDateDisplay: string;
  daysElapsed: number;
  justGivingPageSlug: string | null;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function createSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getProgressData(): Promise<ProgressData> {
  const today = new Date();
  const defaultStartDate = today.toISOString().slice(0, 10);
  const supabase = createSupabaseClient();

  if (!supabase) {
    return {
      totalMiles: 0,
      targetMiles: DEFAULT_TARGET_MILES,
      targetMoney: DEFAULT_TARGET_MONEY,
      startDateDisplay: formatDate(defaultStartDate),
      daysElapsed: 0,
      justGivingPageSlug: process.env.JUSTGIVING_PAGE_SLUG ?? null,
    };
  }

  const [{ data: settingsRows }, { data: swimRows }] = await Promise.all([
    supabase
      .from("settings")
      .select("start_date,target_miles,target_money,justgiving_page_slug")
      .limit(1),
    supabase.from("swim_log").select("distance_miles"),
  ]);

  const settings = settingsRows?.[0];
  const startDate = settings?.start_date ?? defaultStartDate;
  const targetMiles = toNumber(settings?.target_miles) ?? DEFAULT_TARGET_MILES;
  const targetMoney = toNumber(settings?.target_money) ?? DEFAULT_TARGET_MONEY;
  const totalMiles = (swimRows ?? []).reduce(
    (total, row) => total + (toNumber(row.distance_miles) ?? 0),
    0,
  );

  return {
    totalMiles,
    targetMiles,
    targetMoney,
    startDateDisplay: formatDate(startDate),
    daysElapsed: getDaysElapsed(startDate),
    justGivingPageSlug:
      settings?.justgiving_page_slug ?? process.env.JUSTGIVING_PAGE_SLUG ?? null,
  };
}

export function convertToMiles(distance: number, unit: "miles" | "lengths") {
  if (unit === "miles") {
    return roundTo(distance, 4);
  }

  return roundTo((distance * POOL_LENGTH_METRES) / METRES_PER_MILE, 5);
}

export function getProgressPercent(current: number, target: number) {
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (current / target) * 100));
}

export function formatMiles(value: number) {
  return value.toFixed(1);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDaysElapsed(startDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000));
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}
