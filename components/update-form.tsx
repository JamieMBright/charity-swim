"use client";

import { useMemo, useState } from "react";

import {
  convertToMiles,
  createSupabaseClient,
  formatMiles,
  getProgressPercent,
} from "@/lib/progress";

import { ProgressBar } from "./progress-bar";

type UpdateFormProps = {
  defaultDate: string;
  initialTotalMiles: number;
  targetMiles: number;
};

type Unit = "metres" | "lengths";
type Swimmer = "karen" | "elaine";

export function UpdateForm({
  defaultDate,
  initialTotalMiles,
  targetMiles,
}: UpdateFormProps) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState<Unit>("metres");
  const [poolLength, setPoolLength] = useState<"25" | "50">("25");
  const [swimmer, setSwimmer] = useState<Swimmer>("karen");
  const [date, setDate] = useState(defaultDate);
  const [currentTotal, setCurrentTotal] = useState(initialTotalMiles);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const numericDistance = Number(distance);
  const convertedMiles =
    Number.isFinite(numericDistance) && numericDistance > 0
      ? convertToMiles(numericDistance, unit, Number(poolLength))
      : 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!supabase) {
      setErrorMessage("Add your Supabase URL and anon key before using this form.");
      return;
    }

    if (!Number.isFinite(numericDistance) || numericDistance <= 0) {
      setErrorMessage("Enter a distance greater than zero.");
      return;
    }

    setIsSubmitting(true);

    const distanceMiles = convertToMiles(numericDistance, unit, Number(poolLength));

    try {
      const { error } = await supabase.from("swim_log").insert({
        date,
        distance_miles: distanceMiles,
        swimmer_name: swimmer,
      });

      if (error) {
        throw error;
      }

      const { data, error: refreshError } = await supabase
        .from("swim_log")
        .select("distance_miles");

      if (refreshError) {
        throw refreshError;
      }

      const nextTotal = (data ?? []).reduce(
        (total, row) => total + Number(row.distance_miles ?? 0),
        0,
      );

      setCurrentTotal(nextTotal);
      setDistance("");
      setMessage(
        `Saved ${capitalize(swimmer)}'s ${numericDistance} ${unit} for ${date}. Total progress is now ${formatMiles(nextTotal)} miles.`,
      );
    } catch {
      setErrorMessage("The swim could not be saved. Please check the table policies and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(34,91,124,0.14)] sm:p-8">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Current total</h2>
          <span className="text-sm text-slate-500">
            {getProgressPercent(currentTotal, targetMiles).toFixed(0)}%
          </span>
        </div>
        <p className="text-lg font-semibold text-slate-900">
          {formatMiles(currentTotal)} / {formatMiles(targetMiles)} miles
        </p>
        <ProgressBar value={getProgressPercent(currentTotal, targetMiles)} />
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Who</span>
          <select
            value={swimmer}
            onChange={(event) => setSwimmer(event.target.value as Swimmer)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
          >
            <option value="karen">Karen</option>
            <option value="elaine">Elaine</option>
          </select>
        </label>

        <div className="grid gap-5 sm:grid-cols-[1fr_180px_180px]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Distance</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
              placeholder={unit === "metres" ? "500" : "40"}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Unit</span>
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value as Unit)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
            >
              <option value="metres">Metres</option>
              <option value="lengths">Lengths</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Pool length</span>
            <select
              value={poolLength}
              onChange={(event) => setPoolLength(event.target.value as "25" | "50")}
              disabled={unit !== "lengths"}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="25">25m</option>
              <option value="50">50m</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
            required
          />
        </label>

        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-slate-600">
          This entry will count as <span className="font-semibold text-slate-900">{formatMiles(convertedMiles)} miles</span> on the public visual.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-sky-700 px-6 py-3 font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save swim"}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mt-4 text-sm text-rose-700">{errorMessage}</p> : null}
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
