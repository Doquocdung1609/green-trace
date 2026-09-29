import type { LucideIcon } from "lucide-react";

export interface TabItem<T extends string> { value: T; label: string; icon?: LucideIcon }
export function TabNav<T extends string>({ items, value, onChange, label = "Điều hướng nội dung" }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label?: string }) {
  return <nav className="tab-nav" aria-label={label}>{items.map(({ value: itemValue, label: itemLabel, icon: Icon }) => <button key={itemValue} type="button" className={value === itemValue ? "active" : ""} aria-current={value === itemValue ? "page" : undefined} onClick={() => onChange(itemValue)}>{Icon ? <Icon size={18} /> : null}{itemLabel}</button>)}</nav>;
}
