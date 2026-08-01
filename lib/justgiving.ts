import { readSettings } from "./data";

const HARDCODED_FALLBACK_TOTAL = 166;

export async function getJustGivingTotal() {
  const settings = await readSettings();

  if (settings.justGivingTotalRaised === null) {
    return {
      totalRaised: HARDCODED_FALLBACK_TOTAL,
      stale: true,
    };
  }

  return {
    totalRaised: settings.justGivingTotalRaised,
    stale: false,
  };
}
