/**
 * Thông báo nổi mời tải app PWA (/app), hiện một lần sau vài giây ở không gian chính.
 * Đóng thì 14 ngày sau mới hiện lại (src/utils/appInvite.ts). Trên điện thoại nằm trên thanh tab dưới đáy.
 */
import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import {
  APP_INSTALL_URL,
  readAppInviteDismissedAt,
  shouldShowAppInvite,
  writeAppInviteDismissedAt,
} from '../utils/appInvite';

const SHOW_DELAY_MS = 4000;

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function AppInstallToast() {
  const [visible, setVisible] = useState(false);
  // Thẻ "Tải app" ở chân trang đang hiện trên màn hình thì ẩn thông báo để không che lên nhau
  const [cardInView, setCardInView] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    if (!shouldShowAppInvite(Date.now(), readAppInviteDismissedAt(safeLocalStorage()), standalone)) return;
    const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible || typeof IntersectionObserver === 'undefined') return;
    const card = document.getElementById('app-download-title');
    if (!card) return;
    const io = new IntersectionObserver(([entry]) => setCardInView(entry.isIntersecting));
    io.observe(card);
    return () => io.disconnect();
  }, [visible]);

  const dismiss = () => {
    writeAppInviteDismissedAt(safeLocalStorage(), Date.now());
    setVisible(false);
  };

  if (!visible || cardInView) return null;

  return (
    <div
      role="dialog"
      aria-label="Mời tải app"
      className="fixed z-40 inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:w-[26rem] rounded-card border border-line bg-surface text-fg shadow-pop p-3.5 flex items-center gap-3"
    >
      <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-control bg-accent-soft text-accent-text">
        <Smartphone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Cài app Phối Đồ Studio</p>
        <p className="text-xs text-fg-muted">Dùng chung tài khoản, tủ đồ tự đồng bộ.</p>
      </div>
      <a
        href={APP_INSTALL_URL}
        onClick={dismiss}
        className="min-h-10 shrink-0 inline-flex items-center gap-1.5 rounded-control bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-hover transition-colors"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Tải app
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Đóng thông báo"
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-control text-fg-muted hover:bg-surface-2 cursor-pointer"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
