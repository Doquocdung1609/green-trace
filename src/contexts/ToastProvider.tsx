import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Toast } from "../components/ui/Toast";
import { ToastContext, type ToastMessage } from "./toast-context";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setMessages((current) => current.filter((item) => item.id !== id)), []);
  const notify = useCallback((title: string, options?: { description?: string; tone?: "success" | "error" | "info" }) => {
    const message: ToastMessage = { id: nextId.current++, title, description: options?.description, tone: options?.tone ?? "success" };
    setMessages((current) => [...current, message]);
    window.setTimeout(() => dismiss(message.id), 4200);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite" aria-atomic="false">{messages.map((message) => <Toast key={message.id} message={message} onDismiss={() => dismiss(message.id)} />)}</div></ToastContext.Provider>;
}
