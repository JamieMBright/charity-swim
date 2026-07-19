"use client";

import { useEffect, useState } from "react";

import { formatCurrency, getProgressPercent } from "@/lib/progress";

import { ProgressBar } from "./progress-bar";

type MoneyRaisedResponse = {
  totalRaised: number | null;
  stale: boolean;
};

type MoneyRaisedCardProps = {
  targetMoney: number;
};

export function MoneyRaisedCard({ targetMoney }: MoneyRaisedCardProps) {
  const [moneyRaised, setMoneyRaised] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMoneyRaised() {
      try {
        const response = await fetch("/api/justgiving", { cache: "no-store" });
        const payload = (await response.json()) as MoneyRaisedResponse;

        if (!isMounted) {
          return;
        }

        setMoneyRaised(payload.totalRaised);
        setStale(payload.stale);
      } catch {
        if (isMounted) {
          setStale(true);
        }
      }
    }

    void loadMoneyRaised();

    return () => {
      isMounted = false;
    };
  }, []);

  const progressValue = getProgressPercent(moneyRaised ?? 0, targetMoney);

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(34,91,124,0.14)]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
        Money raised
      </p>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">JustGiving total</h2>
      <p className="mt-5 text-3xl font-bold text-slate-900">
        {moneyRaised === null ? "Unavailable" : `£${formatCurrency(moneyRaised)}`}{" "}
        <span className="text-lg font-medium text-slate-500">/ £{formatCurrency(targetMoney)}</span>
      </p>
      <div className="mt-4">
        <ProgressBar value={progressValue} />
      </div>
      <p className="mt-4 text-sm text-slate-500">
        {stale && moneyRaised !== null
          ? "Showing the last cached amount while the JustGiving total refreshes."
          : "Totals refresh on page load and are cached for five minutes."}
      </p>
    </div>
  );
}
