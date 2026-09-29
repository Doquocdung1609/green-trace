import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <article className="metric-card">
      <span className="metric-icon"><Icon size={21} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}
