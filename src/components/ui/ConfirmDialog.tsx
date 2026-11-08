import React, { useRef } from 'react';
import { useDialogFocus } from './useDialogFocus';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger: nút xác nhận màu đỏ (thao tác làm mất dữ liệu) */
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Huỷ',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(panelRef, open, onCancel, cancelRef);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-panel border border-line bg-surface text-fg shadow-pop p-5"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <div id="confirm-dialog-desc" className="mt-2 text-sm leading-relaxed text-fg-muted">
          {description}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-10 rounded-control border border-line px-4 text-sm font-medium hover:bg-surface-2 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`h-10 rounded-control px-4 text-sm font-semibold disabled:opacity-60 cursor-pointer ${
              tone === 'danger'
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-accent text-accent-fg hover:bg-accent-hover'
            }`}
          >
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
