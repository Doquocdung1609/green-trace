import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";
export interface ToastMessage { id: number; title: string; description?: string; tone: ToastTone }
export interface ToastContextValue { notify: (title: string, options?: { description?: string; tone?: ToastTone }) => void }
export const ToastContext = createContext<ToastContextValue | null>(null);
