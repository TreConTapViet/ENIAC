/**
 * Nhận diện điện thoại / máy yếu để giảm tải đồ hoạ và hiệu ứng.
 * Không phụ thuộc React hay Firebase, nên test được bằng Node (truyền `env` giả).
 */

export interface DeviceEnv {
  /** Màn hình cảm ứng là con trỏ chính (điện thoại, máy tính bảng) */
  coarsePointer: boolean;
  /** Cạnh ngắn của màn hình, px CSS */
  shortSide: number;
  devicePixelRatio: number;
  /** navigator.deviceMemory (GB), chỉ Chrome Android có */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  /** prefers-reduced-motion: reduce, hoặc Tiết kiệm dữ liệu (Save-Data) */
  reduceMotion: boolean;
}

/** Điện thoại xoay ngang (khớp biến thể `phone-land:` trong index.css) */
export const PHONE_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 500px) and (pointer: coarse)';
/** Dùng bố cục điện thoại (thanh tab dưới đáy thay thanh bên): màn hẹp, hoặc điện thoại xoay ngang */
export const MOBILE_LAYOUT_QUERY = `(max-width: 767px), ${PHONE_LANDSCAPE_QUERY}`;

export function readDeviceEnv(): DeviceEnv {
  if (typeof window === 'undefined') {
    return { coarsePointer: false, shortSide: 1024, devicePixelRatio: 1, reduceMotion: false };
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const mq = (q: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(q).matches : false);
  return {
    coarsePointer: mq('(pointer: coarse)'),
    shortSide: Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight),
    devicePixelRatio: window.devicePixelRatio || 1,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    reduceMotion: mq('(prefers-reduced-motion: reduce)') || nav.connection?.saveData === true,
  };
}

/** Điện thoại: cảm ứng và cạnh ngắn < 768px (máy tính bảng lớn vẫn coi như máy tính) */
export function isPhone(env: DeviceEnv = readDeviceEnv()): boolean {
  return env.coarsePointer && env.shortSide < 768;
}

/** Máy cần giảm tải: điện thoại, hoặc RAM ≤ 4GB, hoặc ≤ 4 nhân CPU */
export function isLowPowerDevice(env: DeviceEnv = readDeviceEnv()): boolean {
  if (isPhone(env)) return true;
  if (env.deviceMemory !== undefined && env.deviceMemory <= 4) return true;
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency > 0 && env.hardwareConcurrency <= 4) return true;
  return false;
}

/**
 * Tỉ lệ điểm ảnh cho WebGL. Màn điện thoại có DPR 3 nhưng vẽ ở 3x tốn gấp 9 lần điểm ảnh so với 1x;
 * 1.5x vẫn nét trên màn nhỏ mà nhẹ hơn nhiều.
 */
export function renderPixelRatio(env: DeviceEnv = readDeviceEnv(), desktopMax = 2): number {
  const max = isLowPowerDevice(env) ? 1.5 : desktopMax;
  return Math.max(1, Math.min(env.devicePixelRatio, max));
}

/**
 * Hệ số lùi camera để màn hình dọc vẫn thấy trọn vật thể (nhỏ hơn, không méo như khi mở rộng góc nhìn).
 * Màn ngang (aspect ≥ 1) giữ nguyên khoảng cách; màn dọc lùi theo 1/aspect, cộng thêm một chút lề.
 */
export function portraitDistanceScale(aspect: number, margin = 1.25, max = 2.6): number {
  if (!(aspect > 0) || aspect >= 1) return 1;
  return Math.min(max, Math.max(1, margin / aspect));
}
