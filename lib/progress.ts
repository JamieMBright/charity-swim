import { createClient } from "@supabase/supabase-js";

export const DEFAULT_TARGET_MILES = 22;
export const DEFAULT_TARGET_MONEY = 220;
export const UPDATE_SLUG = "form";

const POOL_LENGTH_METRES = 25;
const METRES_PER_MILE = 1609.344;

type ProgressData = {
  totalMiles: number;
  targetMiles: number;
  targetMoney: number;
  startDateDisplay: string;
  daysElapsed: number;
  swimmerMiles: {
    karen: number;
    elaine: number;
  };
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
  const defaultStartDate = "2026-07-20";
  const supabase = createSupabaseClient();

  if (!supabase) {
    return {
      totalMiles: 0,
      targetMiles: DEFAULT_TARGET_MILES,
      targetMoney: DEFAULT_TARGET_MONEY,
      startDateDisplay: formatDate(defaultStartDate),
      daysElapsed: 0,
      swimmerMiles: {
        karen: 0,
        elaine: 0,
      },
    };
  }

  const [{ data: settingsRows }, { data: swimRows }] = await Promise.all([
    supabase
      .from("settings")
      .select("start_date,target_miles,target_money,justgiving_page_slug")
      .limit(1),
    supabase.from("swim_log").select("distance_miles,swimmer_name"),
  ]);

  const settings = settingsRows?.[0];
  const startDate = settings?.start_date ?? defaultStartDate;
  const targetMiles = toNumber(settings?.target_miles) ?? DEFAULT_TARGET_MILES;
  const targetMoney = toNumber(settings?.target_money) ?? DEFAULT_TARGET_MONEY;
  const totalMiles = (swimRows ?? []).reduce(
    (total, row) => total + (toNumber(row.distance_miles) ?? 0),
    0,
  );
  const swimmerMiles = (swimRows ?? []).reduce(
    (totals, row) => {
      const swimmerName = normalizeSwimmerName(row.swimmer_name);
      const distanceMiles = toNumber(row.distance_miles) ?? 0;

      if (swimmerName) {
        totals[swimmerName] += distanceMiles;
      }

      return totals;
    },
    {
      karen: 0,
      elaine: 0,
    },
  );

  return {
    totalMiles,
    targetMiles,
    targetMoney,
    startDateDisplay: formatDate(startDate),
    daysElapsed: getDaysElapsed(startDate),
    swimmerMiles,
  };
}

export function convertToMiles(
  distance: number,
  unit: "metres" | "lengths",
  poolLengthMetres = POOL_LENGTH_METRES,
) {
  if (unit === "metres") {
    return roundTo(distance / METRES_PER_MILE, 5);
  }

  return roundTo((distance * poolLengthMetres) / METRES_PER_MILE, 5);
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

function normalizeSwimmerName(value: unknown): "karen" | "elaine" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "karen" || normalizedValue === "elaine") {
    return normalizedValue;
  }

  return null;
}
