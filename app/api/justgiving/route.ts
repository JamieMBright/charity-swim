import { NextResponse } from "next/server";

import { getJustGivingTotal } from "@/lib/justgiving";

export async function GET() {
  const result = await getJustGivingTotal();

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
    },
  });
}
