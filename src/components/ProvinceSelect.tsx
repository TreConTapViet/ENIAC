import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CloudSun, MapPin, Search, X } from 'lucide-react';
import { REGIONS, getProvince, searchProvinces } from '../../shared/provinces';
import type { WeatherContextData } from '../types';

interface ProvinceSelectProps {
  provinceId: string;
  weather: WeatherContextData;
  loading?: boolean;
  onSelect: (provinceId: string) => void;
}

const SOURCE_NOTE: Record<NonNullable<WeatherContextData['source']>, string> = {
  live: '',
  stale: 'Số liệu cũ (chưa cập nhật được)',
  climate: 'Số liệu khí hậu trung bình (đang chờ số liệu thật)',
};

/**
 * Chọn tỉnh/thành cho thời tiết: 34 tỉnh sau sáp nhập, tìm không cần dấu, gõ tên tỉnh cũ vẫn ra
 * (vd. "vung tau" → TP. Hồ Chí Minh). Màn hình nhỏ mở thành khung trượt từ dưới lên.
 * Phím: ↑/↓ chọn, Enter xác nhận, Esc đóng.
 */
export function ProvinceSelect({ provinceId, weather, loading = false, onSelect }: ProvinceSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Khung chọn render qua portal: thanh trên cùng có backdrop-blur nên position: fixed bên trong
  // sẽ bị tính theo thanh đó. Màn rộng: đặt ngay dưới nút; màn hẹp: khung trượt từ đáy (CSS).
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const current = getProvince(provinceId);

  const results = useMemo(() => searchProvinces(query), [query]);
  // Không tìm thì nhóm theo vùng; đang tìm thì xếp theo độ khớp
  const groups = useMemo(() => {
    if (query.trim()) return [{ region: 'Kết quả', items: results }];
    return REGIONS.map((region) => ({ region, items: results.filter((r) => r.province.region === region) }));
  }, [query, results]);
  const flat = groups.flatMap((g) => g.items);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, flat.findIndex((r) => r.province.id === provinceId)));
    inputRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      choose(flat[active].province.id);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const note = weather.source ? SOURCE_NOTE[weather.source] : '';
  let index = -1;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Thời tiết ${current?.name ?? weather.city}: ${weather.temp}°C, ${weather.condition}. Đổi tỉnh/thành`}
        className="flex h-10 min-w-0 items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm text-fg hover:bg-surface-2 cursor-pointer"
      >
        <CloudSun className={`h-4 w-4 shrink-0 text-accent-text ${loading ? 'animate-pulse' : ''}`} aria-hidden />
        <span className="font-semibold tabular-nums">{weather.temp}°</span>
        <span className="max-w-[6.5rem] sm:max-w-[9rem] truncate">{current?.name ?? weather.city}</span>
        <span className="hidden lg:inline text-fg-muted">· {weather.condition}</span>
      </button>

      {open &&
        createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            style={anchor ? ({ '--top': `${anchor.top}px`, '--right': `${anchor.right}px` } as React.CSSProperties) : undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-panel border border-line bg-surface text-fg shadow-pop pb-[env(safe-area-inset-bottom)] sm:pb-0 sm:inset-x-auto sm:bottom-auto sm:left-auto sm:right-[var(--right)] sm:top-[var(--top)] sm:max-h-[28rem] sm:w-80 sm:rounded-card"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:hidden">
              <span className="text-base font-semibold">Chọn tỉnh/thành</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-control text-fg-muted hover:bg-surface-2"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3">
              <label className="flex h-10 items-center gap-2 rounded-control border border-line bg-surface-2 px-3 focus-within:ring-2 focus-within:ring-accent">
                <Search className="h-4 w-4 text-fg-subtle" aria-hidden />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined}
                  aria-label="Tìm tỉnh/thành, gõ không dấu hoặc tên tỉnh cũ"
                  placeholder="Tìm tỉnh/thành (vd. vung tau)"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
                />
              </label>
            </div>
            <div id={listId} role="listbox" aria-label="Tỉnh/thành" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {flat.length === 0 && <p className="px-3 py-6 text-center text-sm text-fg-muted">Không tìm thấy tỉnh/thành.</p>}
              {groups.map((g) =>
                g.items.length === 0 ? null : (
                  <div key={g.region} role="group" aria-label={g.region}>
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{g.region}</p>
                    {g.items.map(({ province, matchedFormer, matchedCenter }) => {
                      index += 1;
                      const i = index;
                      const selected = province.id === provinceId;
                      return (
                        <div
                          key={province.id}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={selected}
                          onPointerEnter={() => setActive(i)}
                          onClick={() => choose(province.id)}
                          className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-sm ${
                            i === active ? 'bg-surface-2' : ''
                          }`}
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{province.name}</span>
                            {matchedFormer && (
                              <span className="block truncate text-xs text-fg-muted">gồm {matchedFormer} (đã sáp nhập)</span>
                            )}
                            {matchedCenter && (
                              <span className="block truncate text-xs text-fg-muted">trung tâm: {matchedCenter}</span>
                            )}
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-accent-text" aria-hidden />}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-xs text-fg-muted">
              {note && <p className="mb-0.5 text-amber-700 dark:text-amber-300">{note}</p>}
              <p>
                Cảm giác như {weather.feelsLike ?? weather.temp}° · Độ ẩm {weather.humidity}% · Nguồn{' '}
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
                  Open-Meteo.com
                </a>{' '}
                (CC BY 4.0)
              </p>
            </div>
          </div>
        </>,
          document.body
        )}
    </div>
  );
}
