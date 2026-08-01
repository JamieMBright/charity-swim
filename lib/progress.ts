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
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (current / target) * 100));
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
