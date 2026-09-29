import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./ui/ErrorState";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("GreenTrace UI error", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <main className="page-state"><ErrorState title="Không thể hiển thị màn hình này" description="Hãy tải lại trang. Nếu lỗi tiếp tục, vui lòng báo cho quản trị viên." action={<button className="button primary" onClick={() => window.location.reload()}>Tải lại</button>} /></main>;
    }
    return this.props.children;
  }
}
