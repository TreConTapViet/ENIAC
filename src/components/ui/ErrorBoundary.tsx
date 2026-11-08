import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Chữ hiện khi phần bên trong bị lỗi */
  title?: string;
  /** Đổi giá trị này (vd. giới tính, bộ đang ướm) để tự thử dựng lại sau lỗi */
  resetKey?: unknown;
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Chặn lỗi của một vùng (vd. studio 3D) để không làm trắng cả trang: hiện thông báo + nút Thử lại.
 * React chỉ hỗ trợ bắt lỗi khi render bằng class component.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Lỗi hiển thị đã được chặn:', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className={
          this.props.className ??
          'flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-panel border border-line bg-surface p-6 text-center'
        }
      >
        <p className="text-base font-semibold text-fg">{this.props.title ?? 'Phần này đang gặp sự cố'}</p>
        <p className="max-w-md text-sm text-fg-muted">
          Các mục khác của ứng dụng vẫn dùng bình thường. Bạn có thể thử tải lại phần này.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="h-10 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }
}
