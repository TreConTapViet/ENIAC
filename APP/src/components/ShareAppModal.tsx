import { useState } from 'react';
import ApkDownloadCard from './ApkDownloadCard';
import {
  X,
  Copy,
  Check,
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

  // App nằm ở /app/ cùng tên miền với web
  const sharedAppUrl = `${window.location.origin}${import.meta.env.BASE_URL}?install=1`;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(sharedAppUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
  };

  const scrollToFallbackGuide = () => {
    const element = document.getElementById('pwa-instructions-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
                Tải trực tiếp ngay trên trang web — Không chuyển hướng sang nơi khác!
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
          <ApkDownloadCard onShowFallbackGuide={scrollToFallbackGuide} />

          {/* Shareable Link Section */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              🔗 Link tải &amp; mở ứng dụng trực tiếp (Sao chép gửi qua Zalo / Messenger):
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
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                ✓ Đã sao chép link! Khi mở link này trên điện thoại Chrome/Safari, hộp thoại tải ứng dụng sẽ bật lên ngay lập tức.
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
                <span>Quét QR trên điện thoại để tải &amp; mở ứng dụng</span>
              </div>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Dùng Camera điện thoại hoặc Zalo quét mã QR này để mở trang tải ứng dụng trực tiếp về máy.
              </p>
            </div>
          </div>

          {/* Detailed Phone Installation Instructions */}
          <div id="pwa-instructions-section" className="space-y-3 pt-1 scroll-mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>CÁCH CÀI ĐẶT NHANH NẾU TRÌNH DUYỆT CHƯA BẬT HỘP THOẠI TỰ ĐỘNG:</span>
            </h4>

            {/* Android Guide */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <span className="text-base">🤖</span>
                <span>Trên điện thoại Android (Chrome / Samsung Internet):</span>
              </div>
              <ol className="mt-2.5 space-y-2 text-stone-700 pl-5 list-decimal font-medium">
                <li>Bấm nút <strong>&ldquo;TẢI APP VỀ ĐIỆN THOẠI&rdquo;</strong> màu xanh ở trên để hệ thống tự cài đặt.</li>
                <li>Nếu bạn mở qua Zalo/Messenger, hãy nhấn biểu tượng <strong>3 chấm (⋮)</strong> ở góc trên bên phải và chọn <strong>&ldquo;Cài đặt ứng dụng&rdquo;</strong> (Install app).</li>
                <li>Nhấn <strong>Cài đặt</strong> ➔ Ứng dụng sẽ tự động tải xuống và xuất hiện ngoài màn hình điện thoại như app gốc!</li>
              </ol>
            </div>

            {/* iOS Guide */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-sky-900">
                <span className="text-base">🍎</span>
                <span>Trên iPhone / iPad (Safari):</span>
              </div>
              <ol className="mt-2.5 space-y-2 text-stone-700 pl-5 list-decimal font-medium">
                <li>Nhấn vào nút <strong>Chia sẻ (biểu tượng ô vuông có mũi tên chỉ lên ⎋)</strong> ở thanh công cụ Safari.</li>
                <li>Chọn <strong>&ldquo;Thêm vào Màn hình chính&rdquo; (Add to Home Screen)</strong> và nhấn <strong>Thêm (Add)</strong>.</li>
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
