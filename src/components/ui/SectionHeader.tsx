import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div className="form-section-header" style={{ marginBottom: 0 }}>
        {Icon ? <span className="section-icon"><Icon size={20} /></span> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
