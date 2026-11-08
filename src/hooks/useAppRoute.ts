import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import {
  DEFAULT_SECTION,
  pathForScreen,
  sectionFromPath,
  titleForScreen,
  type ScreenId,
  type SectionId,
} from '../utils/routes';

/**
 * Đồng bộ mục đang mở và màn hình hiện tại với thanh địa chỉ:
 * - Đổi mục → pushState sang /discover, /studio, /wardrobe, /history (nút Back của trình duyệt dùng được).
 * - Màn đăng nhập / onboarding / cập nhật hồ sơ → replaceState sang /login, /welcome, /profile-update.
 * - Mở thẳng link sâu khi chưa đăng nhập (vd. /studio): mục được nhớ từ lúc tải trang,
 *   màn đăng nhập hiện /login, đăng nhập xong thì vào đúng /studio.
 * - Link tiếng Việt cũ (/ma-no-canh, /goi-y…) vẫn mở đúng mục rồi được thay bằng đường dẫn mới.
 * Server (server.ts) và Vercel (.vercel/output/config.json, sinh bởi scripts/build-vercel.mjs) trả index.html cho mọi đường dẫn này.
 */
export function useAppRoute(screen: ScreenId) {
  const [section, setSectionState] = useState<SectionId>(
    () => sectionFromPath(window.location.pathname) ?? DEFAULT_SECTION,
  );
  const sectionRef = useRef(section);
  sectionRef.current = section;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // Cùng kiểu với setState để các mục con (Setter<ActiveSection>) dùng như cũ
  const setSection = useCallback((next: SetStateAction<SectionId>) => {
    const resolved = typeof next === 'function' ? next(sectionRef.current) : next;
    sectionRef.current = resolved;
    setSectionState(resolved);
    if (screenRef.current !== 'main') return;
    const path = pathForScreen('main', resolved);
    if (path && window.location.pathname !== path) {
      window.history.pushState(null, '', path + window.location.search + window.location.hash);
    }
  }, []);

  // Nút Back/Forward: đọc lại mục từ địa chỉ
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = sectionFromPath(window.location.pathname);
      if (fromUrl) {
        sectionRef.current = fromUrl;
        setSectionState(fromUrl);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Đổi màn hình (đăng nhập, onboarding…) thì thay địa chỉ, không thêm mục lịch sử
  useEffect(() => {
    const path = pathForScreen(screen, section);
    if (path && window.location.pathname !== path) {
      window.history.replaceState(null, '', path + window.location.search + window.location.hash);
    }
    document.title = titleForScreen(screen, section);
  }, [screen, section]);

  return [section, setSection] as const;
}
