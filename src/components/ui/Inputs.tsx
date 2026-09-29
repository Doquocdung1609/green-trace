import { Search } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function SearchInput({ label = "Tìm kiếm", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="search-input"><span className="sr-only">{label}</span><Search size={18} aria-hidden="true" /><input type="search" {...props} /></label>;
}

export function FilterSelect({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="filter-select"><span>{label}</span><select {...props}>{children}</select></label>;
}

export function FormField({ label, required, help, children, className = "" }: { label: string; required?: boolean; help?: string; children: ReactNode; className?: string }) {
  return <label className={className}>{label}{required ? <span className="sr-only"> (bắt buộc)</span> : null}{required ? <span className="required" aria-hidden="true"> *</span> : null}{children}{help ? <span className="field-help">{help}</span> : null}</label>;
}
