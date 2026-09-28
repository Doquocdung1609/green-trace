import { Component, type ErrorInfo, type ReactNode } from "react";

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
      return (
        <main className="page-state">
          <h1>Không thể hiển thị màn hình này</h1>
          <p>
            Hãy tải lại trang. Nếu lỗi tiếp tục, vui lòng báo cho quản trị viên.
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}
