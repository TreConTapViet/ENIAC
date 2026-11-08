import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscoverFeed } from '../src/domain/outfits.ts';
import type { AuraOutfitRecommendation } from '../src/types.ts';

const outfit = (id: string, gender: AuraOutfitRecommendation['gender']): AuraOutfitRecommendation =>
  ({ id, title: id, gender, styleTag: 'Tối giản (Minimalist)', occasion: 'Dạo phố / Cafe', weatherNote: '', imageUrl: '', items: [], colorPalette: [], auraAdvice: '' }) as AuraOutfitRecommendation;

test('đổi Nữ → Nam: bộ AI tạo lúc còn là Nữ không còn hiện trong gợi ý', () => {
  const feed = buildDiscoverFeed({
    generated: [outfit('ai_nu', 'Nữ'), outfit('ai_nam', 'Nam')],
    catalog: [outfit('cat_unisex', 'Unisex')],
    gender: 'Nam',
    styles: [],
    styleFilter: 'Tất cả',
    occasionFilter: 'Tất cả dịp',
  });
  const ids = [...feed.main, ...feed.extra].map((o) => o.id);
  assert.deepEqual(ids.sort(), ['ai_nam', 'cat_unisex']);
});
