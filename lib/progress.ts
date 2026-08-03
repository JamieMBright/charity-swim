export const DEFAULT_TARGET_MILES = 22;
export const DEFAULT_TARGET_MONEY = 220;
export const UPDATE_SLUG = "form";

export const DEFAULT_POOL_LENGTH_METRES = 25;
const METRES_PER_MILE = 1609.344;

export type DistanceUnit = "metres" | "lengths";

export function convertToMiles(
  distance: number,
  unit: DistanceUnit,
  poolLengthMetres = DEFAULT_POOL_LENGTH_METRES,
) {
  if (unit === "metres") {
    return roundTo(distance / METRES_PER_MILE, 5);
  }

  return roundTo((distance * poolLengthMetres) / METRES_PER_MILE, 5);
}

export function getProgressPercent(current: number, target: number) {
  return Math.min(100, getUncappedProgressPercent(current, target));
}

export function getUncappedProgressPercent(current: number, target: number) {
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }

  const percent = (current / target) * 100;

  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.max(0, percent);
}

export function formatMiles(value: number) {
  return value.toFixed(2);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}
