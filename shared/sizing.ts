/**
 * Tính size gợi ý từ chiều cao, cân nặng và số đo, theo bảng size riêng cho Nam và Nữ.
 * Dùng chung cho client (đầu trang, khung Hồ sơ, studio, Aura) và server.ts (lời khuyên dự phòng),
 * nên mọi nơi hiện cùng một con số.
 *
 * Size áo lấy size lớn hơn giữa size theo vòng ngực và size theo cân nặng (mặc vừa cả hai).
 * Size quần theo vòng eo và vòng hông. Quần jeans nam tính theo inch vòng eo.
 */
import { normalizeGender, type GenderOption } from './gender';

export interface BodyMeasurementsInput {
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipCm?: number;
  gender?: string;
}

export interface SizeRecommendation {
  gender: GenderOption;
  overallSize: string;
  shortSize: string;
  topSize: string;
  bottomSize: string;
  jeansSize: string;
  heightCm: number;
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
  hasCustomMeasurements: boolean;
  fitAdvice: string;
}

/** Số đo mặc định khi hồ sơ chưa nhập (trung bình người trưởng thành Việt Nam) */
export const DEFAULT_MEASUREMENTS: Record<
  GenderOption,
  { heightCm: number; weightKg: number; bustCm: number; waistCm: number; hipCm: number }
> = {
  Nam: { heightCm: 172, weightKg: 65, bustCm: 94, waistCm: 76, hipCm: 94 },
  Nữ: { heightCm: 162, weightKg: 50, bustCm: 84, waistCm: 64, hipCm: 90 },
};

/** Bậc size: giá trị ≤ ngưỡng thứ i thì ở size thứ i; vượt mọi ngưỡng là size cuối */
interface SizeLadder {
  sizes: string[];
  chest: number[];
  weight: number[];
  waist: number[];
  hip: number[];
}

const LADDERS: Record<GenderOption, SizeLadder> = {
  Nữ: {
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    chest: [80, 86, 91, 97],
    weight: [45, 52, 59, 68],
    waist: [61, 66, 71, 77],
    hip: [86, 91, 96, 102],
  },
  Nam: {
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    chest: [88, 94, 100, 106],
    weight: [58, 66, 74, 82],
    waist: [74, 79, 84, 89],
    hip: [92, 96, 100, 104],
  },
};

const FEMALE_JEANS = ['25', '26', '27 - 28', '29 - 30', '31+'];

const rung = (value: number, thresholds: number[]) => {
  const i = thresholds.findIndex((t) => value <= t);
  return i === -1 ? thresholds.length : i;
};

/** Quần jeans nam: cỡ = vòng eo tính theo inch, làm tròn, trong khoảng 28–36 */
function maleJeansSize(waistCm: number): string {
  const inch = Math.round(waistCm / 2.54);
  if (inch < 28) return '28';
  if (inch > 36) return '36+';
  return String(inch);
}

function lengthNote(gender: GenderOption, heightCm: number): string {
  if (gender === 'Nam') {
    if (heightCm >= 178) return 'Chiều cao lợi thế: hợp quần ống suông, áo khoác dáng dài và áo oversize.';
    if (heightCm <= 165)
      return 'Ưu tiên quần ống đứng hoặc ôm vừa, áo dài ngang hông và sơ vin để kéo dài đôi chân.';
    return 'Tỷ lệ cân đối, mặc đẹp cả sơ mi slim-fit lẫn áo phông oversize.';
  }
  if (heightCm >= 166) return 'Chiều cao tôn dáng tốt với cả quần ống suông dài và chân váy maxi.';
  if (heightCm <= 156)
    return 'Ưu tiên thiết kế cạp cao (High-waist) hoặc chân váy ngắn trên gối để tạo hiệu ứng kéo dài đôi chân.';
  return 'Tỷ lệ chiều cao cân đối, dễ dàng diện cả thiết kế croptop, corset lẫn đầm chiết eo.';
}

export function calculateRecommendedSize(profile: BodyMeasurementsInput): SizeRecommendation {
  // Hồ sơ cũ "Khác" được tính như trước đây (bảng nữ) cho tới khi người dùng chọn lại
  const gender = normalizeGender(profile.gender) ?? 'Nữ';
  const defaults = DEFAULT_MEASUREMENTS[gender];
  const hasCustomMeasurements = Boolean(
    profile.heightCm || profile.weightKg || profile.bustCm || profile.waistCm || profile.hipCm
  );

  const heightCm = Number(profile.heightCm) || defaults.heightCm;
  const weightKg = Number(profile.weightKg) || defaults.weightKg;
  const bustCm = Number(profile.bustCm) || defaults.bustCm;
  const waistCm = Number(profile.waistCm) || defaults.waistCm;
  const hipCm = Number(profile.hipCm) || defaults.hipCm;

  const ladder = LADDERS[gender];
  const topIdx = Math.max(rung(bustCm, ladder.chest), rung(weightKg, ladder.weight));
  const bottomIdx = Math.max(rung(waistCm, ladder.waist), rung(hipCm, ladder.hip));
  const topSize = ladder.sizes[topIdx];
  const bottomSize = ladder.sizes[bottomIdx];
  const jeansSize = gender === 'Nam' ? maleJeansSize(waistCm) : FEMALE_JEANS[bottomIdx];

  const bottomLabel = gender === 'Nam' ? 'Quần' : 'Quần·Váy';
  const overallSize = topSize === bottomSize ? topSize : `${topSize} (Áo) / ${bottomSize} (${bottomLabel})`;

  const fitAdvice =
    gender === 'Nam'
      ? `Dựa trên chiều cao ${heightCm}cm, cân nặng ${weightKg}kg, vòng ngực ${bustCm}cm, vòng eo ${waistCm}cm và vòng hông ${hipCm}cm: Áo vừa vặn nhất ở size ${topSize}, Quần chuẩn phom ở size ${bottomSize} (quần jeans cỡ ${jeansSize}). ${lengthNote(gender, heightCm)}`
      : `Dựa trên chiều cao ${heightCm}cm, cân nặng ${weightKg}kg và số đo 3 vòng ${bustCm}-${waistCm}-${hipCm}cm: Áo/Đầm vừa vặn nhất ở size ${topSize}, Quần/Chân váy chuẩn phom ở size ${bottomSize} (tương đương size quần Jeans ${jeansSize}). ${lengthNote(gender, heightCm)}`;

  return {
    gender,
    overallSize,
    shortSize: topSize,
    topSize,
    bottomSize,
    jeansSize,
    heightCm,
    weightKg,
    bustCm,
    waistCm,
    hipCm,
    hasCustomMeasurements,
    fitAdvice,
  };
}
