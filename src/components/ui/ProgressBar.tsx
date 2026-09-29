export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="progress-value" style={{ width: `${percent}%` }} />
    </div>
  );
}
