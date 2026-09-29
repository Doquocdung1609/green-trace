import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastMessage } from "../../contexts/toast-context";

export function Toast({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const Icon = message.tone === "success" ? CheckCircle2 : message.tone === "error" ? AlertCircle : Info;
  return <div className={`toast ${message.tone}`} role="status"><Icon size={20} /><div><strong>{message.title}</strong>{message.description ? <span>{message.description}</span> : null}</div><button type="button" onClick={onDismiss} aria-label="Đóng thông báo"><X size={16} /></button></div>;
}
