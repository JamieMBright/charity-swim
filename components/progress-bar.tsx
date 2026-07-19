type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-sky-100">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#3aa4dd_0%,#0d6fb8_100%)] transition-[width]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
