import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  usePwaInstall,
  getDeferredPwaPrompt,
  bumpManifestVersion,
} from '@/lib/pwaInstall';

interface Props {
  onShowFallbackGuide?: () => void;
}

export default function ApkDownloadCard({ onShowFallbackGuide }: Props) {
  const {
    isInstallable,
    isInstalling,
    isAndroid,
    isInAppWebView,
    triggerInstall,
  } = usePwaInstall();

  const [waitingPrompt, setWaitingPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const reloadTs = Number(
        sessionStorage.getItem('pwa_reinstall_reload_ts') || '0'
      );
      if (reloadTs && Date.now() - reloadTs < 15000) {
        sessionStorage.removeItem('pwa_reinstall_reload_ts');
        setStatusMessage(
          '✓ Đã tạo mới gói cài đặt thành công! Hãy bấm nút "CÀI APP VỀ ĐIỆN THOẠI" bên dưới để cài đặt ngay.'
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDirectDownloadClick = async () => {
    setStatusMessage(null);

    // 1. If native install prompt is ready right now, trigger it immediately on this page
    if (getDeferredPwaPrompt() || isInstallable) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') {
        setStatusMessage(
          '✓ Đang tải và cài đặt ứng dụng trực tiếp về điện thoại của bạn! (Nếu xoá app, bạn luôn có thể quay lại đây bấm cài lại).'
        );
        return;
      }
      if (outcome === 'dismissed') {
        setStatusMessage(
          'Bạn có thể bấm lại nút "CÀI APP VỀ ĐIỆN THOẠI" bất cứ lúc nào để cài đặt.'
        );
        return;
      }
    }

    // 2. If user is inside Zalo / Messenger / Facebook in-app browser on Android,
    // open directly in Android Chrome on the phone so Chrome can install the app natively
    if (isAndroid && isInAppWebView && typeof window !== 'undefined') {
      const targetHost =
        window.location.host ||
        'ais-pre-6qptewqjy5un4hfmjet4ch-747123600806.asia-east1.run.app';
      const intentUrl = `intent://${targetHost}/?install=1#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      return;
    }

    // 3. Rotate manifest version ID so if user previously installed & deleted the app,
    // Chrome sees a fresh app identity with zero cooldown
    bumpManifestVersion();
    setWaitingPrompt(true);

    const promptArrived = await new Promise<boolean>((resolve) => {
      let resolved = false;
      const onAvailable = () => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      };
      window.addEventListener('pwa-install-available', onAvailable, {
        once: true,
      });
      setTimeout(() => {
        window.removeEventListener('pwa-install-available', onAvailable);
        if (!resolved) {
          resolved = true;
          resolve(Boolean(getDeferredPwaPrompt()));
        }
      }, 1200);
    });
    setWaitingPrompt(false);

    if (promptArrived && getDeferredPwaPrompt()) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') {
        setStatusMessage(
          '✓ Đang tải và cài đặt ứng dụng trực tiếp về điện thoại của bạn!'
        );
        return;
      }
    }

    // 4. If the tab already consumed beforeinstallprompt from an earlier install in the same session,
    // reload the current page once with ?install=1 so Chrome re-evaluates the new manifest ID and fires a fresh prompt
    try {
      const lastReload = Number(
        sessionStorage.getItem('pwa_reinstall_reload_ts') || '0'
      );
      if (Date.now() - lastReload > 15000 && typeof window !== 'undefined') {
        sessionStorage.setItem('pwa_reinstall_reload_ts', String(Date.now()));
        setStatusMessage(
          'Đang làm mới gói cài đặt để bạn có thể cài lại ứng dụng ngay tại trang này...'
        );
        const nextUrl = `${window.location.pathname}?install=1`;
        window.location.replace(nextUrl);
        return;
      }
    } catch {
      // ignore storage errors
    }

    setStatusMessage(
      'Để cài đặt (hoặc cài lại sau khi xoá), hãy nhấn biểu tượng 3 chấm (⋮) góc trên trình duyệt ➔ chọn "Cài đặt ứng dụng" / "Thêm vào màn hình chính" (xem hướng dẫn ngay bên dưới).'
    );
    onShowFallbackGuide?.();
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-5 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-black text-base sm:text-lg">
            <Smartphone className="h-6 w-6 text-amber-300 shrink-0" />
            <span>TẢI &amp; CÀI ĐẶT APP TRỰC TIẾP VỀ MÁY</span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-white/95 leading-relaxed">
            Bấm nút bên dưới để ứng dụng tự động cài đặt thẳng về điện thoại ngay tại trang này (không chuyển tab sang web khác, nếu lỡ xoá app vẫn bấm cài lại được ngay).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-amber-200 font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tự cài ngay trên trang
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Hỗ trợ cài lại khi lỡ xoá
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDirectDownloadClick}
          disabled={isInstalling || waitingPrompt}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-xl transition hover:bg-emerald-50 hover:scale-105 active:scale-95 disabled:opacity-75 cursor-pointer justify-center w-full sm:w-auto"
        >
          {isInstalling || waitingPrompt ? (
            <>
              <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
              <span>ĐANG CHUẨN BỊ CÀI ĐẶT...</span>
            </>
          ) : isInstallable ? (
            <>
              <Download className="h-5 w-5 text-emerald-600 animate-bounce" />
              <span>CÀI APP VỀ ĐIỆN THOẠI</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5 text-emerald-600" />
              <span>CÀI / CÀI LẠI APP NGAY</span>
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className="mt-3 rounded-xl bg-black/25 px-3.5 py-2.5 text-xs font-semibold text-amber-100 border border-white/20">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
