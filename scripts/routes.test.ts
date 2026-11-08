import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTION_PATHS,
  isSectionPath,
  pathForScreen,
  sectionFromPath,
  titleForScreen,
} from '../src/utils/routes';

test('đường dẫn: mỗi mục có đường dẫn riêng và đọc ngược lại được', () => {
  for (const [id, path] of Object.entries(SECTION_PATHS)) {
    assert.equal(sectionFromPath(path), id);
  }
});

test('đường dẫn: trang chủ là mục Gợi ý, chấp nhận "/" cuối và chữ hoa', () => {
  assert.equal(sectionFromPath('/'), 'discover');
  assert.equal(sectionFromPath(''), 'discover');
  assert.equal(sectionFromPath('/Ma-No-Canh/'), 'mannequin');
  assert.equal(isSectionPath('/', 'discover'), false);
  assert.equal(isSectionPath('/goi-y/', 'discover'), true);
});

test('đường dẫn: đường dẫn lạ và màn đăng nhập không phải mục', () => {
  assert.equal(sectionFromPath('/dang-nhap'), null);
  assert.equal(sectionFromPath('/khong-co'), null);
});

test('đường dẫn: màn hình trước không gian chính', () => {
  assert.equal(pathForScreen('loading', 'mannequin'), null);
  assert.equal(pathForScreen('auth', 'mannequin'), '/dang-nhap');
  assert.equal(pathForScreen('onboarding', 'discover'), '/bat-dau');
  assert.equal(pathForScreen('migration', 'discover'), '/cap-nhat-ho-so');
  assert.equal(pathForScreen('main', 'mannequin'), '/ma-no-canh');
});

test('đường dẫn: tiêu đề tab', () => {
  assert.equal(titleForScreen('main', 'wardrobe'), 'Tủ đồ của tôi · Smart Wardrobe');
  assert.equal(titleForScreen('auth', 'wardrobe'), 'Đăng nhập · Smart Wardrobe');
  assert.equal(titleForScreen('loading', 'wardrobe'), 'Smart Wardrobe');
});
