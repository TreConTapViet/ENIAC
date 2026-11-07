import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { AuraSide } from '../../hooks/useAura';

const SIZE = 56;
const MARGIN = 16;
const TOP_MIN = 80;
/** Di chuyển dưới ngưỡng này tính là chạm (mở/đóng khung chat), không phải kéo */
const DRAG_THRESHOLD = 6;
const TARGET_SIZE = 56;
const TARGET_BOTTOM = 32;
const TARGET_HIT_RADIUS = 64;

interface AuraBubbleProps {
  side: AuraSide;
  yRatio: number;
  unread: boolean;
  /** Chừa khoảng dưới đáy (dock studio, thanh điều hướng điện thoại) */
  bottomInset: number;
  onTap: () => void;
  onMove: (side: AuraSide, yRatio: number) => void;
  onHide: () => void;
}

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vp;
}

/**
 * Bong bóng Aura kiểu Messenger: chạm để mở khung chat; kéo để đổi chỗ (thả ra thì dính về mép trái
 * hoặc phải gần nhất); kéo vào ô X ở giữa đáy màn hình để ẩn hẳn. Vị trí lưu theo mép + tỉ lệ chiều cao
 * nên vẫn đúng khi đổi kích thước cửa sổ.
 */
export function AuraBubble({ side, yRatio, unread, bottomInset, onTap, onMove, onHide }: AuraBubbleProps) {
  const vp = useViewport();
  const minY = TOP_MIN;
  const maxY = Math.max(minY, vp.h - SIZE - bottomInset - MARGIN);
  const rest = {
    x: side === 'left' ? MARGIN : vp.w - SIZE - MARGIN,
    y: minY + yRatio * (maxY - minY),
  };

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [overTarget, setOverTarget] = useState(false);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const justDragged = useRef(false);
  // Bản mới nhất cho pointerup: sự kiện pointerup có thể chạy trước khi React vẽ lại sau pointermove cuối
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const overRef = useRef(false);

  const target = { x: vp.w / 2, y: vp.h - TARGET_BOTTOM - TARGET_SIZE / 2 };
  const pos = drag ?? rest;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: rest.x, y: rest.y };
    dragging.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!dragging.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragging.current = true;
    const x = Math.min(Math.max(s.x + dx, 0), vp.w - SIZE);
    const y = Math.min(Math.max(s.y + dy, 0), vp.h - SIZE);
    const over = Math.hypot(x + SIZE / 2 - target.x, y + SIZE / 2 - target.y) < TARGET_HIT_RADIUS;
    dragRef.current = { x, y };
    overRef.current = over;
    setDrag({ x, y });
    setOverTarget(over);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const cancelled = e.type === 'pointercancel';
    const wasDragging = dragging.current;
    const drag = dragRef.current;
    start.current = null;
    dragging.current = false;
    dragRef.current = null;
    if (!wasDragging || !drag) return;
    // Sau pointerup trình duyệt còn bắn click (cần bỏ qua); sau pointercancel thì không
    justDragged.current = !cancelled;
    if (overRef.current && !cancelled) {
      onHide();
    } else {
      const nextSide: AuraSide = drag.x + SIZE / 2 < vp.w / 2 ? 'left' : 'right';
      onMove(nextSide, maxY > minY ? (Math.min(Math.max(drag.y, minY), maxY) - minY) / (maxY - minY) : 0);
    }
    overRef.current = false;
    setDrag(null);
    setOverTarget(false);
  };

  return (
    <>
      {drag && (
        <div
          aria-hidden
          className={`fixed z-[60] grid place-items-center rounded-full border-2 transition-[transform,background-color] duration-150 motion-reduce:transition-none ${
            overTarget ? 'scale-110 border-rose-500 bg-rose-500 text-white' : 'border-white/70 bg-black/55 text-white'
          }`}
          style={{
            width: TARGET_SIZE,
            height: TARGET_SIZE,
            left: target.x - TARGET_SIZE / 2,
            bottom: TARGET_BOTTOM,
          }}
        >
          <X className="h-6 w-6" />
        </div>
      )}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          // Thả tay sau khi kéo cũng sinh sự kiện click: bỏ qua lần đó
          if (justDragged.current) {
            justDragged.current = false;
            return;
          }
          onTap();
        }}
        aria-label={unread ? 'Mở trợ lý Aura (có tin mới)' : 'Mở trợ lý Aura'}
        title="Aura · kéo để di chuyển, kéo vào X để ẩn"
        className={`fixed left-0 top-0 z-[61] grid touch-none select-none place-items-center rounded-full bg-accent text-accent-fg shadow-pop ring-1 ring-black/5 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 ${
          drag ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none'
        }`}
        style={{ width: SIZE, height: SIZE, transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${drag ? 1.06 : 1})` }}
      >
        <Sparkles className="h-6 w-6" aria-hidden />
        {unread && (
          <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-rose-500 ring-2 ring-canvas" aria-hidden />
        )}
      </button>
    </>
  );
}
