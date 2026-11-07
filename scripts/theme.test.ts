import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCENT_VARS_STORAGE_KEY,
  DEFAULT_CUSTOM_ACCENT_HEX,
  accentCssVars,
  normalizeHexColor,
  prefsFromProfile,
  readThemePrefs,
  resolveAccentHex,
  writeThemePrefs,
  type StorageLike,
} from '../src/theme/themePrefs.ts';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

test('máy chưa lưu gì: mặc định tối + hổ phách, hadStored = false', () => {
  const prefs = readThemePrefs(memoryStorage());
  assert.equal(prefs.mode, 'dark');
  assert.equal(prefs.accent, 'amber');
  assert.equal(prefs.hadStored, false);
});

test('giá trị lạ trong localStorage bị bỏ qua', () => {
  const prefs = readThemePrefs(
    memoryStorage({ sw_theme_mode: 'blue', sw_accent: 'neon', sw_accent_hex: 'xyz' })
  );
  assert.equal(prefs.mode, 'dark');
  assert.equal(prefs.accent, 'amber');
  assert.equal(prefs.customHex, DEFAULT_CUSTOM_ACCENT_HEX);
  assert.equal(prefs.hadStored, false);
});

test('ghi rồi đọc lại giữ nguyên lựa chọn và lưu sẵn bảng biến cho index.html', () => {
  const storage = memoryStorage();
  writeThemePrefs(storage, { mode: 'light', accent: 'custom', customHex: '#0d9488' });
  const prefs = readThemePrefs(storage);
  assert.deepEqual(
    { mode: prefs.mode, accent: prefs.accent, customHex: prefs.customHex, hadStored: prefs.hadStored },
    { mode: 'light', accent: 'custom', customHex: '#0d9488', hadStored: true }
  );
  const vars = JSON.parse(storage.data.get(ACCENT_VARS_STORAGE_KEY) ?? '{}');
  assert.equal(vars['--sw-accent'], '#0d9488');
});

test('hồ sơ chỉ được dùng cho giá trị hợp lệ', () => {
  const fallback = { mode: 'dark' as const, accent: 'amber' as const, customHex: '#c59b27' };
  assert.deepEqual(prefsFromProfile({ themeMode: 'light', accentColor: 'rose' }, fallback), {
    mode: 'light',
    accent: 'rose',
    customHex: '#c59b27',
  });
  assert.deepEqual(prefsFromProfile({ themeMode: 'x', accentColor: 'y' }, fallback), fallback);
});

test('mã hex được chuẩn hoá', () => {
  assert.equal(normalizeHexColor('#ABCDEF', '#000000'), '#abcdef');
  assert.equal(normalizeHexColor('abcdef', '#000000'), '#abcdef');
  assert.equal(normalizeHexColor('#abc', '#000000'), '#000000');
  assert.equal(resolveAccentHex('custom', 'nope'), DEFAULT_CUSTOM_ACCENT_HEX);
  assert.equal(resolveAccentHex('rose'), '#be123c');
});

test('chữ trên nền màu nhấn: sáng trên màu tối, tối trên màu sáng', () => {
  assert.equal(accentCssVars('#1e3a8a')['--sw-accent-fg'], '#ffffff');
  assert.equal(accentCssVars('#fde047')['--sw-accent-fg'], '#1c1917');
});
