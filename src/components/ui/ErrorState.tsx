import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function ErrorState({ title = "Không thể tải dữ liệu", description, action }: { title?: string; description: string; action?: ReactNode }) {
  return <div className="error-state" role="alert"><span className="error-state-icon"><AlertTriangle size={25} /></span><h3>{title}</h3><p>{description}</p>{action ?? <button className="button secondary" type="button" onClick={() => window.location.reload()}>Thử lại</button>}</div>;
}
