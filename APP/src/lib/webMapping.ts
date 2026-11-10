/**
 * Chuyển đổi dữ liệu giữa app (/app, gốc Huhu) và web Smart Wardrobe.
 *
 * Hai bên dùng chung Firestore (project smart-wardrobe-79480) nên app phải ghi đúng lược đồ của web
 * và chỉ những trường firestore.rules cho phép (hasOnly). Bảng chuyển đổi: architecture/du-lieu.md mục 7.
 *
 * File này không import Firebase hay API trình duyệt để test được bằng Node (scripts/webMapping.test.ts).
 */
import { normalizeGender, type GenderOption } from '../../../shared/gender';
import { styleLabel } from '../../../shared/styles';

export type AppGender = 'male' | 'female';
export type AppCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'other';
export type AppOccasion = 'work' | 'casual' | 'party' | 'sports' | 'lounging' | 'beach';

/** Phần hồ sơ của app được đồng bộ (các trường khác chỉ nằm trên máy) */
export interface AppProfileSyncFields {
  name: string;
  gender: AppGender;
  height_cm: number;
  weight_kg: number;
  bust_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  avatar_url?: string;
}

// ---------- Giới tính ----------

export const toWebGender = (gender: AppGender): GenderOption => (gender === 'male' ? 'Nam' : 'Nữ');

export function toAppGender(value: unknown): AppGender | null {
  const g = normalizeGender(value);
  if (g === 'Nam') return 'male';
  if (g === 'Nữ') return 'female';
  return null;
}

// ---------- Kiểm tra giống firestore.rules ----------

/** Khoảng hợp lệ của số đo, khớp optionalNumberIn trong firestore.rules */
export const MEASURE_RANGES = {
  heightCm: [100, 250],
  weightKg: [25, 250],
  bustCm: [40, 200],
  waistCm: [35, 200],
  hipCm: [40, 200],
} as const;

const MAX_IMAGE_REF_CHARS = 350000;

/** Khớp isValidImageRef trong firestore.rules */
export function isValidImageRef(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= MAX_IMAGE_REF_CHARS &&
    /^(https:\/\/|\/assets\/|data:image\/(jpeg|png|webp);base64,)/.test(value)
  );
}

function measure(value: number | null | undefined, range: readonly [number, number]): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < range[0] || n > range[1]) return undefined;
  return Math.round(n * 10) / 10;
}

// ---------- Hồ sơ ----------

/**
 * Hồ sơ app → các trường cập nhật cho users/{uid}.
 * Chỉ trả về trường hợp lệ; trường nào sai khoảng thì bỏ (giữ giá trị cũ trên mây) chứ không ép số.
 * Không có uid/email/createdAt: luật update cấm đổi các trường đó.
 */
export function toWebProfileChanges(p: AppProfileSyncFields): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const name = (p.name || '').trim().slice(0, 80);
  if (name) out.displayName = name;
  out.gender = toWebGender(p.gender);

  const pairs: [keyof typeof MEASURE_RANGES, number | null | undefined][] = [
    ['heightCm', p.height_cm],
    ['weightKg', p.weight_kg],
    ['bustCm', p.bust_cm],
    ['waistCm', p.waist_cm],
    ['hipCm', p.hip_cm],
  ];
  for (const [key, value] of pairs) {
    const n = measure(value, MEASURE_RANGES[key]);
    if (n !== undefined) out[key] = n;
  }

  if (isValidImageRef(p.avatar_url)) out.avatarUrl = p.avatar_url;
  return out;
}

export interface WebProfileDoc {
  displayName?: unknown;
  email?: unknown;
  gender?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
  bustCm?: unknown;
  waistCm?: unknown;
  hipCm?: unknown;
  avatarUrl?: unknown;
  favoriteStyles?: unknown;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * users/{uid} → phần hồ sơ đồng bộ của app. `fallback` là hồ sơ trên máy, dùng khi web chưa có số đo.
 * Trả null nếu hồ sơ web chưa có giới tính hợp lệ (web sẽ hỏi lại ở ProfileMigrationGate).
 */
export function fromWebProfile(
  data: WebProfileDoc,
  fallback?: Partial<AppProfileSyncFields> | null
): (AppProfileSyncFields & { email?: string }) | null {
  const gender = toAppGender(data.gender);
  if (!gender) return null;
  const sameGender = fallback?.gender === gender;
  return {
    name: typeof data.displayName === 'string' && data.displayName.trim() ? data.displayName : fallback?.name || 'Người dùng',
    gender,
    height_cm: num(data.heightCm) ?? fallback?.height_cm ?? (gender === 'male' ? 170 : 160),
    weight_kg: num(data.weightKg) ?? fallback?.weight_kg ?? (gender === 'male' ? 62 : 50),
    bust_cm: num(data.bustCm) ?? (sameGender ? fallback?.bust_cm ?? null : null),
    waist_cm: num(data.waistCm) ?? (sameGender ? fallback?.waist_cm ?? null : null),
    hip_cm: num(data.hipCm) ?? (sameGender ? fallback?.hip_cm ?? null : null),
    avatar_url: typeof data.avatarUrl === 'string' ? data.avatarUrl : fallback?.avatar_url,
    email: typeof data.email === 'string' ? data.email : undefined,
  };
}

// ---------- Tủ đồ ----------

export type WebCategory =
  | 'Áo'
  | 'Quần'
  | 'Chân váy'
  | 'Đầm & Váy liền'
  | 'Áo khoác'
  | 'Giày dép'
  | 'Phụ kiện'
  | 'Quần & Chân váy';

const TO_WEB_CATEGORY: Record<AppCategory, WebCategory> = {
  top: 'Áo',
  bottom: 'Quần',
  dress: 'Đầm & Váy liền',
  outerwear: 'Áo khoác',
  other: 'Phụ kiện',
};

const TO_APP_CATEGORY: Record<WebCategory, AppCategory> = {
  'Áo': 'top',
  'Quần': 'bottom',
  'Chân váy': 'bottom',
  'Quần & Chân váy': 'bottom',
  'Đầm & Váy liền': 'dress',
  'Áo khoác': 'outerwear',
  'Giày dép': 'other',
  'Phụ kiện': 'other',
};

export const toWebCategory = (c: AppCategory): WebCategory => TO_WEB_CATEGORY[c] ?? 'Phụ kiện';
export const toAppCategory = (c: unknown): AppCategory =>
  (typeof c === 'string' && TO_APP_CATEGORY[c as WebCategory]) || 'other';

/** Dịp của app → giá trị `occasion` của món đồ trên web (khớp firestore.rules) */
const TO_WEB_OCCASION: Record<AppOccasion, string> = {
  work: 'Đi làm / Đi học',
  casual: 'Dạo phố / Cafe',
  party: 'Tiệc tối / Hẹn hò',
  sports: 'Thể thao / Vận động',
  lounging: 'Dạo phố / Cafe',
  beach: 'Du lịch',
};

export const toWebOccasion = (o: AppOccasion | string | null | undefined): string =>
  TO_WEB_OCCASION[o as AppOccasion] ?? 'Dạo phố / Cafe';

/** Món đồ như app hiển thị */
export interface SyncedWardrobeItem {
  id: string;
  label: string;
  category: AppCategory;
  webCategory: string;
  color: string;
  imageUrl: string;
  favorite: boolean;
  styleTag: string;
}

export function fromWebWardrobeDoc(id: string, data: Record<string, unknown>): SyncedWardrobeItem {
  return {
    id,
    label: typeof data.name === 'string' ? data.name : 'Món đồ',
    category: toAppCategory(data.category),
    webCategory: typeof data.category === 'string' ? data.category : '',
    color: typeof data.color === 'string' ? data.color : '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    favorite: data.favorite === true,
    styleTag: typeof data.styleTag === 'string' ? data.styleTag : '',
  };
}

export interface NewWardrobeInput {
  uid: string;
  label: string;
  category: AppCategory;
  color: string;
  imageUrl: string;
  occasion?: AppOccasion | null;
  /** favoriteStyles của hồ sơ web; phần tử đầu làm styleTag */
  favoriteStyles?: unknown;
}

/** Trường của món đồ mới (chưa có createdAt/updatedAt), khớp isValidWardrobeItem */
export function toWebWardrobeFields(input: NewWardrobeInput) {
  const firstStyle =
    Array.isArray(input.favoriteStyles) && typeof input.favoriteStyles[0] === 'string'
      ? (input.favoriteStyles[0] as string)
      : 'minimalist';
  return {
    userId: input.uid,
    name: input.label.trim().slice(0, 100) || 'Món đồ',
    category: toWebCategory(input.category),
    styleTag: (styleLabel(firstStyle) || 'Tối giản').slice(0, 60),
    color: input.color.trim().slice(0, 50) || 'Chưa rõ',
    season: 'Mọi thời tiết',
    occasion: toWebOccasion(input.occasion),
    imageUrl: input.imageUrl,
    favorite: false,
  };
}

/** Id món đồ giống web (item_…), thêm hậu tố ngẫu nhiên để hai máy tạo cùng lúc không trùng */
export function newWardrobeItemId(now: number = Date.now(), random: () => number = Math.random): string {
  return `item_${now}_${Math.floor(random() * 36 ** 4).toString(36)}`;
}
