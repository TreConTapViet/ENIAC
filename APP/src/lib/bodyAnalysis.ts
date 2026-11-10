export type BodyType =
  | 'ectomorph'
  | 'mesomorph'
  | 'endomorph'
  | 'hourglass'
  | 'pear'
  | 'inverted-triangle'
  | 'rectangle';

export interface BodyAnalysis {
  bmi: number;
  bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese';
  bodyType: BodyType;
  bodyTypeLabel: string;
  bodyTypeDescription: string;
  suggestions: string[];
}

export interface RawMeasurements {
  gender: 'male' | 'female';
  height_cm: number;
  weight_kg: number;
  waist_cm?: number | null;
  hip_cm?: number | null;
  bust_cm?: number | null;
}

const BODY_TYPE_LABELS: Record<BodyType, string> = {
  ectomorph: 'Ectomorph (mảnh khảnh)',
  mesomorph: 'Mesomorph (thể thao)',
  endomorph: 'Endomorph (đầy đặn)',
  hourglass: 'Đồng hồ cát',
  pear: 'Hình lê',
  'inverted-triangle': 'Tam giác ngược',
  rectangle: 'Hình chữ nhật',
};

const BODY_TYPE_DESCRIPTIONS: Record<BodyType, string> = {
  ectomorph:
    'Dáng người mảnh khảnh, vai hẹp, khó tăng cân. Nên chọn trang phục tạo cảm giác đầy đặn.',
  mesomorph:
    'Dáng người thể thao, vai rộng, eo thon, cơ thể cân đối. Phần lớn trang phục đều phù hợp.',
  endomorph:
    'Dáng người đầy đặn, dễ tích mỡ. Nên chọn trang phục tôn đường nét và che khuyết điểm nhẹ.',
  hourglass:
    'Vai và hông cân đối, eo rõ. Đây là dáng người lý tưởng, nên tôn đường cong eo.',
  pear: 'Hông rộng hơn vai, eo thon. Nên tập trung chi tiết ở phần trên để cân bằng silhouette.',
  'inverted-triangle':
    'Vai rộng hơn hông. Nên chọn trang phục dưới có khối lượng để cân bằng phần vai.',
  rectangle:
    'Vai, eo và hông gần bằng nhau. Nên tạo đường cong giả bằng cách thắt eo hoặc chi tiết layer.',
};

function femaleBodyType(
  bust?: number | null,
  waist?: number | null,
  hip?: number | null
): BodyType {
  if (!bust || !waist || !hip) return 'rectangle';
  const bhDiff = Math.abs(bust - hip);
  const whRatio = waist / hip;
  const bwRatio = waist / bust;

  if (bhDiff <= 2.5 && whRatio < 0.85) return 'hourglass';
  if (hip - bust >= 3.8) return 'pear';
  if (bust - hip >= 3.8) return 'inverted-triangle';
  if (whRatio >= 0.85 && bwRatio >= 0.85) return 'rectangle';

  if (whRatio < 0.78) return 'hourglass';
  return 'rectangle';
}

function maleBodyType(bmi: number): BodyType {
  if (bmi < 18.5) return 'ectomorph';
  if (bmi >= 18.5 && bmi < 25) return 'mesomorph';
  if (bmi >= 25 && bmi < 30) return 'endomorph';
  return 'endomorph';
}

function bmiCategory(bmi: number): BodyAnalysis['bmiCategory'] {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

function suggestionsFor(type: BodyType): string[] {
  const map: Record<BodyType, string[]> = {
    ectomorph: [
      'Chọn áo có họa tiết ngang hoặc layering để tăng khối lượng.',
      'Quần ống suông vừa vặn, tránh quá ôm hoặc quá rộng.',
      'Màu sáng và chất liệu dày giúp tạo cảm giác đầy đặn.',
    ],
    mesomorph: [
      'Dáng thể thao cân đối — gần như mọi kiểu trang phục đều phù hợp.',
      'Tận dụng áo ôm vừa để khoe đường nét cơ bắp.',
      'Quần jeans ống thẳng hoặc skinny đều hợp.',
    ],
    endomorph: [
      'Chọn áo có độ rủ tốt, tránh chất liệu quá dày bó sát.',
      'Quân ống suông thẳng, tránh ống quá ôm.',
      'Màu tối và họa tiết dọc giúp thon gọn silhouette.',
    ],
    hourglass: [
      'Tôn eo là ưu tiên số 1 — chọn áo crop, đầm peplum hoặc thắt lưng.',
      'Đầm ôm chữ A tôn đường cong tự nhiên.',
      'Tránh trang phục rộng thùng thình che mất eo.',
    ],
    pear: [
      'Tập trung chi tiết vào phần trên: cổ boat neck, tay phồng, họa tiết.',
      'Chọn quần/váy có độ A nhẹ để che hông.',
      'Màu sáng ở trên, màu tối ở dưới giúp cân bằng.',
    ],
    'inverted-triangle': [
      'Chọn quần/chân váy có chi tiết, túi, họa tiết để tăng khối phần dưới.',
      'Áo cổ sâu hoặc V-neck giúp thu hẹp phần vai.',
      'Tránh pads vai hoặc họa tiết nhiều ở phần trên.',
    ],
    rectangle: [
      'Tạo đường cong giả bằng thắt lưng, đầm peplum, áo crop.',
      'Layering và họa tiết ngang giúp tạo cảm giác có eo.',
      'Đậm nhạt phân tầng trên-dưới giúp phá vỡ silhouette thẳng.',
    ],
  };
  return map[type];
}

export function analyzeBody(m: RawMeasurements): BodyAnalysis {
  const h = m.height_cm / 100;
  const bmi = +(m.weight_kg / (h * h)).toFixed(1);

  let bodyType: BodyType;
  if (m.gender === 'female') {
    bodyType = femaleBodyType(m.bust_cm, m.waist_cm, m.hip_cm);
  } else {
    bodyType = maleBodyType(bmi);
  }

  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    bodyType,
    bodyTypeLabel: BODY_TYPE_LABELS[bodyType],
    bodyTypeDescription: BODY_TYPE_DESCRIPTIONS[bodyType],
    suggestions: suggestionsFor(bodyType),
  };
}

// Produces proportional multipliers for the mannequin SVG.
export interface MannequinProportions {
  shoulderWidth: number; // multiplier of base
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  torsoLength: number;
  legLength: number;
  buildScale: number; // overall body scale
}

export function computeProportions(
  gender: 'male' | 'female',
  heightCm: number,
  weightKg: number,
  waist?: number | null,
  hip?: number | null,
  bust?: number | null
): MannequinProportions {
  const heightScale = 0.85 + (heightCm - 150) / 200; // ~0.85-1.05
  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  // overall build from BMI
  let buildScale = 1;
  if (bmi < 18.5) buildScale = 0.92;
  else if (bmi >= 25 && bmi < 30) buildScale = 1.08;
  else if (bmi >= 30) buildScale = 1.16;

  let shoulderWidth = 1;
  let chestWidth = 1;
  let waistWidth = 1;
  let hipWidth = 1;

  if (gender === 'female' && waist && hip && bust) {
    const shoulder = bust * 1.05;
    shoulderWidth = shoulder / 90;
    chestWidth = bust / 90;
    waistWidth = waist / 70;
    hipWidth = hip / 95;
    // gentle clamp
    shoulderWidth = clamp(shoulderWidth, 0.7, 1.3);
    chestWidth = clamp(chestWidth, 0.7, 1.3);
    waistWidth = clamp(waistWidth, 0.6, 1.3);
    hipWidth = clamp(hipWidth, 0.7, 1.3);
  } else {
    // male default: shoulders wider, narrower hips
    shoulderWidth = buildScale * 1.15;
    chestWidth = buildScale * 1.0;
    waistWidth = buildScale * 0.9;
    hipWidth = buildScale * 0.95;
  }

  const torsoLength = heightScale * 1.0;
  const legLength = heightScale * (heightCm > 170 ? 1.05 : 0.98);

  return {
    shoulderWidth: shoulderWidth * buildScale,
    chestWidth: chestWidth * buildScale,
    waistWidth: waistWidth * buildScale,
    hipWidth: hipWidth * buildScale,
    torsoLength,
    legLength,
    buildScale,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
