import { useEffect, useRef } from "react";

export function ConfirmDialog({ open, title, description, confirmLabel = "Xác nhận", destructive = false, busy = false, onConfirm, onCancel }: { open: boolean; title: string; description: string; confirmLabel?: string; destructive?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{title}</h2><p>{description}</p><div className="confirm-dialog-actions"><button ref={cancelRef} type="button" className="button secondary" onClick={onCancel}>Hủy</button><button type="button" className={`button ${destructive ? "danger" : "primary"}`} disabled={busy} onClick={onConfirm}>{busy ? "Đang xử lý…" : confirmLabel}</button></div></section></div>;
}
