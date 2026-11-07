import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { AccentColorKey, ThemeMode, UserProfile } from '../types';
import {
  applyThemeToDocument,
  normalizeHexColor,
  prefsFromProfile,
  readThemePrefs,
  writeThemePrefs,
  type StorageLike,
  type ThemePrefs,
} from '../theme/themePrefs';

const memoryStorage = new Map<string, string>();

// localStorage có thể bị chặn (chế độ riêng tư, iframe); khi đó giữ tạm trong bộ nhớ
const safeStorage: StorageLike = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
};

export function useThemePrefs() {
  const [initial] = useState(() => readThemePrefs(safeStorage));
  const [prefs, setPrefs] = useState<ThemePrefs>({
    mode: initial.mode,
    accent: initial.accent,
    customHex: initial.customHex,
  });
  // Máy này đã từng lưu lựa chọn chưa: nếu chưa, lần nạp hồ sơ đầu tiên sẽ lấy theo hồ sơ
  const hasDevicePrefs = useRef(initial.hadStored);

  // Áp trước khi trình duyệt vẽ để hai cách tô màu (lớp dark: và điều kiện trong JSX) luôn khớp
  useLayoutEffect(() => {
    applyThemeToDocument(document.documentElement, prefs);
    writeThemePrefs(safeStorage, prefs);
  }, [prefs]);

  const setMode = useCallback((mode: ThemeMode) => {
    hasDevicePrefs.current = true;
    setPrefs((p) => ({ ...p, mode }));
  }, []);

  const setAccent = useCallback((accent: AccentColorKey, customHex?: string) => {
    hasDevicePrefs.current = true;
    setPrefs((p) => ({
      ...p,
      accent,
      customHex: customHex ? normalizeHexColor(customHex, p.customHex) : p.customHex,
    }));
  }, []);

  const adoptFromProfile = useCallback(
    (profile: Pick<UserProfile, 'themeMode' | 'accentColor' | 'customAccentHex'>) => {
      if (hasDevicePrefs.current) return;
      hasDevicePrefs.current = true;
      setPrefs((p) => prefsFromProfile(profile, p));
    },
    []
  );

  return { ...prefs, setMode, setAccent, adoptFromProfile };
}
