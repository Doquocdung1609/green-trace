import type { ReactNode } from "react";

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return <div className="data-table-wrap" role="region" aria-label={label} tabIndex={0}><table className="data-table">{children}</table></div>;
}
