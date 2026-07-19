type ChannelMapProps = {
  progressPercent: number;
};

function Swimmer() {
  return (
    <div className="h-10 w-10 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-full w-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.18)]">
        <circle cx="16" cy="16" r="7" fill="#f7c59f" />
        <path
          d="M21 20c6 0 10 3 13 8l-5 3c-2-3-4-5-8-5-2 0-4 1-6 2l-3-4c3-2 6-4 9-4Z"
          fill="#ef6f6c"
        />
        <path
          d="M5 32c5-3 10-5 15-5 7 0 12 3 19 8"
          fill="none"
          stroke="#0d6fb8"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M7 38c4-2 8-3 12-3 7 0 12 2 18 6"
          fill="none"
          stroke="#6cc9f0"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
}

export function ChannelMap({ progressPercent }: ChannelMapProps) {
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));
  const left = `calc(${clampedProgress}% * 0.76 + 12%)`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            Channel crossing
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">England to France</h2>
        </div>
        <p className="text-sm text-slate-500">Two swimmers move together with the total distance.</p>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(180deg,#dff4ff_0%,#8ad0f4_100%)] p-4 sm:p-6">
        <div className="relative aspect-[16/9] min-h-[260px] w-full rounded-[1.5rem] bg-[linear-gradient(180deg,#dff4ff_0%,#71c4ee_100%)]">
          <svg viewBox="0 0 960 540" className="h-full w-full">
            <path
              d="M0 60c55 15 92 45 122 92 28 43 67 74 127 96 61 22 98 53 123 102 18 35 26 88 22 190H0V60Z"
              fill="#f5e7b7"
            />
            <path
              d="M960 63c-48 15-87 47-117 94-27 42-62 72-116 93-60 22-100 57-126 109-20 39-27 88-24 181h383V63Z"
              fill="#f5e7b7"
            />
            <path
              d="M319 282c96-16 213-14 320 5"
              fill="none"
              stroke="#d6f2ff"
              strokeDasharray="14 14"
              strokeLinecap="round"
              strokeWidth="8"
            />
            <text x="84" y="100" fill="#7c6228" fontSize="32" fontWeight="700">
              England
            </text>
            <text x="748" y="105" fill="#7c6228" fontSize="32" fontWeight="700">
              France
            </text>
            <circle cx="155" cy="165" r="14" fill="#9ed46b" />
            <circle cx="208" cy="206" r="10" fill="#9ed46b" />
            <circle cx="806" cy="168" r="16" fill="#9ed46b" />
            <circle cx="751" cy="207" r="12" fill="#9ed46b" />
          </svg>

          <div className="absolute inset-0">
            <div style={{ left }} className="absolute top-[45%]">
              <Swimmer />
            </div>
            <div style={{ left }} className="absolute top-[59%]">
              <Swimmer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
