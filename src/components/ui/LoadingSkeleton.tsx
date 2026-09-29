export function LoadingSkeleton({ cards = 4, label = "Đang tải dữ liệu" }: { cards?: number; label?: string }) {
  return <div className="page-stack" role="status" aria-label={label}><span className="sr-only">{label}</span><div className="skeleton skeleton-line" style={{ width: "34%", height: 30 }} /> <div className="stats-grid four">{Array.from({ length: cards }, (_, index) => <div className="skeleton skeleton-card" key={index} />)}</div><div className="skeleton" style={{ height: 320 }} /></div>;
}
