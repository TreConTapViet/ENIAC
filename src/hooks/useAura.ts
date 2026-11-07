/**
 * Trạng thái trợ lý Aura dạng bong bóng chat:
 *  - visible / side / yRatio lưu trên máy (sw_aura_prefs): ẩn hẳn, mép trái/phải, độ cao (0–1).
 *  - open: khung chat đang mở; unread: Aura có tin chưa xem (chấm đỏ trên bong bóng và thanh bên).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type AuraSide = 'left' | 'right';

export interface AuraPrefs {
  visible: boolean;
  side: AuraSide;
  yRatio: number;
}

const KEY = 'sw_aura_prefs';
const DEFAULT_PREFS: AuraPrefs = { visible: true, side: 'right', yRatio: 0.88 };

function readPrefs(): AuraPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;
    return {
      visible: raw.visible !== false,
      side: raw.side === 'left' ? 'left' : 'right',
      yRatio: typeof raw.yRatio === 'number' ? Math.min(1, Math.max(0, raw.yRatio)) : DEFAULT_PREFS.yRatio,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useAura() {
  const [prefs, setPrefs] = useState<AuraPrefs>(readPrefs);
  const [open, setOpen] = useState(false);
  // Lời chào đầu tiên tính là một tin chưa xem
  const [unread, setUnread] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(false);
  }, [open]);

  const setPosition = useCallback((side: AuraSide, yRatio: number) => {
    setPrefs((p) => ({ ...p, side, yRatio: Math.min(1, Math.max(0, yRatio)) }));
  }, []);

  /** Ẩn hẳn bong bóng (bật lại từ thanh bên hoặc Hồ sơ) */
  const hide = useCallback(() => {
    setOpen(false);
    setPrefs((p) => ({ ...p, visible: false }));
  }, []);

  /** Hiện bong bóng và mở khung chat */
  const show = useCallback((openPanel = true) => {
    setPrefs((p) => ({ ...p, visible: true }));
    if (openPanel) setOpen(true);
  }, []);

  /** Aura vừa trả lời: hiện chấm tin mới nếu lúc đó khung chat đang đóng (đọc qua ref, không phải
   *  giá trị lúc bắt đầu gửi) */
  const notify = useCallback(() => {
    if (!openRef.current) setUnread(true);
  }, []);

  return { ...prefs, open, setOpen, unread, notify, setPosition, hide, show };
}

export type AuraController = ReturnType<typeof useAura>;
