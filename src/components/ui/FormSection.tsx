import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function FormSection({ title, description, icon: Icon, children }: { title: string; description?: string; icon?: LucideIcon; children: ReactNode }) {
  return <section className="form-section"><header className="form-section-header">{Icon ? <span className="section-icon"><Icon size={21} /></span> : null}<div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></header>{children}</section>;
}
