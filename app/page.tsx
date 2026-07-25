import { ChannelMap } from "@/components/channel-map";
import { MoneyRaisedCard } from "@/components/money-raised-card";
import { ProgressBar } from "@/components/progress-bar";
import { formatCurrency, formatMiles, getProgressData, getProgressPercent } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function Home() {
  const progress = await getProgressData();
  const distancePercent = getProgressPercent(progress.totalMiles, progress.targetMiles);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#e6f7ff_0%,#f7fcff_55%,#eaf7fb_100%)] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-7">
        <section className="px-2 py-3 text-center sm:py-6">
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-sky-700">
            Karen &amp; Elaine&apos;s charity challenge
          </p>
          <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-black tracking-[-0.04em] text-[#073b59] sm:text-6xl">
            22 miles. Two swimmers. One Channel.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Every pool length moves them together from the English shore towards France,
            raising £{formatCurrency(progress.targetMoney)} for charity along the way.
          </p>
        </section>

        <ChannelMap
          totalMiles={progress.totalMiles}
          targetMiles={progress.targetMiles}
          progressPercent={distancePercent}
          swimmers={[
            {
              name: "Karen",
              distanceMiles: progress.swimmerMiles.karen,
              color: "#f25f6b",
            },
            {
              name: "Elaine",
              distanceMiles: progress.swimmerMiles.elaine,
              color: "#f4a53d",
            },
          ]}
        />

        <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(34,91,124,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Journey progress
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {formatMiles(progress.totalMiles)} miles together
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Day {progress.daysElapsed} · Started {progress.startDateDisplay}
                </p>
              </div>
              <strong className="text-3xl font-black text-sky-700">{distancePercent.toFixed(0)}%</strong>
            </div>
            <div className="mt-6 space-y-3">
              <ProgressBar value={distancePercent} />
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>England</span>
                <span>{formatMiles(progress.targetMiles)} mile finish</span>
                <span>France</span>
              </div>
            </div>
          </div>

          <MoneyRaisedCard targetMoney={progress.targetMoney} />
        </section>
      </div>
    </main>
  );
}
