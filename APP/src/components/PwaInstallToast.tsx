import { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { usePwaInstall, getDeferredPwaPrompt } from '@/lib/pwaInstall';

interface Props {
  onOpenGuide: () => void;
}

export default function PwaInstallToast({ onOpenGuide }: Props) {
  const [visible, setVisible] = useState(false);
  const { isInstalled, triggerInstall } = usePwaInstall();

  useEffect(() => {
    if (isInstalled) {
      setVisible(false);
      return;
    }
    const dismissed = sessionStorage.getItem('pwa_toast_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  if (!visible || isInstalled) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('pwa_toast_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (getDeferredPwaPrompt()) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') {
        setVisible(false);
        return;
      }
    }
    setVisible(false);
    onOpenGuide();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-bounce-short">
      <div
        onClick={handleInstallClick}
        className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 p-3.5 text-white shadow-xl backdrop-blur transition hover:scale-[1.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>TẢI ỨNG DỤNG VỀ ĐIỆN THOẠI</span>
            </div>
            <p className="text-xs font-medium text-white/95 leading-tight mt-0.5">
              Cài trực tiếp Phối Đồ Studio cho Android &amp; iPhone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-600 shadow-xs transition group-hover:bg-rose-50">
            <Download className="h-3.5 w-3.5" />
            <span>Tải ngay</span>
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            title="Đóng thông báo"
            className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
