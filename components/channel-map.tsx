import { formatCurrency, formatMiles, getUncappedProgressPercent } from "@/lib/progress";

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
  totalRaised: number | null;
  targetMoney: number;
};

function Swimmer({ color }: { color: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 57c15-7 27-7 41 0s27 7 42 0 29-7 48 1" stroke="#d9f9ff" strokeWidth="4" opacity=".8" />
      <path d="M52 43c20-12 42-13 62-3" stroke={color} strokeWidth="15" />
      <path d="m65 44-24 14-25-2" stroke="#eeb18d" strokeWidth="8" />
      <path d="M81 37 61 19 35 13" stroke="#eeb18d" strokeWidth="8" />
      <path d="M112 41 132 30" stroke="#eeb18d" strokeWidth="7" />
      <path d="m110 45 27 9" stroke="#eeb18d" strokeWidth="7" />
      <circle cx="119" cy="32" r="12" fill="#eeb18d" stroke="none" />
      <path d="M107 29c4-11 19-14 27-4l-3 8c-7-5-15-6-24-4Z" fill={color} stroke="none" />
      <path d="m123 31 10 1" stroke="#153f59" strokeWidth="3" />
      <path d="M16 20c8-5 15-5 23 0M2 34c7-4 13-4 20 0" stroke="#d9f9ff" strokeWidth="3" opacity=".75" />
    </g>
  );
}

function SupportBoat() {
  return (
    <g>
      <path d="M-62 30h138l-18 28H-45Z" fill="#f8fafc" />
      <path d="M-39 0h70l25 30h-107Z" fill="#f8fafc" />
      <path d="M-23 7h18v13h-18Zm29 0h18v13H6Z" fill="#167ca3" />
      <rect x="31" y="-22" width="8" height="31" rx="2" fill="#e65e4a" />
    </g>
  );
}

function Seagull({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <path
      d={`M${x} ${y}c${6 * scale}-${5 * scale} ${12 * scale}-${5 * scale} ${18 * scale} 0 ${6 * scale}-${5 * scale} ${12 * scale}-${5 * scale} ${18 * scale} 0`}
      fill="none"
      stroke="#31596d"
      strokeLinecap="round"
      strokeWidth={2 * scale}
    />
  );
}

export function ChannelMap({
  swimmers,
  totalMiles,
  targetMiles,
  progressPercent,
  totalRaised,
  targetMoney,
}: ChannelMapProps) {
  const safeProgress = Math.min(100, Math.max(0, progressPercent));
  const moneyPercent = getUncappedProgressPercent(totalRaised ?? 0, targetMoney);
  const moneyBarWidth = Math.min(100, moneyPercent);
  const moneyOverTarget = moneyPercent > 100;
  const swimmerTop = `${34 + safeProgress * 0.28}%`;

  return (
    <section
      className="relative mx-auto min-h-[760px] w-full max-w-[430px] overflow-hidden bg-[#087cad] shadow-[0_25px_80px_rgba(2,48,73,0.28)] sm:min-h-[820px] sm:rounded-[2.5rem]"
      aria-label="Karen and Elaine's charity swim progress"
    >
      <svg
        viewBox="0 0 430 820"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="A portrait illustration of the English Channel from England to France"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bdeaff" />
            <stop offset="1" stopColor="#effbff" />
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#18a2cc" />
            <stop offset=".6" stopColor="#087eae" />
            <stop offset="1" stopColor="#05628f" />
          </linearGradient>
          <pattern id="waves" width="86" height="35" patternUnits="userSpaceOnUse">
            <path d="M0 15c14-9 29-9 43 0s29 9 43 0" fill="none" stroke="#b9eff8" strokeOpacity=".38" strokeWidth="2.5" />
          </pattern>
        </defs>

        <rect width="430" height="250" fill="url(#sky)" />
        <rect y="230" width="430" height="590" fill="url(#sea)" />
        <rect y="245" width="430" height="575" fill="url(#waves)" />

        <g opacity=".75">
          <circle cx="54" cy="170" r="29" fill="#fff" />
          <circle cx="87" cy="160" r="40" fill="#fff" />
          <circle cx="124" cy="173" r="25" fill="#fff" />
        </g>
        <Seagull x={276} y={165} scale={0.8} />
        <Seagull x={341} y={196} scale={0.55} />

        <path d="M0 205c65 8 109 20 159 47 42 22 85 21 121 8 54-20 94-21 150-8V0H0Z" fill="#619357" />
        <path d="M0 225c61 6 111 18 161 43 45 23 85 20 121 8 53-18 97-17 148-4v-41c-55-13-96-11-150 9-36 13-79 14-121-8-50-27-94-39-159-47Z" fill="#f5f1dc" />
        <path d="M0 246c61 4 112 16 163 38 47 21 87 17 122 7 51-15 95-13 145-1v-20c-51-13-95-14-148 4-36 12-76 15-121-8-50-25-100-37-161-43Z" fill="#d5bc72" />

        <path d="M0 765c70-16 122-15 177 5 41 15 81 14 118 0 45-16 88-17 135-7v57H0Z" fill="#d5bc72" />
        <path d="M0 783c68-15 120-13 174 7 43 16 84 15 122 1 44-16 87-17 134-7v36H0Z" fill="#f3edd8" />
        <path d="M0 801c69-13 123-10 177 7 42 13 80 12 118 1 45-14 88-14 135-5v16H0Z" fill="#5b8a51" />

        <path d="M215 288C178 380 251 445 213 534s31 137 2 203" fill="none" stroke="#d9f9ff" strokeDasharray="3 15" strokeLinecap="round" strokeWidth="5" opacity=".78" />
      </svg>

      <header className="absolute inset-x-0 top-0 z-10 bg-[linear-gradient(180deg,rgba(3,42,64,0.96)_0%,rgba(3,53,78,0.9)_75%,transparent_100%)] px-5 pb-12 pt-6 text-white sm:px-7 sm:pt-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200">
          Karen &amp; Elaine&apos;s charity swim
        </p>
        <h1 className="mt-2 text-[2rem] font-black leading-[0.98] tracking-[-0.04em]">
          Two swimmers.
          <br />
          One Channel.
        </h1>
        <div className="mt-5 flex items-end justify-between border-t border-white/20 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">Together</p>
            <p className="mt-1 text-3xl font-black tabular-nums">{formatMiles(totalMiles)} mi</p>
            <p className="text-xs text-cyan-100">of {formatMiles(targetMiles)} miles</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black leading-none tabular-nums">{safeProgress.toFixed(0)}%</p>
            <p className="mt-1 text-xs font-bold text-cyan-100">of the crossing</p>
          </div>
        </div>
      </header>

      <div className="absolute left-3 top-[27%] z-10 text-white drop-shadow-md">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-950/70">Start</p>
        <p className="text-sm font-black text-slate-900">ENGLAND</p>
      </div>
      <div className="absolute bottom-[4.5%] right-3 z-10 text-right">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-blue-950/60">Finish</p>
        <p className="text-sm font-black text-slate-900">FRANCE</p>
      </div>

      <div
        className="absolute left-1/2 z-20 h-[236px] w-[170px] -translate-x-1/2 transition-[top] duration-700"
        style={{ top: swimmerTop }}
      >
        <div className="channel-swimmers relative h-full w-full">
          <svg
            viewBox="0 0 170 236"
            className="h-full w-full overflow-visible drop-shadow-[0_5px_4px_rgba(2,43,67,0.35)]"
            aria-hidden="true"
          >
            <g transform="translate(123 8) rotate(90) scale(.58)">
              <Swimmer color={swimmers[1]?.color ?? "#f4a53d"} />
            </g>
            <g transform="translate(91 29) rotate(90) scale(.58)">
              <Swimmer color={swimmers[0]?.color ?? "#f25f6b"} />
            </g>
            <g transform="translate(79 180) scale(.85)">
              <SupportBoat />
            </g>
          </svg>
        </div>
      </div>

      <div className="absolute bottom-5 left-4 right-4 z-30 rounded-2xl border border-white/20 bg-[#042f49]/94 p-4 text-white shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-2 divide-x divide-white/15">
          {swimmers.map((swimmer) => (
            <div key={swimmer.name} className="px-3 first:pl-0 last:pr-0 last:text-right">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200 last:justify-end">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: swimmer.color }} />
                {swimmer.name}
              </p>
              <p className="mt-1 text-xl font-black tabular-nums">{formatMiles(swimmer.distanceMiles)} mi</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-white/15 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Raised for charity</p>
              <p className="mt-1 text-xl font-black tabular-nums">
                {totalRaised === null ? "Updating…" : `£${formatCurrency(totalRaised)}`}
                <span className="ml-1 text-xs font-semibold text-cyan-100">of £{formatCurrency(targetMoney)}</span>
              </p>
            </div>
            <p
              className={`text-lg font-black tabular-nums ${moneyOverTarget ? "text-[#ffd77a]" : ""}`}
            >
              {moneyPercent.toFixed(0)}%
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full ${
                moneyOverTarget ? "bg-[linear-gradient(90deg,#f5b746_0%,#ffe9a8_100%)]" : "bg-[#f5b746]"
              }`}
              style={{ width: `${moneyBarWidth}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
