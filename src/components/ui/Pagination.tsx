import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange?: (page: number) => void }) {
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Phân trang"><button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange?.(page - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pages }, (_, index) => index + 1).map((item) => <button type="button" key={item} className={page === item ? "active" : ""} aria-current={page === item ? "page" : undefined} onClick={() => onChange?.(item)}>{item}</button>)}<button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onChange?.(page + 1)}><ChevronRight size={16} /></button></nav>;
}
