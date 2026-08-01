import bundledSettings from "@/data/settings.json";
import bundledSwimLog from "@/data/swim-log.json";
import { DEFAULT_TARGET_MILES, DEFAULT_TARGET_MONEY } from "./progress";

export const DEFAULT_START_DATE = "2026-07-20";
export const DEFAULT_JUSTGIVING_SLUG = "karen-elaine-22-miles";

export const SETTINGS_PATH = "data/settings.json";
export const SWIM_LOG_PATH = "data/swim-log.json";

export const DATA_REPO = process.env.DATA_REPO ?? "JamieMBright/charity-swim";
export const DATA_BRANCH = process.env.DATA_BRANCH ?? "main";
const DATA_REVALIDATE_SECONDS = 60;

export type Swimmer = "karen" | "elaine";

export type Settings = {
  startDate: string;
  targetMiles: number;
  targetMoney: number;
  justGivingPageSlug: string;
  justGivingTotalRaised: number | null;
  justGivingUpdatedAt: string | null;
};

export type SwimEntry = {
  swimmer: Swimmer;
  date: string;
  distanceMiles: number;
};

export type ProgressData = {
  totalMiles: number;
  targetMiles: number;
  targetMoney: number;
  startDateDisplay: string;
  daysElapsed: number;
  swimmerMiles: Record<Swimmer, number>;
};

/**
 * Fetches a data file from GitHub so the site reflects committed updates
 * without waiting for a redeploy. Falls back to the copy bundled at build time
 * whenever the request fails.
 */
async function fetchDataFile(path: string): Promise<unknown> {
  const url = `https://raw.githubusercontent.com/${DATA_REPO}/${DATA_BRANCH}/${path}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: DATA_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export async function readSettings(): Promise<Settings> {
  const remote = await fetchDataFile(SETTINGS_PATH);

  return parseSettings(remote ?? bundledSettings);
}

export async function readSwimLog(): Promise<SwimEntry[]> {
  const remote = await fetchDataFile(SWIM_LOG_PATH);

  return parseSwimLog(remote ?? bundledSwimLog);
}

export async function getProgressData(): Promise<ProgressData> {
  const [settings, swimLog] = await Promise.all([readSettings(), readSwimLog()]);

  return buildProgressData(settings, swimLog);
}

export function buildProgressData(
  settings: Settings,
  swimLog: SwimEntry[],
): ProgressData {
  const swimmerMiles = swimLog.reduce<Record<Swimmer, number>>(
    (totals, entry) => {
      totals[entry.swimmer] += entry.distanceMiles;
      return totals;
    },
    { karen: 0, elaine: 0 },
  );

  return {
    totalMiles: swimmerMiles.karen + swimmerMiles.elaine,
    targetMiles: settings.targetMiles,
    targetMoney: settings.targetMoney,
    startDateDisplay: formatDate(settings.startDate),
    daysElapsed: getDaysElapsed(settings.startDate),
    swimmerMiles,
  };
}

export function parseSettings(value: unknown): Settings {
  const record = isRecord(value) ? value : {};

  return {
    startDate: isDateString(record.startDate)
      ? record.startDate
      : DEFAULT_START_DATE,
    targetMiles: toPositiveNumber(record.targetMiles) ?? DEFAULT_TARGET_MILES,
    targetMoney: toPositiveNumber(record.targetMoney) ?? DEFAULT_TARGET_MONEY,
    justGivingPageSlug:
      typeof record.justGivingPageSlug === "string" &&
      record.justGivingPageSlug.trim() !== ""
        ? record.justGivingPageSlug.trim()
        : DEFAULT_JUSTGIVING_SLUG,
    justGivingTotalRaised: toNumber(record.justGivingTotalRaised),
    justGivingUpdatedAt:
      typeof record.justGivingUpdatedAt === "string"
        ? record.justGivingUpdatedAt
        : null,
  };
}

export function parseSwimLog(value: unknown): SwimEntry[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const swimmer = normalizeSwimmer(entry.swimmer);
    const distanceMiles = toPositiveNumber(entry.distanceMiles);

    if (!swimmer || distanceMiles === null || !isDateString(entry.date)) {
      return [];
    }

    return [{ swimmer, date: entry.date, distanceMiles }];
  });
}

export function normalizeSwimmer(value: unknown): Swimmer | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "karen" || normalizedValue === "elaine") {
    return normalizedValue;
  }

  return null;
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function toPositiveNumber(value: unknown) {
  const numericValue = toNumber(value);

  return numericValue !== null && numericValue > 0 ? numericValue : null;
}
