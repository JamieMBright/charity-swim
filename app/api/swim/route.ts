import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import {
  SWIM_LOG_PATH,
  isDateString,
  normalizeSwimmer,
  parseSwimLog,
  type SwimEntry,
} from "@/lib/data";
import { GitHubApiError, readRepoFile, writeRepoFile } from "@/lib/github";
import { convertToMiles, type DistanceUnit } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMIT_ATTEMPTS = 3;
const MAX_DISTANCE_MILES = 30;
const ALLOWED_POOL_LENGTHS = [25, 50];

export async function POST(request: Request) {
  if (!process.env.FORM_PASSWORD || !process.env.DATA_GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "Saving is not configured on this deployment." },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (!isAuthorized(payload.password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const entry = buildEntry(payload);

  if ("error" in entry) {
    return NextResponse.json({ error: entry.error }, { status: 400 });
  }

  try {
    const totalMiles = await appendSwimEntry(entry.value);

    return NextResponse.json({ entry: entry.value, totalMiles });
  } catch (error) {
    const status = error instanceof GitHubApiError ? 502 : 500;

    console.error("Failed to save swim entry", error);

    return NextResponse.json(
      { error: "The swim could not be saved. Please try again." },
      { status },
    );
  }
}

function isAuthorized(value: unknown) {
  const expected = process.env.FORM_PASSWORD;

  if (!expected || typeof value !== "string") {
    return false;
  }

  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(value, "utf8");

  if (expectedBytes.length !== providedBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, providedBytes);
}

function buildEntry(
  payload: Record<string, unknown>,
): { value: SwimEntry } | { error: string } {
  const swimmer = normalizeSwimmer(payload.swimmer);

  if (!swimmer) {
    return { error: "Choose Karen or Elaine." };
  }

  if (!isDateString(payload.date) || !isSaneDate(payload.date)) {
    return { error: "Enter a valid date within the last year." };
  }

  const unit: DistanceUnit = payload.unit === "lengths" ? "lengths" : "metres";
  const poolLength = Number(payload.poolLength);

  if (unit === "lengths" && !ALLOWED_POOL_LENGTHS.includes(poolLength)) {
    return { error: "Choose a 25m or 50m pool." };
  }

  const distance = Number(payload.distance);

  if (!Number.isFinite(distance) || distance <= 0) {
    return { error: "Enter a distance greater than zero." };
  }

  const distanceMiles = convertToMiles(
    distance,
    unit,
    unit === "lengths" ? poolLength : undefined,
  );

  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
    return { error: "Enter a distance greater than zero." };
  }

  if (distanceMiles > MAX_DISTANCE_MILES) {
    return { error: `A single swim cannot exceed ${MAX_DISTANCE_MILES} miles.` };
  }

  return { value: { swimmer, date: payload.date, distanceMiles } };
}

function isSaneDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`).getTime();
  const now = Date.now();

  return date <= now + 86_400_000 && date >= now - 365 * 86_400_000;
}

/**
 * Appends the entry to the swim log in GitHub. The read-modify-write cycle is
 * retried when another commit lands first and invalidates the blob SHA.
 */
async function appendSwimEntry(entry: SwimEntry) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_COMMIT_ATTEMPTS; attempt++) {
    const file = await readRepoFile(SWIM_LOG_PATH);

    let existing: SwimEntry[] = [];

    try {
      existing = parseSwimLog(JSON.parse(file.text));
    } catch {
      existing = [];
    }

    const entries = [...existing, entry];

    try {
      await writeRepoFile({
        path: SWIM_LOG_PATH,
        text: `${JSON.stringify(entries, null, 2)}\n`,
        sha: file.sha,
        message: `Log ${entry.swimmer}'s swim on ${entry.date}`,
      });

      return entries.reduce((total, item) => total + item.distanceMiles, 0);
    } catch (error) {
      const isConflict =
        error instanceof GitHubApiError &&
        (error.status === 409 || error.status === 422);

      if (!isConflict || attempt === MAX_COMMIT_ATTEMPTS) {
        throw error;
      }

      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError ?? new Error("Could not append the swim entry.");
}
