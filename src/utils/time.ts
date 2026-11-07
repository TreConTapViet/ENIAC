/**
 * Đổi mốc thời gian về mili-giây. Dữ liệu trên máy lưu chuỗi ISO; dữ liệu Firestore là Timestamp
 * (hoặc { seconds } sau khi qua JSON.stringify vào localStorage).
 */
export function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}
