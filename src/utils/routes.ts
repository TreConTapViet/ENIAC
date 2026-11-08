// Đường dẫn của từng màn hình và từng mục trong không gian chính.
// App chưa dùng thư viện router: hook useAppRoute đồng bộ state với thanh địa chỉ qua History API.
// File này thuần (không đụng window) để test được bằng Node.

export type SectionId = 'discover' | 'mannequin' | 'wardrobe' | 'history';

/** Các màn hình đứng trước không gian chính, theo thứ tự trong App.tsx. */
export type ScreenId = 'loading' | 'auth' | 'onboarding' | 'migration' | 'main';

export const SECTION_PATHS: Record<SectionId, string> = {
  discover: '/discover',
  mannequin: '/studio',
  wardrobe: '/wardrobe',
  history: '/history',
};

/** Đường dẫn cũ (tiếng Việt) vẫn mở đúng mục, rồi được thay bằng đường dẫn chuẩn ở trên. */
export const LEGACY_SECTION_PATHS: Record<string, SectionId> = {
  '/goi-y': 'discover',
  '/ma-no-canh': 'mannequin',
  '/tu-do': 'wardrobe',
  '/lich-su': 'history',
};

/** Đường dẫn của màn hình không phải mục. Màn tải giữ nguyên địa chỉ để không mất link sâu. */
export const SCREEN_PATHS: Partial<Record<ScreenId, string>> = {
  auth: '/login',
  onboarding: '/welcome',
  migration: '/profile-update',
};

export const SECTION_TITLES: Record<SectionId, string> = {
  discover: 'Gợi ý phối đồ',
  mannequin: 'Ma-nơ-canh 3D',
  wardrobe: 'Tủ đồ của tôi',
  history: 'Lịch sử phối đồ',
};

export const SCREEN_TITLES: Partial<Record<ScreenId, string>> = {
  auth: 'Đăng nhập',
  onboarding: 'Bắt đầu',
  migration: 'Cập nhật hồ sơ',
};

export const APP_NAME = 'Smart Wardrobe';

export const DEFAULT_SECTION: SectionId = 'discover';

/** Bỏ dấu "/" thừa ở cuối và chữ hoa: "/Studio/" → "/studio". */
function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '').toLowerCase();
  return trimmed === '' ? '/' : trimmed;
}

/** Mục ứng với đường dẫn (kể cả đường dẫn cũ); trang chủ "/" là mục Gợi ý; đường dẫn lạ trả về null. */
export function sectionFromPath(pathname: string): SectionId | null {
  const path = normalizePath(pathname);
  if (path === '/') return DEFAULT_SECTION;
  const found = (Object.keys(SECTION_PATHS) as SectionId[]).find((id) => SECTION_PATHS[id] === path);
  return found ?? LEGACY_SECTION_PATHS[path] ?? null;
}

/** true khi địa chỉ hiện tại đúng là đường dẫn chuẩn của mục đó (trang chủ "/" không tính). */
export function isSectionPath(pathname: string, section: SectionId): boolean {
  return normalizePath(pathname) === SECTION_PATHS[section];
}

/** Đường dẫn cần hiện cho một màn hình; null nghĩa là giữ nguyên địa chỉ hiện tại. */
export function pathForScreen(screen: ScreenId, section: SectionId): string | null {
  if (screen === 'loading') return null;
  if (screen === 'main') return SECTION_PATHS[section];
  return SCREEN_PATHS[screen] ?? null;
}

/** Tiêu đề tab trình duyệt cho màn hình hiện tại. */
export function titleForScreen(screen: ScreenId, section: SectionId): string {
  const label = screen === 'main' ? SECTION_TITLES[section] : SCREEN_TITLES[screen];
  return label ? `${label} · ${APP_NAME}` : APP_NAME;
}
