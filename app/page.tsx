import { ChannelMap } from "@/components/channel-map";
import { MoneyRaisedCard } from "@/components/money-raised-card";
import { ProgressBar } from "@/components/progress-bar";
import { formatCurrency, formatMiles, getProgressData, getProgressPercent } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function Home() {
  const progress = await getProgressData();
  const distancePercent = getProgressPercent(progress.totalMiles, progress.targetMiles);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#edf8ff_100%)] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-[0_24px_80px_rgba(34,91,124,0.14)] backdrop-blur sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Charity fundraiser
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Karen and Elaine are swimming the English Channel for charity.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Follow each pool session as they work towards 22 miles and a £
                {formatCurrency(progress.targetMoney)} fundraising goal.
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] bg-sky-50 p-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Distance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMiles(progress.totalMiles)} / {formatMiles(progress.targetMiles)} miles
                </p>
                <div className="mt-3">
                  <ProgressBar value={distancePercent} />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Time elapsed</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {progress.daysElapsed} day{progress.daysElapsed === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Since {progress.startDateDisplay}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-4 shadow-[0_24px_80px_rgba(34,91,124,0.14)] sm:p-6">
          <ChannelMap progressPercent={distancePercent} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(34,91,124,0.14)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Swim progress
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Across the Channel</h2>
            <p className="mt-2 text-slate-600">
              Every length moves both swimmers further from England and closer to France.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-lg font-semibold text-slate-900">
                  {formatMiles(progress.totalMiles)} miles completed
                </span>
                <span className="text-sm text-slate-500">{distancePercent.toFixed(0)}%</span>
              </div>
              <ProgressBar value={distancePercent} />
            </div>
          </div>

          <MoneyRaisedCard targetMoney={progress.targetMoney} />
        </section>
      </div>
    </main>
  );
}
