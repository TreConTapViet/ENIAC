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
  assert.equal(sectionFromPath('/Studio/'), 'mannequin');
  assert.equal(isSectionPath('/', 'discover'), false);
  assert.equal(isSectionPath('/discover/', 'discover'), true);
});

test('đường dẫn: link tiếng Việt cũ vẫn mở đúng mục nhưng không phải đường dẫn chuẩn', () => {
  assert.equal(sectionFromPath('/ma-no-canh'), 'mannequin');
  assert.equal(sectionFromPath('/goi-y'), 'discover');
  assert.equal(sectionFromPath('/tu-do'), 'wardrobe');
  assert.equal(sectionFromPath('/lich-su'), 'history');
  assert.equal(isSectionPath('/ma-no-canh', 'mannequin'), false);
});

test('đường dẫn: đường dẫn lạ và màn đăng nhập không phải mục', () => {
  assert.equal(sectionFromPath('/login'), null);
  assert.equal(sectionFromPath('/khong-co'), null);
});

test('đường dẫn: màn hình trước không gian chính', () => {
  assert.equal(pathForScreen('loading', 'mannequin'), null);
  assert.equal(pathForScreen('auth', 'mannequin'), '/login');
  assert.equal(pathForScreen('onboarding', 'discover'), '/welcome');
  assert.equal(pathForScreen('migration', 'discover'), '/profile-update');
  assert.equal(pathForScreen('main', 'mannequin'), '/studio');
});

test('đường dẫn: tiêu đề tab', () => {
  assert.equal(titleForScreen('main', 'wardrobe'), 'Tủ đồ của tôi · Smart Wardrobe');
  assert.equal(titleForScreen('auth', 'wardrobe'), 'Đăng nhập · Smart Wardrobe');
  assert.equal(titleForScreen('loading', 'wardrobe'), 'Smart Wardrobe');
});
