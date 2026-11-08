import { useState, useEffect } from 'react';
import ApkDownloadCard from './ApkDownloadCard';
import {
  X,
  Copy,
  Check,
  Smartphone,
  Download,
  QrCode,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareAppModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [guideActive, setGuideActive] = useState(false);

  const sharedAppUrl = 'https://ais-pre-6qptewqjy5un4hfmjet4ch-747123600806.asia-east1.run.app';

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedAppUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setCanInstallPwa(false);
        }
        setDeferredPrompt(null);
      } catch {
        // Ignore
      }
    } else {
      setGuideActive(true);
      const element = document.getElementById('pwa-instructions-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-rose-100 bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-800">
                Tải &amp; Cài Đặt App Trực Tiếp (Android &amp; iPhone)
              </h3>
              <p className="text-xs font-semibold text-rose-600">
                Ứng dụng PWA trực tiếp — Không cần trình duyệt mở rộng hay Extension!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <ApkDownloadCard />

          {/* Shareable Link Section */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              🔗 Link chính thức mở &amp; cài đặt app (Copy gửi cho bạn bè):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={sharedAppUrl}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-700 outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                ✓ Đã sao chép link! Bạn có thể dán (Paste) vào Zalo, Messenger hoặc trình duyệt để mở ứng dụng!
              </p>
            )}
          </div>


          {/* QR Code Quick Scan */}
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-white p-2 border border-stone-200 shadow-xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(sharedAppUrl)}`}
                alt="QR Code"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <QrCode className="h-4 w-4 text-rose-500" />
                <span>Quét QR trên điện thoại để mở ứng dụng</span>
              </div>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Dùng Camera iPhone/Android hoặc Zalo quét mã QR này để tải và mở app ngay mà không cần nhập link.
              </p>
            </div>
          </div>

          {/* Detailed Phone Installation Instructions */}
          <div id="pwa-instructions-section" className="space-y-3 pt-1 scroll-mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>HƯỚNG DẪN TẢI APP VỀ MÀN HÌNH CHÍNH (PWA CHO iOS &amp; ANDROID):</span>
            </h4>

            {/* Android Guide */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <span className="text-base">🤖</span>
                <span>Trên điện thoại Android (Samsung, Xiaomi, Oppo, Vivo, Realme...):</span>
              </div>
              <ol className="mt-2.5 space-y-2 text-stone-700 pl-5 list-decimal font-medium">
                <li>Mở link app bằng trình duyệt <strong>Chrome</strong>.</li>
                <li>Nhấn vào biểu tượng <strong>3 chấm (⋮)</strong> ở góc trên bên phải Chrome.</li>
                <li>Chọn <strong>&ldquo;Thêm vào màn hình chính&rdquo;</strong> (hoặc <strong>&ldquo;Cài đặt ứng dụng&rdquo;</strong>).</li>
                <li>Nhấn <strong>Cài đặt / Thêm</strong> ➔ Một icon app hình búp búp bê phối đồ sẽ xuất hiện ngay ngoài màn hình điện thoại như một ứng dụng độc lập!</li>
              </ol>
            </div>

            {/* iOS Guide */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-sky-900">
                <span className="text-base">🍎</span>
                <span>Trên iPhone / iPad (iOS):</span>
              </div>
              <ol className="mt-2.5 space-y-2 text-stone-700 pl-5 list-decimal font-medium">
                <li>Mở link app bằng trình duyệt <strong>Safari</strong>.</li>
                <li>Nhấn vào nút <strong>Chia sẻ (biểu tượng ô vuông có mũi tên chỉ lên ⎋)</strong> ở thanh dưới cùng Safari.</li>
                <li>Cuộn xuống chọn <strong>&ldquo;Thêm vào Màn hình chính&rdquo; (Add to Home Screen)</strong>.</li>
                <li>Nhấn <strong>Thêm (Add)</strong> ➔ Icon app sẽ xuất hiện trực tiếp trên màn hình iPhone, chạy toàn màn hình hoàn toàn độc lập!</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-stone-100 pt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
