import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVINCES, getProvince, searchProvinces } from '../shared/provinces.ts';
import { climateFallback, describeWeatherCode, toSeasonMatch } from '../shared/weather.ts';

test('đủ 34 tỉnh/thành: 6 thành phố + 28 tỉnh, id không trùng, toạ độ trong lãnh thổ Việt Nam', () => {
  assert.equal(PROVINCES.length, 34);
  assert.equal(PROVINCES.filter((p) => p.isCity).length, 6);
  assert.equal(new Set(PROVINCES.map((p) => p.id)).size, 34);
  for (const p of PROVINCES) {
    assert.ok(p.lat > 8 && p.lat < 23.5 && p.lon > 102 && p.lon < 110, p.id);
  }
});

test('tìm không dấu và theo tên tỉnh cũ', () => {
  assert.equal(searchProvinces('vung tau')[0].province.id, 'ho-chi-minh');
  assert.equal(searchProvinces('vung tau')[0].matchedFormer, 'Bà Rịa – Vũng Tàu');
  assert.equal(searchProvinces('ha noi')[0].province.id, 'ha-noi');
  assert.equal(searchProvinces('da lat')[0].province.id, 'lam-dong');
  assert.equal(searchProvinces('quang binh')[0].province.id, 'quang-tri');
  assert.equal(searchProvinces('').length, 34);
});

test('mùa theo thời tiết: mưa trước, rồi nhiệt độ cảm nhận', () => {
  assert.equal(toSeasonMatch(32, 0, 1), 'Nắng ấm');
  assert.equal(toSeasonMatch(24, 0, 3), 'Mát mẻ');
  assert.equal(toSeasonMatch(16, 0, 0), 'Se lạnh');
  assert.equal(toSeasonMatch(30, 2, 3), 'Mưa');
  assert.equal(toSeasonMatch(30, 0, 95), 'Mưa');
  assert.equal(describeWeatherCode(80), 'Mưa rào nhẹ');
  assert.equal(describeWeatherCode(1234), 'Không rõ');
});

test('số liệu dự phòng theo vùng và tháng', () => {
  const dalat = climateFallback(getProvince('lam-dong')!, new Date(2026, 0, 15));
  assert.equal(dalat.source, 'climate');
  assert.equal(dalat.seasonMatch, 'Se lạnh');
  const hcmRainy = climateFallback(getProvince('ho-chi-minh')!, new Date(2026, 7, 1));
  assert.equal(hcmRainy.seasonMatch, 'Mưa');
  const hanoiWinter = climateFallback(getProvince('ha-noi')!, new Date(2026, 0, 1));
  assert.equal(hanoiWinter.seasonMatch, 'Se lạnh');
});
