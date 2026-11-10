/**
 * Thẻ mời tải app PWA (/app). Đặt ở màn đăng nhập (WardrobeDoorAuth) và cuối không gian chính.
 * Đăng nhập cùng tài khoản là hồ sơ và tủ đồ tự đồng bộ giữa web và app.
 */
import { Download, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import { APP_INSTALL_URL, APP_URL } from '../utils/appInvite';

interface AppDownloadCardProps {
  className?: string;
}

export function AppDownloadCard({ className = '' }: AppDownloadCardProps) {
  return (
    <section
      aria-labelledby="app-download-title"
      className={`rounded-card border border-line bg-surface text-fg p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="shrink-0 flex h-11 w-11 items-center justify-center rounded-control bg-accent-soft text-accent-text">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="app-download-title" className="text-sm sm:text-base font-semibold">
              Tải app Phối Đồ Studio về điện thoại
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-fg-muted">
              Thử đồ trên ma-nơ-canh 3D mọi lúc, mở nhanh từ màn hình chính.
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-muted">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Đăng nhập cùng tài khoản: hồ sơ và tủ đồ tự đồng bộ với web.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <a
            href={APP_INSTALL_URL}
            className="min-h-11 inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Tải app
          </a>
          <a
            href={APP_URL}
            className="min-h-11 inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-control border border-line bg-surface-2 px-4 text-sm font-medium text-fg hover:bg-line transition-colors"
          >
            Mở trên trình duyệt
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className="mt-3 text-[11px] sm:text-xs text-fg-muted">
        Android / Chrome: bấm “Tải app” rồi chọn Cài đặt. iPhone / Safari: mở app, bấm Chia sẻ → “Thêm vào MH chính”.
      </p>
    </section>
  );
}
