/**
 * Chế độ sáng/tối và màu nhấn: một nguồn duy nhất.
 *
 * - localStorage là nguồn chính trên mỗi máy (đọc được cả ở màn đăng nhập, khi chưa có hồ sơ).
 * - Hồ sơ (users/{uid}.themeMode/accentColor/customAccentHex) là bản đồng bộ, chỉ được dùng
 *   khi máy này chưa từng lưu lựa chọn nào.
 * - Mọi màu nhấn (6 màu có sẵn hoặc mã hex tự chọn) đều quy về một mã hex, từ đó tính ra
 *   các biến CSS --sw-accent* mà Tailwind dùng qua @theme trong index.css.
 * - Bảng biến đã tính được lưu vào localStorage để script trong index.html áp ngay trước khi
 *   React chạy, nên trang không nháy màu khi tải.
 */
import type { AccentColorKey, ThemeMode } from '../types';

export const THEME_STORAGE_KEY = 'sw_theme_mode';
export const ACCENT_STORAGE_KEY = 'sw_accent';
export const ACCENT_HEX_STORAGE_KEY = 'sw_accent_hex';
export const ACCENT_VARS_STORAGE_KEY = 'sw_accent_vars';

export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
export const DEFAULT_ACCENT: AccentColorKey = 'amber';
export const DEFAULT_CUSTOM_ACCENT_HEX = '#c59b27';

export const PRESET_ACCENT_HEX: Record<Exclude<AccentColorKey, 'custom'>, string> = {
  amber: '#b45309',
  rose: '#be123c',
  emerald: '#047857',
  indigo: '#4338ca',
  violet: '#7c3aed',
  slate: '#0284c7',
};

/** Gợi ý nhanh cho ô chọn màu tự do (lấy từ bản của nhóm, commit 0c35c38) */
export const CUSTOM_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Vàng Champagne', hex: '#c59b27' },
  { label: 'Đỏ Rượu Vang', hex: '#9f1239' },
  { label: 'Hồng Cánh Sen', hex: '#db2777' },
  { label: 'Tím Lavender', hex: '#8b5cf6' },
  { label: 'Xanh Cổ Vịt', hex: '#0d9488' },
  { label: 'Xanh Rêu Matcha', hex: '#4d7c0f' },
  { label: 'Xanh Dương Hoàng Gia', hex: '#2563eb' },
  { label: 'Nâu Espresso', hex: '#78350f' },
];

const ACCENT_KEYS: AccentColorKey[] = ['amber', 'rose', 'emerald', 'indigo', 'violet', 'slate', 'custom'];

export function isAccentKey(value: unknown): value is AccentColorKey {
  return typeof value === 'string' && (ACCENT_KEYS as string[]).includes(value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/** '#ABC123', 'abc123' → '#abc123'; giá trị khác → fallback */
export function normalizeHexColor(input: string | undefined | null, fallback: string): string {
  const trimmed = (input ?? '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

export function resolveAccentHex(accent: AccentColorKey, customHex?: string): string {
  if (accent === 'custom') return normalizeHexColor(customHex, DEFAULT_CUSTOM_ACCENT_HEX);
  return PRESET_ACCENT_HEX[accent];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Trộn màu với trắng (amount > 0) hoặc đen (amount < 0) */
function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Biến CSS cho một màu nhấn. Chữ màu nhấn có hai bản (nền sáng / nền tối) để luôn đủ tương phản;
 * index.css chọn bản phù hợp theo lớp .dark.
 */
export function accentCssVars(hex: string): Record<string, string> {
  const [r, g, b] = hexToRgb(hex);
  return {
    '--sw-accent': hex,
    '--sw-accent-hover': shade(hex, -0.15),
    '--sw-accent-fg': relativeLuminance(hex) > 0.45 ? '#1c1917' : '#ffffff',
    '--sw-accent-text-light': shade(hex, -0.1),
    '--sw-accent-text-dark': shade(hex, 0.35),
    '--sw-accent-soft': `rgba(${r}, ${g}, ${b}, 0.12)`,
  };
}

export interface ThemePrefs {
  mode: ThemeMode;
  accent: AccentColorKey;
  customHex: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readThemePrefs(storage: StorageLike): ThemePrefs & { hadStored: boolean } {
  const rawMode = storage.getItem(THEME_STORAGE_KEY);
  const rawAccent = storage.getItem(ACCENT_STORAGE_KEY);
  return {
    mode: isThemeMode(rawMode) ? rawMode : DEFAULT_THEME_MODE,
    accent: isAccentKey(rawAccent) ? rawAccent : DEFAULT_ACCENT,
    customHex: normalizeHexColor(storage.getItem(ACCENT_HEX_STORAGE_KEY), DEFAULT_CUSTOM_ACCENT_HEX),
    hadStored: isThemeMode(rawMode),
  };
}

export function writeThemePrefs(storage: StorageLike, prefs: ThemePrefs): void {
  storage.setItem(THEME_STORAGE_KEY, prefs.mode);
  storage.setItem(ACCENT_STORAGE_KEY, prefs.accent);
  storage.setItem(ACCENT_HEX_STORAGE_KEY, prefs.customHex);
  storage.setItem(
    ACCENT_VARS_STORAGE_KEY,
    JSON.stringify(accentCssVars(resolveAccentHex(prefs.accent, prefs.customHex)))
  );
}

/** Lựa chọn trong hồ sơ → ThemePrefs (dùng khi máy chưa lưu gì) */
export function prefsFromProfile(
  profile: { themeMode?: unknown; accentColor?: unknown; customAccentHex?: string },
  fallback: ThemePrefs
): ThemePrefs {
  return {
    mode: isThemeMode(profile.themeMode) ? profile.themeMode : fallback.mode,
    accent: isAccentKey(profile.accentColor) ? profile.accentColor : fallback.accent,
    customHex: normalizeHexColor(profile.customAccentHex, fallback.customHex),
  };
}

export function applyThemeToDocument(root: HTMLElement, prefs: ThemePrefs): void {
  root.classList.toggle('dark', prefs.mode === 'dark');
  root.style.colorScheme = prefs.mode;
  // Thanh địa chỉ trên điện thoại cùng màu nền app (khớp script trong index.html)
  root.ownerDocument
    ?.querySelector?.('meta[name="theme-color"]')
    ?.setAttribute('content', prefs.mode === 'dark' ? '#0e0d0c' : '#fafaf9');
  for (const [name, value] of Object.entries(accentCssVars(resolveAccentHex(prefs.accent, prefs.customHex)))) {
    root.style.setProperty(name, value);
  }
}
