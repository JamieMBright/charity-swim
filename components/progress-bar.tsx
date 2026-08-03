type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const percent = Number.isFinite(value) ? Math.max(0, value) : 0;
  const fillWidth = Math.min(100, percent);
  const isOverTarget = percent > 100;

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-sky-100">
      <div
        className={`h-full rounded-full transition-[width] ${
          isOverTarget
            ? "bg-[linear-gradient(90deg,#0d6fb8_0%,#f5b746_100%)]"
            : "bg-[linear-gradient(90deg,#3aa4dd_0%,#0d6fb8_100%)]"
        }`}
        style={{ width: `${fillWidth}%` }}
      />
    </div>
  );
}
