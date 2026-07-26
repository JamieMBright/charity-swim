import { ChannelMap } from "@/components/channel-map";
import { getJustGivingTotal } from "@/lib/justgiving";
import { getProgressData, getProgressPercent } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [progress, giving] = await Promise.all([
    getProgressData(),
    getJustGivingTotal(),
  ]);
  const distancePercent = getProgressPercent(progress.totalMiles, progress.targetMiles);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#dff4fc_0%,#f7fcff_55%,#e5f4f8_100%)] text-foreground sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="relative mx-auto w-full">
        <ChannelMap
          totalMiles={progress.totalMiles}
          targetMiles={progress.targetMiles}
          progressPercent={distancePercent}
          totalRaised={giving.totalRaised}
          targetMoney={progress.targetMoney}
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
      </div>
    </main>
  );
}
