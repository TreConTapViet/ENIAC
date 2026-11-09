import type { BodyType } from './bodyAnalysis';
import type { Occasion } from './occasions';

export interface FitResult {
  score: number; // 0-100
  notes: string[];
  verdict: 'excellent' | 'good' | 'fair' | 'poor';
}

// category fit per occasion (0-10 bonus)
const OCCASION_CATEGORY: Record<Occasion, Record<string, number>> = {
  work: { top: 7, bottom: 6, dress: 8, outerwear: 7, other: 3 },
  casual: { top: 7, bottom: 7, dress: 6, outerwear: 6, other: 4 },
  party: { top: 5, bottom: 4, dress: 10, outerwear: 4, other: 3 },
  sports: { top: 8, bottom: 8, dress: 1, outerwear: 5, other: 5 },
  lounging: { top: 6, bottom: 7, dress: 5, outerwear: 3, other: 6 },
  beach: { top: 6, bottom: 6, dress: 7, outerwear: 3, other: 6 },
};

// color fit per occasion (bonus)
const OCCASION_COLOR: Record<Occasion, Record<string, number>> = {
  work: { black: 5, navy: 5, gray: 4, white: 3, beige: 3, brown: 3, red: -1, pink: -1, yellow: -3, orange: -2 },
  casual: { black: 2, navy: 2, white: 3, gray: 2, red: 3, blue: 3, green: 2, beige: 2, pink: 2, yellow: 2, orange: 2 },
  party: { black: 4, red: 5, white: 3, navy: 3, pink: 4, yellow: 2, orange: 2, gray: 0, beige: 0, brown: 0, green: 1, blue: 2 },
  sports: { black: 2, gray: 3, blue: 3, green: 3, red: 2, white: 2, navy: 2, beige: 0, brown: 0, pink: 1, yellow: 2, orange: 2 },
  lounging: { gray: 4, beige: 4, white: 3, brown: 3, pink: 2, blue: 2, green: 2, black: 1, navy: 1, red: 0, yellow: 1, orange: 1 },
  beach: { white: 5, beige: 5, yellow: 4, orange: 3, blue: 4, green: 3, red: 3, pink: 3, navy: 2, gray: 1, brown: 1, black: -1 },
};

const OCCASION_NOTE: Record<Occasion, string> = {
  work: 'Trang phục công sở nên gọn gàng, màu trung tính.',
  casual: 'Phong cách thoải mái, có thể điểm xuyết màu nổi.',
  party: 'Ưu tiên đầm và màu sắc thu hút.',
  sports: 'Cần chất liệu thoáng, form vận động.',
  lounging: 'Ưu tiên sự thoải mái, chất liệu mềm.',
  beach: 'Màu sáng, chất liệu nhẹ mát.',
};

// Simple heuristic fit scoring based on category + body type + color + occasion.
export function scoreFit(
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'other',
  color: string | undefined,
  bodyType: BodyType,
  occasion: Occasion = 'casual'
): FitResult {
  let score = 62;
  const notes: string[] = [];

  const c = (color || '').toLowerCase();

  // occasion category bonus
  const occCatBonus = OCCASION_CATEGORY[occasion][category] ?? 0;
  score += occCatBonus;
  if (occasion === 'party' && category === 'dress') notes.push('Đầm liền rất hợp đi tiệc.');
  if (occasion === 'work' && (category === 'dress' || category === 'top')) notes.push('Phù hợp không gian công sở.');

  // occasion color bonus
  if (c && OCCASION_COLOR[occasion][c] !== undefined) {
    score += OCCASION_COLOR[occasion][c];
  }
  notes.push(OCCASION_NOTE[occasion]);

  // body-type category bonus
  const byType: Record<BodyType, Record<string, number>> = {
    ectomorph: { top: 6, bottom: 4, dress: 7, outerwear: 5, other: 3 },
    mesomorph: { top: 6, bottom: 6, dress: 6, outerwear: 6, other: 4 },
    endomorph: { top: 2, bottom: 2, dress: 1, outerwear: 3, other: 2 },
    hourglass: { top: 5, bottom: 4, dress: 9, outerwear: 4, other: 3 },
    pear: { top: 7, bottom: 1, dress: 5, outerwear: 5, other: 3 },
    'inverted-triangle': { top: 1, bottom: 7, dress: 4, outerwear: 1, other: 3 },
    rectangle: { top: 5, bottom: 5, dress: 8, outerwear: 5, other: 3 },
  };
  score += byType[bodyType][category] || 0;

  // color general note
  if (c === 'yellow' || c === 'orange' || c === 'pink') {
    notes.push('Màu nổi bật — nên cân nhắc nếu muốn tôn dáng.');
  } else if (c && ['black', 'navy', 'white', 'gray', 'beige', 'brown'].includes(c)) {
    notes.push('Màu trung tính, dễ tôn dáng.');
  }

  if (category === 'top' && (bodyType === 'pear' || bodyType === 'inverted-triangle')) {
    notes.push(bodyType === 'pear' ? 'Áo có chi tiết ở phần trên giúp cân bằng hông.' : 'Nên chọn áo cổ sâu, tránh pads vai.');
  }
  if (category === 'bottom' && (bodyType === 'pear' || bodyType === 'inverted-triangle')) {
    notes.push(bodyType === 'pear' ? 'Nên chọn ống suông/A nhẹ, tránh quá ôm.' : 'Quần có chi tiết/túi giúp tăng khối phần dưới.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict: FitResult['verdict'] = 'fair';
  if (score >= 85) verdict = 'excellent';
  else if (score >= 72) verdict = 'good';
  else if (score >= 55) verdict = 'fair';
  else verdict = 'poor';

  if (notes.length === 0) notes.push('Trang phục hợp lý với dáng người và hoàn cảnh của bạn.');

  return { score, notes, verdict };
}
