import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Camera,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

export interface SocialShareMetadata {
  gender: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  waistCm?: number;
  hipCm?: number;
  bustCm?: number;
  bodyShapeName: string;
  occasionLabel?: string;
  occasionEmoji?: string;
  outfitTitle: string;
  swatchColors: string[];
  harmonyScore?: number;
}

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawSnapshotDataUrl: string | null;
  onRetakeSnapshot: () => void;
  metadata: SocialShareMetadata;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  rawSnapshotDataUrl,
  onRetakeSnapshot,
  metadata,
}) => {
  const [frameMode, setFrameMode] = useState<'lookbook' | 'clean'>('lookbook');
  const [compositedDataUrl, setCompositedDataUrl] = useState<string | null>(
    null
  );
  const [caption, setCaption] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize default caption when modal opens or metadata changes
  useEffect(() => {
    if (!isOpen) return;
    const occPart = metadata.occasionLabel
      ? `cho dịp ${metadata.occasionEmoji || '✨'} ${metadata.occasionLabel}`
      : '';
    const measurePart =
      metadata.gender === 'female' && metadata.bustCm && metadata.waistCm && metadata.hipCm
        ? `(${metadata.heightCm}cm · ${metadata.weightKg}kg · 3 vòng ${metadata.bustCm}-${metadata.waistCm}-${metadata.hipCm}cm)`
        : `(${metadata.heightCm}cm · ${metadata.weightKg}kg)`;
    setCaption(
      `✨ Phối đồ 3D Virtual Try-On ${occPart} cùng Smart Wardrobe!\n` +
        `👗 Trang phục: ${metadata.outfitTitle}\n` +
        `💃 Dáng người: ${metadata.bodyShapeName} ${measurePart}\n` +
        `#SmartWardrobe #VirtualTryOn #OOTD #3DFashion #Lookbook`
    );
  }, [isOpen, metadata]);

  // Render high-resolution 2D Lookbook Card or Clean Snapshot onto offscreen canvas
  useEffect(() => {
    if (!isOpen || !rawSnapshotDataUrl) return;

    if (frameMode === 'clean') {
      setCompositedDataUrl(rawSnapshotDataUrl);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      // High-res portrait/square editorial format
      const outW = Math.max(1080, img.width);
      const footerH = Math.round(outW * 0.16);
      const imgTargetH = Math.round((img.height / Math.max(1, img.width)) * outW);
      const outH = imgTargetH + footerH;

      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCompositedDataUrl(rawSnapshotDataUrl);
        return;
      }

      // 1. Studio background fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outW, outH);

      // 2. Draw the high-DPI 3D mannequin snapshot
      ctx.drawImage(img, 0, 0, outW, imgTargetH);

      // 3. Top-left Editorial Badge overlay on image
      const pad = Math.round(outW * 0.032);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      const badgeW = Math.round(outW * 0.42);
      const badgeH = Math.round(outW * 0.062);
      roundRect(ctx, pad, pad, badgeW, badgeH, Math.round(badgeH * 0.35));
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(outW * 0.022)}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      const occText = metadata.occasionLabel
        ? `${metadata.occasionEmoji || '✨'} ${metadata.occasionLabel.toUpperCase()} LOOKBOOK`
        : '✨ SMART WARDROBE 3D LOOKBOOK';
      ctx.fillText(occText, pad + Math.round(outW * 0.02), pad + badgeH / 2);
      ctx.restore();

      // 4. Bottom Editorial Info Bar
      const footerY = imgTargetH;
      const grad = ctx.createLinearGradient(0, footerY, outW, outH);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, footerY, outW, footerH);

      // Accent top border line on footer
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(0, footerY, outW, Math.max(4, Math.round(outW * 0.004)));

      // Outfit Title & Body Shape Info
      const textX = pad;
      const titleY = footerY + Math.round(footerH * 0.36);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(outW * 0.028)}px Inter, system-ui, sans-serif`;
      ctx.fillText(
        truncateText(metadata.outfitTitle, 44),
        textX,
        titleY
      );

      const subY = footerY + Math.round(footerH * 0.70);
      ctx.fillStyle = '#FDA4AF';
      ctx.font = `600 ${Math.round(outW * 0.020)}px Inter, system-ui, sans-serif`;
      const bodySummary =
        metadata.gender === 'female' &&
        metadata.bustCm &&
        metadata.waistCm &&
        metadata.hipCm
          ? `${metadata.bodyShapeName} · ${metadata.heightCm}cm / ${metadata.weightKg}kg · 3 Vòng ${metadata.bustCm}-${metadata.waistCm}-${metadata.hipCm}cm`
          : `${metadata.bodyShapeName} · ${metadata.heightCm}cm / ${metadata.weightKg}kg`;
      ctx.fillText(bodySummary, textX, subY);

      // Right side Color Palette Swatches
      const swatchR = Math.round(outW * 0.018);
      const swatchGap = Math.round(outW * 0.044);
      const swatches = metadata.swatchColors.slice(0, 4);
      const startRightX = outW - pad - swatchR;
      const swatchCenterY = footerY + Math.round(footerH * 0.5);

      swatches.forEach((hex, idx) => {
        const cx = startRightX - (swatches.length - 1 - idx) * swatchGap;
        ctx.beginPath();
        ctx.arc(cx, swatchCenterY, swatchR, 0, Math.PI * 2);
        ctx.fillStyle = hex || '#E2E8F0';
        ctx.fill();
        ctx.lineWidth = Math.max(2, Math.round(outW * 0.0025));
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
      });

      canvasRef.current = canvas;
      setCompositedDataUrl(canvas.toDataURL('image/png', 1.0));
    };
    img.src = rawSnapshotDataUrl;

    return () => {
      cancelled = true;
    };
  }, [isOpen, rawSnapshotDataUrl, frameMode, metadata]);

  if (!isOpen) return null;

  const activeImageUrl = compositedDataUrl || rawSnapshotDataUrl || '';

  const showTempBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4500);
  };

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleDownloadPng = () => {
    if (!activeImageUrl) return;
    const link = document.createElement('a');
    const safeOcc = (metadata.occasionLabel || 'lookbook')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.download = `smart-wardrobe-3d-${safeOcc}-${Date.now()}.png`;
    link.href = activeImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showTempBanner('Đã tải xuống ảnh 2D PNG chất lượng cao!');
  };

  const handleCopyImageToClipboard = async () => {
    if (!activeImageUrl) return;
    try {
      const blob = await dataUrlToBlob(activeImageUrl);
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 3000);
        showTempBanner(
          'Đã sao chép ảnh 2D vào bộ nhớ tạm! Bạn có thể nhấn Ctrl+V (Dán) trực tiếp vào bài đăng Facebook, Zalo, Messenger hoặc Instagram.'
        );
      } else {
        handleDownloadPng();
      }
    } catch {
      handleDownloadPng();
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 3000);
      showTempBanner('Đã sao chép nội dung Caption & Hashtag!');
    } catch {
      // Ignore
    }
  };

  const handleNativeWebShare = async () => {
    if (!activeImageUrl) return;
    try {
      const blob = await dataUrlToBlob(activeImageUrl);
      const file = new File([blob], 'smart-wardrobe-outfit.png', {
        type: 'image/png',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Smart Wardrobe 3D Outfit',
          text: caption,
          files: [file],
        });
        showTempBanner('Đã mở bảng chia sẻ hệ thống kèm ảnh 2D!');
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: 'Smart Wardrobe 3D Outfit',
          text: caption,
          url: window.location.origin,
        });
        return;
      }
      await handleCopyImageToClipboard();
    } catch {
      // User cancelled share sheet or unsupported
    }
  };

  const sharePageUrl = encodeURIComponent(window.location.origin);
  const encodedCaption = encodeURIComponent(caption);

  const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${sharePageUrl}&quote=${encodedCaption}`;
  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodedCaption}&url=${sharePageUrl}`;
  const pinterestShareHref = `https://pinterest.com/pin/create/button/?url=${sharePageUrl}&description=${encodedCaption}`;
  const threadsShareHref = `https://www.threads.net/intent/post?text=${encodedCaption}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 sm:p-5 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-rose-50 via-white to-indigo-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white shadow-sm">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Xuất Ảnh 2D &amp; Chia Sẻ Mạng Xã Hội
              </h2>
              <p className="text-xs text-slate-500">
                Chụp nhanh 2D chất lượng cao từ Ma-nơ-canh 3D hiện tại để chia sẻ lên các nền tảng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusBanner && (
          <div className="bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white flex items-center justify-between">
            <span>✓ {statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            {/* Left Column: 2D Snapshot Preview & Frame Switcher */}
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setFrameMode('lookbook')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      frameMode === 'lookbook'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                    <span>Khung Lookbook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrameMode('clean')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      frameMode === 'clean'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Ảnh Studio Gốc</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onRetakeSnapshot}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-600 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Chụp lại góc này</span>
                </button>
              </div>

              {/* Snapshot Image Container */}
              <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/80 p-3">
                {activeImageUrl ? (
                  <img
                    src={activeImageUrl}
                    alt="2D Mannequin Outfit Snapshot"
                    className="max-h-[420px] w-auto rounded-xl object-contain shadow-md"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Camera className="h-8 w-8 animate-pulse" />
                    <span className="text-xs font-medium">
                      Đang kết xuất ảnh 2D chất lượng cao...
                    </span>
                  </div>
                )}
              </div>

              {/* Primary Export Actions: Download PNG & Copy Image */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>Tải ảnh PNG (HD)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                >
                  {copiedImage ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Đã chép ảnh 2D!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" />
                      <span>Sao chép ảnh 2D</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Caption Editor & Social Platform Buttons */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Outfit Summary Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Thông tin bộ phối 3D
                    </span>
                    {typeof metadata.harmonyScore === 'number' && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        Độ hợp màu: {metadata.harmonyScore}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {metadata.outfitTitle}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>Dáng: {metadata.bodyShapeName}</span>
                    <span>•</span>
                    <span>
                      {metadata.heightCm}cm / {metadata.weightKg}kg
                    </span>
                    {metadata.occasionLabel && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-rose-600">
                          {metadata.occasionEmoji} {metadata.occasionLabel}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Editable Social Caption */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Nội dung bài đăng &amp; Hashtag
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      {copiedCaption ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Chép Caption</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Social Media Platform Share Grid */}
                <div>
                  <div className="mb-2 text-xs font-bold text-slate-700">
                    Chia sẻ nhanh lên các nền tảng phổ biến:
                  </div>

                  {/* Native Share Button (sends actual 2D PNG file on supported mobile/desktop browsers) */}
                  <button
                    type="button"
                    onClick={handleNativeWebShare}
                    className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:opacity-95 cursor-pointer"
                  >
                    <Share2 className="h-4 w-4 shrink-0" />
                    <span>
                      Chia sẻ trực tiếp kèm file ảnh 2D (Instagram, Zalo, Messenger...)
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={facebookShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleCopyImageToClipboard();
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-[#1877F2]/25 bg-[#1877F2]/10 px-3 py-2.5 text-xs font-bold text-[#1877F2] transition hover:bg-[#1877F2] hover:text-white"
                    >
                      <span>Facebook</span>
                    </a>

                    <a
                      href={twitterShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleCopyImageToClipboard();
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-900/20 bg-slate-900/5 px-3 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                    >
                      <span>X (Twitter)</span>
                    </a>

                    <a
                      href={threadsShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleCopyImageToClipboard();
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-900 hover:text-white"
                    >
                      <span>Threads</span>
                    </a>

                    <a
                      href={pinterestShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleCopyImageToClipboard();
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-[#E60023]/25 bg-[#E60023]/10 px-3 py-2.5 text-xs font-bold text-[#E60023] transition hover:bg-[#E60023] hover:text-white"
                    >
                      <span>Pinterest</span>
                    </a>
                  </div>

                  <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                    💡 Khi bấm vào nền tảng bất kỳ, ảnh 2D của bạn sẽ tự động được sao chép vào Clipboard — bạn chỉ cần nhấn{' '}
                    <strong className="text-slate-700">Ctrl+V (Dán)</strong> vào ô đăng bài để đính kèm hình ảnh trực tiếp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export default SocialShareModal;
