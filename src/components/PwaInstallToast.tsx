import { useState, useEffect } from 'react';
import { Smartphone, ChevronRight, X, Sparkles } from 'lucide-react';

interface Props {
  onOpenGuide: () => void;
}

export default function PwaInstallToast({ onOpenGuide }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't dismissed it in this session
    const dismissed = sessionStorage.getItem('pwa_toast_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('pwa_toast_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-bounce-short">
      <div
        onClick={() => {
          setVisible(false);
          onOpenGuide();
        }}
        className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 p-3.5 text-white shadow-xl backdrop-blur transition hover:scale-[1.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>CÀI APP VỀ MÀN HÌNH CHÍNH</span>
            </div>
            <p className="text-xs font-medium text-white/95 leading-tight mt-0.5">
              Tải Phối Đồ Studio về iPhone &amp; Android
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 rounded-xl bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 shadow-xs transition group-hover:bg-rose-50">
            Xem ngay <ChevronRight className="h-3.5 w-3.5" />
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
