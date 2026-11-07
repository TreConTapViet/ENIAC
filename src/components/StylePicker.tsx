import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { GenderOption } from '../../shared/gender';
import { normalizeVi } from '../../shared/text';
import {
  MAX_CUSTOM_STYLE_LENGTH,
  MAX_FAVORITE_STYLES,
  MIN_FAVORITE_STYLES,
  isCustomStyle,
  makeCustomStyle,
  resolveStyleId,
  styleLabel,
  stylesForGender,
} from '../../shared/styles';

interface StylePickerProps {
  gender: GenderOption;
  /** id phong cách đang chọn (id có sẵn hoặc custom:…) */
  value: string[];
  onChange: (next: string[]) => void;
  /** compact: thẻ nhỏ không mô tả (khung Hồ sơ) */
  compact?: boolean;
}

/**
 * Chọn 1–8 phong cách: thẻ phong cách có sẵn theo giới tính + thẻ phong cách tự nhập (xoá được).
 * Gõ trùng tên một phong cách có sẵn thì chọn luôn phong cách đó thay vì tạo thẻ mới.
 */
export function StylePicker({ gender, value, onChange, compact = false }: StylePickerProps) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const presets = stylesForGender(gender);
  // Chỉ dùng thẻ có ảnh khi giới tính này có ảnh minh hoạ; không có ảnh nào thì dùng thẻ chữ gọn
  const withImages = presets.some((p) => p.byGender[gender]?.image);
  const customs = value.filter(isCustomStyle);
  const atMax = value.length >= MAX_FAVORITE_STYLES;
  const overMax = value.length > MAX_FAVORITE_STYLES;

  const toggle = (id: string) => {
    setHint(null);
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (!atMax) onChange([...value, id]);
  };

  const addCustom = () => {
    const text = draft.trim();
    if (!text) return;
    if (atMax) {
      setHint(`Đã đủ ${MAX_FAVORITE_STYLES} phong cách. Bỏ chọn bớt để thêm mới.`);
      return;
    }
    const presetId = resolveStyleId(text, gender);
    const preset = presetId ? presets.find((p) => p.id === presetId) : undefined;
    const next = preset ? preset.id : makeCustomStyle(text);
    if (!next) return;
    const exists = value.some((v) => normalizeVi(v) === normalizeVi(next));
    if (!exists) onChange([...value, next]);
    setHint(preset ? `Đã chọn phong cách có sẵn “${preset.label}”.` : null);
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-fg-muted">
          Chọn {MIN_FAVORITE_STYLES}–{MAX_FAVORITE_STYLES} phong cách
        </span>
        <span
          aria-live="polite"
          className={`font-semibold tabular-nums ${overMax ? 'text-rose-600 dark:text-rose-300' : 'text-fg'}`}
        >
          Đã chọn {value.length}/{MAX_FAVORITE_STYLES}
        </span>
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {presets.map((p) => {
          const selected = value.includes(p.id);
          const disabled = !selected && atMax;
          const info = p.byGender[gender];
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(p.id)}
              className={`group relative flex text-left rounded-card border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
                compact ? 'items-center gap-2.5 p-2' : 'flex-col overflow-hidden'
              } ${
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:border-fg-subtle'
              }`}
            >
              {!withImages ? null : info?.image ? (
                <img
                  src={info.image}
                  alt=""
                  loading="lazy"
                  className={
                    compact
                      ? 'h-10 w-10 shrink-0 rounded-control object-contain bg-photo-well'
                      : 'aspect-[4/3] w-full object-contain p-1.5 bg-photo-well'
                  }
                />
              ) : (
                <span
                  aria-hidden
                  className={`grid place-items-center bg-surface-2 font-semibold text-fg-muted ${
                    compact ? 'h-10 w-10 shrink-0 rounded-control text-xs' : 'aspect-[4/3] w-full text-lg'
                  }`}
                >
                  {p.shortTag}
                </span>
              )}
              <span className={compact ? 'min-w-0 flex-1' : `block p-3 ${withImages ? '' : 'pr-9'}`}>
                <span className={`block font-semibold leading-snug ${compact ? 'text-xs line-clamp-2' : 'text-sm'}`}>
                  {p.label}
                </span>
                {!compact && info?.subtitle && (
                  <span className="mt-1 block text-xs leading-relaxed text-fg-muted line-clamp-2">{info.subtitle}</span>
                )}
              </span>
              {selected && (
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-fg ${
                    compact ? 'shrink-0' : 'absolute right-2 top-2'
                  }`}
                >
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label htmlFor="custom-style-input" className="block text-xs font-medium text-fg-muted">
          Thêm phong cách riêng
        </label>
        <div className="flex gap-2">
          <input
            id="custom-style-input"
            type="text"
            value={draft}
            maxLength={MAX_CUSTOM_STYLE_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Ví dụ: Áo dài cách tân"
            className="h-10 min-w-0 flex-1 rounded-control border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!draft.trim()}
            className="h-10 shrink-0 rounded-control border border-line px-3 text-sm font-semibold text-fg hover:bg-surface-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Thêm
          </button>
        </div>
        {hint && <p className="text-xs text-fg-muted">{hint}</p>}
        {customs.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Phong cách tự nhập">
            {customs.map((c) => (
              <li
                key={c}
                className="flex h-8 items-center gap-1 rounded-full border border-accent bg-accent-soft pl-3 pr-1 text-xs font-semibold text-accent-text"
              >
                {styleLabel(c)}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== c))}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent/15 cursor-pointer"
                  aria-label={`Bỏ phong cách ${styleLabel(c)}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {overMax && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">
            Bạn đang chọn {value.length} phong cách. Bỏ bớt còn tối đa {MAX_FAVORITE_STYLES} để tiếp tục.
          </p>
        )}
      </div>
    </div>
  );
}

export const isValidStyleSelection = (value: string[]) =>
  value.length >= MIN_FAVORITE_STYLES && value.length <= MAX_FAVORITE_STYLES;
