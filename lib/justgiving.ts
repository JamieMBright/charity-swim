import { createSupabaseClient } from "./progress";

const HARDCODED_FALLBACK_TOTAL = 166;

export async function getJustGivingTotal() {
  const supabase = createSupabaseClient();

  if (!supabase) {
    return {
      totalRaised: HARDCODED_FALLBACK_TOTAL,
      stale: true,
    };
  }

  const { data } = await supabase
    .from("settings")
    .select("justgiving_total_raised")
    .limit(1);

  const totalRaised = toNumber(data?.[0]?.justgiving_total_raised);

  if (totalRaised === null) {
    return {
      totalRaised: HARDCODED_FALLBACK_TOTAL,
      stale: true,
    };
  }

  return {
    totalRaised,
    stale: false,
  };
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
