/**
 * Số đo tùy chọn của hồ sơ: dài chân trong và dài lưng. Dùng chung cho client, server và test.
 *
 * - Dài chân trong (`inseamCm`): từ đáy quần (háng) thẳng xuống mắt cá chân, đo phía trong chân.
 * - Dài lưng (`backLengthCm`): từ đốt sống cổ nổi ở gáy xuống ngang eo, theo cách đo của thợ may.
 *
 * Không bắt buộc. Trên Firestore là trường tuỳ chọn, khoảng hợp lệ khớp optionalNumberIn trong
 * firestore.rules (có test scripts/measurements.test.ts đối chiếu). Trong hồ sơ trên máy, `null`
 * nghĩa là người dùng đã xoá số đo, còn không có trường nghĩa là chưa nhập bao giờ.
 */

export type OptionalMeasureKey = 'inseamCm' | 'backLengthCm';

export interface OptionalMeasureSpec {
  key: OptionalMeasureKey;
  label: string;
  min: number;
  max: number;
  /** Hướng dẫn đo ngắn, hiện dưới ô nhập */
  howTo: string;
}

export const OPTIONAL_MEASURES: readonly OptionalMeasureSpec[] = [
  {
    key: 'inseamCm',
    label: 'Dài chân trong',
    min: 35,
    max: 120,
    howTo: 'Từ đáy quần (háng) thẳng xuống mắt cá chân, đo phía trong chân.',
  },
  {
    key: 'backLengthCm',
    label: 'Dài lưng',
    min: 30,
    max: 60,
    howTo: 'Từ đốt xương cổ nổi ở gáy xuống ngang eo.',
  },
];

export const OPTIONAL_MEASURE_KEYS: readonly OptionalMeasureKey[] = OPTIONAL_MEASURES.map((m) => m.key);

export type OptionalMeasures = Partial<Record<OptionalMeasureKey, number | null>>;

const specOf = (key: OptionalMeasureKey) => OPTIONAL_MEASURES.find((m) => m.key === key)!;

/** Giá trị đã lưu có hợp lệ không (số trong khoảng của luật) */
export function isValidOptionalMeasure(key: OptionalMeasureKey, value: unknown): value is number {
  const { min, max } = specOf(key);
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export type ParsedMeasure = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Đọc ô nhập: trống → null (không nhập / xoá số đo); số trong khoảng → làm tròn 0,5 cm;
 * còn lại → lỗi tiếng Việt để hiện dưới ô. Không tự ép số vào khoảng.
 */
export function parseOptionalMeasure(key: OptionalMeasureKey, raw: string): ParsedMeasure {
  const spec = specOf(key);
  const text = raw.trim().replace(',', '.');
  if (!text) return { ok: true, value: null };
  const n = Number(text);
  if (!Number.isFinite(n)) return { ok: false, error: `${spec.label} phải là số (cm).` };
  if (n < spec.min || n > spec.max) {
    return { ok: false, error: `${spec.label} cần từ ${spec.min} đến ${spec.max} cm.` };
  }
  return { ok: true, value: Math.round(n * 2) / 2 };
}

/** Chuỗi hiện trong ô nhập từ giá trị đã lưu */
export function formatOptionalMeasure(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/** Lấy các số đo tuỳ chọn hợp lệ của một hồ sơ (bỏ null / sai khoảng) */
export function pickOptionalMeasures(profile: OptionalMeasures | null | undefined): Partial<Record<OptionalMeasureKey, number>> {
  const out: Partial<Record<OptionalMeasureKey, number>> = {};
  for (const key of OPTIONAL_MEASURE_KEYS) {
    const v = profile?.[key];
    if (isValidOptionalMeasure(key, v)) out[key] = v;
  }
  return out;
}

/** Tài liệu ghi có chứa trường số đo tuỳ chọn không */
export function hasOptionalMeasureKeys(data: Record<string, unknown>): boolean {
  return OPTIONAL_MEASURE_KEYS.some((key) => key in data);
}

/** Bỏ các trường số đo tuỳ chọn khỏi tài liệu ghi (dùng khi Firestore còn chạy luật cũ) */
export function stripOptionalMeasures<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const key of OPTIONAL_MEASURE_KEYS) delete out[key];
  return out;
}

/** "Dài chân trong 76 cm · Dài lưng 40 cm" cho lời nhắc Aura; chuỗi rỗng nếu chưa nhập */
export function describeOptionalMeasures(profile: OptionalMeasures | null | undefined): string {
  const values = pickOptionalMeasures(profile);
  return OPTIONAL_MEASURES.filter((m) => values[m.key] !== undefined)
    .map((m) => `${m.label} ${values[m.key]} cm`)
    .join(' · ');
}
