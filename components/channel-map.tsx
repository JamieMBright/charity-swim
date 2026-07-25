import { formatMiles } from "@/lib/progress";

type SwimmerProgress = {
  name: string;
  distanceMiles: number;
  color: string;
};

type ChannelMapProps = {
  swimmers: SwimmerProgress[];
  totalMiles: number;
  targetMiles: number;
  progressPercent: number;
};

function Swimmer({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 72 42"
      className="h-full w-full overflow-visible drop-shadow-[0_5px_5px_rgba(4,49,73,0.25)]"
      aria-hidden="true"
    >
      <path d="M2 33c9-5 18-5 27 0 9 5 18 5 39-1" fill="none" stroke="#d9f7ff" strokeLinecap="round" strokeWidth="3" />
      <circle cx="40" cy="13" r="7" fill="#f2b38c" />
      <path d="M34 12c2-7 10-9 15-3l-2 5c-4-3-8-3-13-2Z" fill={color} />
      <path d="M16 25c10-7 20-9 30-5 6 2 11 6 17 7" fill="none" stroke={color} strokeLinecap="round" strokeWidth="7" />
      <path d="M26 23 15 14" fill="none" stroke="#f2b38c" strokeLinecap="round" strokeWidth="5" />
      <path d="M12 13 5 17" fill="none" stroke="#f2b38c" strokeLinecap="round" strokeWidth="4" />
      <path d="m19 28-11 6" fill="none" stroke="#f2b38c" strokeLinecap="round" strokeWidth="5" />
      <path d="M46 15c3 0 5 1 7 3" fill="none" stroke="#17324d" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function Seagull({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      d={`M${x} ${y}c${7 * scale}-${6 * scale} ${14 * scale}-${6 * scale} ${21 * scale} 0 ${7 * scale}-${6 * scale} ${14 * scale}-${6 * scale} ${21 * scale} 0`}
      fill="none"
      stroke="#335c70"
      strokeLinecap="round"
      strokeWidth={2.2 * scale}
    />
  );
}

export function ChannelMap({
  swimmers,
  totalMiles,
  targetMiles,
  progressPercent,
}: ChannelMapProps) {
  const safeProgress = Math.min(100, Math.max(0, progressPercent));
  const swimmerLeft = `${15 + safeProgress * 0.7}%`;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[#dff5ff] shadow-[0_30px_90px_rgba(9,70,105,0.2)]">
      <div className="flex flex-col gap-3 bg-[linear-gradient(110deg,#063c59_0%,#08749d_100%)] px-5 py-5 text-white sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">The crossing</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Together, across the Channel</h2>
        </div>
        <div className="flex items-baseline gap-2 sm:text-right">
          <strong className="text-3xl font-black tabular-nums">{formatMiles(totalMiles)}</strong>
          <span className="text-sm text-cyan-100">of {formatMiles(targetMiles)} miles</span>
        </div>
      </div>

      <div className="relative min-h-[430px] overflow-hidden bg-[linear-gradient(180deg,#bfeaff_0%,#e5f8ff_28%,#1496c4_29%,#0877a9_100%)] sm:min-h-[520px]">
        <svg
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="An illustrated route across the English Channel from England to France"
        >
          <defs>
            <linearGradient id="england-cliff" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5c8c56" />
              <stop offset=".7" stopColor="#91b96f" />
              <stop offset="1" stopColor="#f5f1db" />
            </linearGradient>
            <linearGradient id="france-cliff" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="#547f4e" />
              <stop offset=".7" stopColor="#8fb46a" />
              <stop offset="1" stopColor="#eee9d2" />
            </linearGradient>
            <pattern id="waves" width="120" height="38" patternUnits="userSpaceOnUse">
              <path d="M0 16c20-12 40-12 60 0s40 12 60 0" fill="none" stroke="#a9e8f4" strokeOpacity=".55" strokeWidth="3" />
            </pattern>
          </defs>

          <g opacity=".72">
            <circle cx="130" cy="78" r="34" fill="#fff" />
            <circle cx="166" cy="70" r="48" fill="#fff" />
            <circle cx="214" cy="82" r="31" fill="#fff" />
          </g>
          <g aria-hidden="true">
            <Seagull x={410} y={90} scale={1.05} />
            <Seagull x={755} y={116} scale={0.8} />
            <Seagull x={875} y={66} scale={0.6} />
          </g>

          <path d="M0 250 74 220l50 20 73-16 42 38 11 338H0Z" fill="url(#england-cliff)" />
          <path d="M0 345c68-29 117-16 173-29 31-7 53-18 77-36v320H0Z" fill="#f7f2df" />
          <path d="M0 389c76-24 153-27 250-60v271H0Z" fill="#d2bd79" />
          <path d="m1200 244-65-23-48 21-73-13-61 40-18 331h265Z" fill="url(#france-cliff)" />
          <path d="M1200 338c-72-25-118-11-177-25-29-7-53-20-70-37v324h247Z" fill="#f4eedc" />
          <path d="M1200 388c-85-25-165-30-247-64v276h247Z" fill="#d4bf7b" />

          <rect x="0" y="300" width="1200" height="300" fill="url(#waves)" />
          <path d="M178 438C390 392 769 390 1028 440" fill="none" stroke="#d7f8ff" strokeDasharray="5 17" strokeLinecap="round" strokeWidth="5" opacity=".85" />

          <g transform="translate(630 220)">
            <path d="M-62 30h138l-18 28H-45Z" fill="#f8fafc" />
            <path d="M-39 0h70l25 30h-107Z" fill="#f8fafc" />
            <path d="M-23 7h18v13h-18Zm29 0h18v13H6Z" fill="#167ca3" />
            <rect x="31" y="-22" width="8" height="31" rx="2" fill="#e65e4a" />
            <path d="M-70 62c33-10 66-10 99 0s66 10 99 0" fill="none" stroke="#d7f8ff" strokeWidth="6" />
          </g>

          <g fill="#214e35">
            <circle cx="67" cy="258" r="18" />
            <circle cx="100" cy="248" r="25" />
            <circle cx="1118" cy="259" r="22" />
            <circle cx="1151" cy="248" r="27" />
          </g>
        </svg>

        <div className="absolute left-4 top-4 rounded-2xl bg-white/88 px-4 py-3 shadow-lg backdrop-blur-sm sm:left-7 sm:top-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700">Start</p>
          <p className="text-lg font-black text-slate-800">England</p>
          <p className="text-xs text-slate-600">Shore</p>
        </div>
        <div className="absolute right-4 top-4 rounded-2xl bg-white/88 px-4 py-3 text-right shadow-lg backdrop-blur-sm sm:right-7 sm:top-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-700">Finish</p>
          <p className="text-lg font-black text-slate-800">France</p>
          <p className="text-xs text-slate-600">Rivage</p>
        </div>

        <div className="absolute bottom-[20%] left-[15%] right-[15%] border-t border-dashed border-white/50" aria-hidden="true" />
        <div
          className="absolute bottom-[18%] z-10 -translate-x-1/2 transition-[left] duration-700"
          style={{ left: swimmerLeft }}
        >
          <div className="mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#062f49]/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur">
            {safeProgress.toFixed(0)}% complete
          </div>
          <div className="channel-swimmers relative h-20 w-28 sm:h-24 sm:w-36">
            <div className="absolute left-0 top-0 h-12 w-20 -rotate-3 sm:h-14 sm:w-24">
              <Swimmer color={swimmers[0]?.color ?? "#f25f6b"} />
            </div>
            <div className="absolute bottom-0 right-0 h-12 w-20 rotate-2 sm:h-14 sm:w-24">
              <Swimmer color={swimmers[1]?.color ?? "#f4a53d"} />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2 sm:bottom-6 sm:left-7 sm:right-auto sm:flex">
          {swimmers.map((swimmer) => (
            <div key={swimmer.name} className="rounded-xl border border-white/30 bg-[#063c59]/88 px-3 py-2 text-white shadow-lg backdrop-blur-sm sm:min-w-36">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swimmer.color }} />
                <span className="text-sm font-bold">{swimmer.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-cyan-100">{formatMiles(swimmer.distanceMiles)} miles logged</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
