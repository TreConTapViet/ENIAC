/**
 * Lời mời tải app PWA ở /app (architecture/kien-truc.md mục 4.12).
 * Trang web ở "/" không có manifest nên trình duyệt không phát beforeinstallprompt tại đây; web chỉ mời,
 * việc cài đặt thật diễn ra ở /app.
 */

/** Đường dẫn app; ?install=1 làm app mở sẵn hướng dẫn cài */
export const APP_URL = '/app/';
export const APP_INSTALL_URL = '/app/?install=1';

/** Khoá localStorage lưu thời điểm người dùng đóng thông báo mời tải app */
export const APP_INVITE_DISMISSED_KEY = 'sw_app_invite_dismissed_at';
/** Đóng thông báo thì 14 ngày sau mới hiện lại */
export const APP_INVITE_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Có nên hiện thông báo mời tải app không */
export function shouldShowAppInvite(now: number, dismissedAt: number | null, isStandalone: boolean): boolean {
  if (isStandalone) return false;
  if (dismissedAt === null || !Number.isFinite(dismissedAt)) return true;
  return now - dismissedAt >= APP_INVITE_SNOOZE_MS;
}

export function readAppInviteDismissedAt(storage: Pick<Storage, 'getItem'> | undefined): number | null {
  try {
    const raw = storage?.getItem(APP_INVITE_DISMISSED_KEY);
    if (!raw) return null;
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

export function writeAppInviteDismissedAt(storage: Pick<Storage, 'setItem'> | undefined, now: number): void {
  try {
    storage?.setItem(APP_INVITE_DISMISSED_KEY, String(now));
  } catch {
    // localStorage bị chặn: thông báo sẽ hiện lại ở lần sau, không sao
  }
}
