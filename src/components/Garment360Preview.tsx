import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { ExtractedGarmentItem } from '../types/studio';
import { FABRIC_LIBRARY } from '../data/presets';

interface Garment360PreviewProps {
  items: ExtractedGarmentItem[];
  activeItemId?: string;
  onSelectItem?: (item: ExtractedGarmentItem) => void;
  onApplyItemToMannequin: (item: ExtractedGarmentItem) => void;
  onTriggerMannequin360Video?: () => void;
  onClose?: () => void;
  mode?: 'floating_right' | 'inline';
}

const ANGLE_PRESETS = [
  { label: 'Mặt Trước (0°)', deg: 0 },
  { label: 'Nghiêng Phải (90°)', deg: 90 },
  { label: 'Mặt Sau (180°)', deg: 180 },
  { label: 'Nghiêng Trái (270°)', deg: 270 },
];

export const Garment360Preview: React.FC<Garment360PreviewProps> = ({
  items,
  activeItemId,
  onSelectItem,
  onApplyItemToMannequin,
  onTriggerMannequin360Video,
  onClose,
  mode = 'floating_right',
}) => {
  const selectedItem =
    items.find((it) => it.id === activeItemId) || items[0] || null;

  const [angleDeg, setAngleDeg] = useState<number>(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(true);
  const [spinSpeed, setSpinSpeed] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isRecordingClip, setIsRecordingClip] = useState<boolean>(false);
  const [recordedClipUrl, setRecordedClipUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const imageLoadedForUrlRef = useRef<string>('');
  const dragStartXRef = useRef<number>(0);
  const dragStartAngleRef = useRef<number>(0);
  const angleRef = useRef<number>(0);

  useEffect(() => {
    angleRef.current = angleDeg;
  }, [angleDeg]);

  // Load processed cutout image for the selected garment
  useEffect(() => {
    if (!selectedItem) return;
    const url =
      selectedItem.uploadedTextureUrl || selectedItem.previewThumbUrl || '';
    if (!url) {
      loadedImageRef.current = null;
      imageLoadedForUrlRef.current = '';
      return;
    }
    if (imageLoadedForUrlRef.current === url && loadedImageRef.current) {
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      imageLoadedForUrlRef.current = url;
    };
    img.src = url;
  }, [selectedItem]);

  // Reset recorded clip when switching item
  useEffect(() => {
    if (recordedClipUrl) {
      URL.revokeObjectURL(recordedClipUrl);
      setRecordedClipUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  // Main 60FPS 360-degree turntable render loop
  useEffect(() => {
    if (!selectedItem) return;
    let animId = 0;
    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isAutoSpinning && !isDragging) {
        const nextAngle = (angleRef.current + dt * 52 * spinSpeed) % 360;
        angleRef.current = nextAngle;
        setAngleDeg(Math.round(nextAngle));
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawGarment360Turntable(
            ctx,
            canvas.width,
            canvas.height,
            selectedItem,
            loadedImageRef.current,
            angleRef.current,
            now * 0.001
          );
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [selectedItem, isAutoSpinning, isDragging, spinSpeed]);

  if (!selectedItem) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = angleRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const nextAngle = (dragStartAngleRef.current + deltaX * 1.15 + 3600) % 360;
    angleRef.current = nextAngle;
    setAngleDeg(Math.round(nextAngle));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleRecord360Clip = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecordingClip) return;
    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return;
    }

    try {
      setIsRecordingClip(true);
      setIsAutoSpinning(true);
      setSpinSpeed(2);
      angleRef.current = 0;
      setAngleDeg(0);

      const stream = canvas.captureStream(30);
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const chosenMime =
        mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: chosenMime || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        setRecordedClipUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setSpinSpeed(1);
        setIsRecordingClip(false);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 3500);
    } catch {
      setIsRecordingClip(false);
      setSpinSpeed(1);
    }
  };

  const currentPhaseLabel =
    angleDeg < 45 || angleDeg >= 315
      ? 'Mặt Trước (Front 0°)'
      : angleDeg < 135
      ? 'Góc Nghiêng Phải (Right 90°)'
      : angleDeg < 225
      ? 'Mặt Sau & Đường May (Back 180°)'
      : 'Góc Nghiêng Trái (Left 270°)';

  const catBadgeLabel =
    selectedItem.category === 'dress'
      ? 'ĐẦM LIỀN 360°'
      : selectedItem.category === 'outerwear'
      ? 'ÁO KHOÁC 360°'
      : selectedItem.category === 'bottom'
      ? 'QUẦN / VÁY 360°'
      : selectedItem.category === 'footwear'
      ? 'GIÀY 360°'
      : 'ÁO 360°';

  const fabricMeta = FABRIC_LIBRARY[selectedItem.fabric];

  const containerClass =
    mode === 'floating_right'
      ? 'w-[min(360px,92vw)] bg-white/95 backdrop-blur-md border border-indigo-200/90 rounded-2xl shadow-xl overflow-hidden flex flex-col'
      : 'w-full bg-white border border-indigo-200 rounded-xl shadow-xs overflow-hidden flex flex-col';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 shrink-0">
            <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wide uppercase truncate">
                360° Garment View
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                AUTO 360°
              </span>
            </div>
            <p className="text-[10px] text-slate-300 truncate">
              {selectedItem.vietnameseName} · {fabricMeta?.name || selectedItem.fabric}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsAutoSpinning((prev) => !prev)}
            title={isAutoSpinning ? 'Tạm dừng xoay 360°' : 'Tiếp tục xoay 360°'}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            {isAutoSpinning ? (
              <Pause className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-300" />
            )}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Đóng khung xem 360°"
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Multi-item selector tabs if multiple garments were extracted */}
      {items.length > 1 && (
        <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
          <span className="text-[10px] font-semibold text-slate-500 shrink-0 mr-1">
            Đồ đã tách ({items.length}):
          </span>
          {items.map((it) => {
            const active = it.id === selectedItem.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelectItem?.(it)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/60 shrink-0"
                  style={{ backgroundColor: it.colorHex }}
                />
                <span className="truncate max-w-23.75">
                  {it.vietnameseName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive 360° Turntable Canvas */}
      <div className="relative bg-[#FAF9F6] border-b border-slate-200 flex flex-col items-center justify-center select-none">
        <canvas
          ref={canvasRef}
          width={340}
          height={230}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-52.5 object-contain cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Top-Left Category + Fabric Badge */}
        <div className="pointer-events-none absolute top-2 left-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-slate-900/85 text-white text-[9px] font-mono font-bold">
            {catBadgeLabel}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/90 border border-slate-200 text-slate-700 text-[9px] font-mono font-semibold flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full border border-slate-300"
              style={{ backgroundColor: selectedItem.colorHex }}
            />
            {selectedItem.colorHex}
          </span>
        </div>

        {/* Top-Right Angle Counter & Speed Toggle */}
        <div className="absolute top-2 right-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setSpinSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))
            }
            className="px-1.5 py-0.5 rounded bg-white/90 hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 text-[9px] font-mono font-bold transition-colors cursor-pointer"
          >
            {spinSpeed}x
          </button>
          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-mono font-bold">
            {angleDeg}°
          </span>
        </div>

        {/* Bottom Phase Indicator */}
        <div className="pointer-events-none absolute bottom-2 inset-x-3 flex items-center justify-between text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-slate-800 font-semibold shadow-2xs">
            {currentPhaseLabel}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-900/75 text-white text-[9px]">
            Kéo ngang để xoay 360°
          </span>
        </div>
      </div>

      {/* Angle Slider & Quick Angle Buttons */}
      <div className="p-2.5 bg-white space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-600 shrink-0">
            Góc xoay:
          </span>
          <input
            type="range"
            min={0}
            max={359}
            value={angleDeg}
            onChange={(e) => {
              const val = Number(e.target.value);
              setIsAutoSpinning(false);
              angleRef.current = val;
              setAngleDeg(val);
            }}
            className="flex-1 accent-indigo-600 cursor-pointer h-1.5"
          />
          <button
            type="button"
            onClick={() => setIsAutoSpinning((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
              isAutoSpinning
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isAutoSpinning ? 'Đang xoay' : 'Tự xoay'}
          </button>
        </div>

        {/* 4 Cardinal Angle Snap Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {ANGLE_PRESETS.map((preset) => {
            const isNear =
              Math.abs(((angleDeg - preset.deg + 540) % 360) - 180) < 22;
            return (
              <button
                key={preset.deg}
                type="button"
                onClick={() => {
                  setIsAutoSpinning(false);
                  angleRef.current = preset.deg;
                  setAngleDeg(preset.deg);
                }}
                className={`px-1.5 py-1 rounded text-[9px] font-semibold transition-colors cursor-pointer truncate ${
                  isNear
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Wear on Mannequin + Export/Record 360 */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onApplyItemToMannequin(selectedItem)}
            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>Mặc lên Mannequin 3D</span>
          </button>

          <button
            type="button"
            disabled={isRecordingClip}
            onClick={handleRecord360Clip}
            title="Tạo video ngắn xoay 360° riêng cho món đồ vừa tải lên"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-200 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
          >
            {isRecordingClip ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Video className="w-3 h-3" />
            )}
            <span>{isRecordingClip ? 'Đang tạo 360°...' : 'Xuất Clip 360°'}</span>
          </button>

          {onTriggerMannequin360Video && (
            <button
              type="button"
              onClick={() => {
                onApplyItemToMannequin(selectedItem);
                onTriggerMannequin360Video();
              }}
              title="Mặc món đồ này và quay Video 360° toàn thân trên Mannequin"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-200 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span>360° Trên Mẫu</span>
            </button>
          )}
        </div>

        {recordedClipUrl && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px]">
            <span className="font-semibold text-emerald-900 truncate">
              Đã tạo xong video xoay 360° cho món đồ!
            </span>
            <a
              href={recordedClipUrl}
              download={`garment-360-${selectedItem.id}.webm`}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
            >
              <Download className="w-3 h-3" />
              <span>Tải về</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Renders a 3D-shaded rotating 360-degree turntable preview of an uploaded garment
 * using multi-slice cylindrical projection, side thickness extrusions, back-side
 * seam/collar construction, and studio floor shadow.
 */
function drawGarment360Turntable(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  item: ExtractedGarmentItem,
  img: HTMLImageElement | null,
  angleDeg: number,
  timeSec: number
) {
  ctx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.48;
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // 1. Studio Turntable Pedestal & Degree Ring
  const floorY = height * 0.85;
  ctx.save();
  // Outer degree ring
  ctx.beginPath();
  ctx.ellipse(cx, floorY, 108, 20, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Rotating tick marks on turntable
  for (let i = 0; i < 24; i++) {
    const tickAngle = rad + (i * Math.PI * 2) / 24;
    const tx1 = cx + Math.cos(tickAngle) * 98;
    const ty1 = floorY + Math.sin(tickAngle) * 17.5;
    const tx2 = cx + Math.cos(tickAngle) * 106;
    const ty2 = floorY + Math.sin(tickAngle) * 19.5;
    ctx.beginPath();
    ctx.moveTo(tx1, ty1);
    ctx.lineTo(tx2, ty2);
    ctx.strokeStyle =
      i % 6 === 0 ? 'rgba(79, 70, 229, 0.75)' : 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = i % 6 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // Soft contact shadow under garment
  const shadowRx = 52 + Math.abs(cosA) * 28;
  const shadowGrad = ctx.createRadialGradient(
    cx,
    floorY,
    4,
    cx,
    floorY,
    shadowRx
  );
  shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
  shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, floorY, shadowRx, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gentle vertical float + drape breathing
  const floatOffsetY = Math.sin(timeSec * 2.2) * 2.5;
  const garmentCenterY = cy + floatOffsetY - 6;

  // 2. Determine 3D silhouette thickness & projection parameters
  const isBackFacing = cosA < 0;
  const absCos = Math.abs(cosA);
  // Keep minimum profile width so at 90° and 270° we see a realistic 3D side profile of the garment
  const projectedScaleX = Math.max(0.24, absCos);
  const sideDepthOffset = sinA * 18; // 3D depth thickness between front and back layers

  const maxGarmentW = 148;
  const maxGarmentH = 152;

  if (img && img.width > 0 && img.height > 0) {
    const aspect = img.width / img.height;
    let drawW = maxGarmentW;
    let drawH = drawW / aspect;
    if (drawH > maxGarmentH) {
      drawH = maxGarmentH;
      drawW = drawH * aspect;
    }

    // Draw 3D Volume Extrusion Layers (creates realistic cloth thickness at 45°-135° & 225°-315°)
    const thicknessSlices = 9;
    for (let s = thicknessSlices; s >= 0; s--) {
      const t = s / thicknessSlices; // 1 = furthest layer, 0 = closest active face
      const sliceOffsetX = (t - 0.5) * sideDepthOffset;

      ctx.save();
      ctx.translate(cx + sliceOffsetX, garmentCenterY);
      ctx.scale(
        (isBackFacing ? -1 : 1) * projectedScaleX,
        1 - (1 - absCos) * 0.03
      );

      if (s > 0) {
        // Interior / opposite side cloth volume layer
        ctx.globalAlpha = 0.22;
        ctx.filter = 'brightness(0.72) contrast(1.08)';
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Primary visible face (Front or Back)
        // Cylindrical strip rendering for curved 3D torso wrap
        const strips = 18;
        const srcStripW = img.width / strips;
        const dstStripW = drawW / strips;

        for (let i = 0; i < strips; i++) {
          const u = (i + 0.5) / strips; // 0..1 across width
          const theta = (u - 0.5) * Math.PI * 0.68; // cylindrical curve
          const curveY = Math.cos(theta) * 4 * (1 - absCos * 0.4);
          const stripScaleY = 0.97 + Math.cos(theta) * 0.03;

          ctx.save();
          // Slight brightness modulation on back or side angles
          const lightFactor = isBackFacing
            ? 0.88 + absCos * 0.08
            : 0.92 + absCos * 0.1;
          ctx.filter = `brightness(${lightFactor.toFixed(2)})`;

          ctx.drawImage(
            img,
            i * srcStripW,
            0,
            srcStripW,
            img.height,
            -drawW / 2 + i * dstStripW,
            (-drawH / 2) * stripScaleY + curveY,
            dstStripW + 0.6,
            drawH * stripScaleY
          );
          ctx.restore();
        }

        // If viewing the back side (90°..270°), render realistic back-view tailoring details
        // (center-back seam line, back collar curvature, yoke shadow)
        if (isBackFacing) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          // Subtle back-side shading overlay so Back (180°) looks distinct from Front (0°)
          const backGrad = ctx.createLinearGradient(
            -drawW / 2,
            0,
            drawW / 2,
            0
          );
          backGrad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
          backGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.06)');
          backGrad.addColorStop(1, 'rgba(15, 23, 42, 0.22)');
          ctx.fillStyle = backGrad;
          ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);

          // Center back seam line
          ctx.beginPath();
          ctx.moveTo(0, -drawH * 0.36);
          ctx.lineTo(0, drawH * 0.44);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.restore();
        }

        // Dynamic specular sheen across fabric when rotating
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const sheenCenter = sinA * (drawW * 0.45);
        const sheenGrad = ctx.createLinearGradient(
          sheenCenter - 45,
          -drawH / 2,
          sheenCenter + 45,
          drawH / 2
        );
        const sheenAlpha =
          item.fabric === 'silk' || item.fabric === 'leather' ? 0.22 : 0.1;
        sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
        sheenGrad.addColorStop(0.5, `rgba(255,255,255,${sheenAlpha})`);
        sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }

      ctx.restore();
    }
  } else {
    // Fallback procedural 3D garment silhouette if image is still loading
    ctx.save();
    ctx.translate(cx, garmentCenterY);
    ctx.scale(projectedScaleX, 1);
    ctx.fillStyle = item.colorHex || '#3B82F6';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-55, -65, 110, 130, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
