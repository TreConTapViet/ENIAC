import type { CuratedOutfit } from './types';

/** Bộ đồ nam ghép từ MALE_GARMENTS (mỗi phong cách nam sẽ có ít nhất một bộ khi đủ ảnh) */
export const MALE_OUTFITS: CuratedOutfit[] = [
  {
    id: 'm_look_white_tee_mid_jeans',
    title: 'Áo phông trắng & jeans xanh vừa Minimalist',
    gender: 'Nam',
    styleId: 'minimalist',
    occasion: 'Dạo phố / Cafe',
    season: 'Nắng ấm',
    garmentIds: ['m_top_white_tee', 'm_bottom_jeans_mid'],
    extras: ['Sneaker trắng tối giản', 'Đồng hồ dây da nâu'],
    auraAdvice:
      'Công thức tối giản không bao giờ lỗi mốt: áo phông trắng vừa vai kết hợp jeans slim xanh vừa giữ dáng gọn gàng, thanh lịch.',
  },
  {
    id: 'm_look_white_tee_black_jeans',
    title: 'Áo phông trắng & jeans đen Streetwear',
    gender: 'Nam',
    styleId: 'streetwear',
    occasion: 'Đi làm / Đi học',
    season: 'Mọi thời tiết',
    garmentIds: ['m_top_white_tee', 'm_bottom_jeans_black'],
    extras: ['Sneaker cổ thấp đen trắng', 'Balo vải canvas'],
    auraAdvice:
      'Tương phản trắng – đen sạch sẽ, dễ phối thêm áo khoác khi trời trở gió. Thả áo ngoài quần để dáng thoải mái kiểu đường phố.',
  },
  {
    id: 'm_look_linen_dark_jeans',
    title: 'Sơ mi linen kem & jeans xanh đậm Smart Casual',
    gender: 'Nam',
    styleId: 'smart_casual',
    occasion: 'Dạo phố / Cafe',
    season: 'Nắng ấm',
    garmentIds: ['m_top_linen_shirt', 'm_bottom_jeans_dark'],
    extras: ['Giày loafer da lộn', 'Thắt lưng da nâu'],
    auraAdvice:
      'Chất linen thoáng hợp tiết trời nóng ẩm; tông kem trên nền jeans đậm tạo vẻ chỉn chu mà không cứng nhắc.',
  },
  {
    id: 'm_look_linen_light_jeans',
    title: 'Sơ mi linen & jeans sáng City Boy',
    gender: 'Nam',
    styleId: 'city_boy',
    occasion: 'Du lịch',
    season: 'Nắng ấm',
    garmentIds: ['m_top_linen_shirt', 'm_bottom_jeans_light'],
    extras: ['Mũ lưỡi trai vải', 'Túi tote canvas'],
    auraAdvice:
      'Phối kiểu City Boy: áo rộng nhẹ, jeans ống đứng màu sáng, phụ kiện vải mộc. Thoáng mát cho cả ngày di chuyển.',
  },
  {
    id: 'm_look_blazer_tee_black',
    title: 'Blazer trắng, áo phông & jeans đen Korean Style',
    gender: 'Nam',
    styleId: 'korean_men',
    occasion: 'Tiệc tối / Hẹn hò',
    season: 'Mát mẻ',
    garmentIds: ['m_outer_white_blazer', 'm_top_white_tee', 'm_bottom_jeans_black'],
    extras: ['Giày derby đen', 'Dây chuyền bạc mảnh'],
    auraAdvice:
      'Blazer sáng màu khoác ngoài áo phông trắng là cách lên đồ tối kiểu Hàn: lịch sự nhưng không nặng nề.',
  },
  {
    id: 'm_look_blazer_linen_dark',
    title: 'Blazer trắng & sơ mi linen Smart Casual',
    gender: 'Nam',
    styleId: 'smart_casual',
    occasion: 'Đi làm / Đi học',
    season: 'Mát mẻ',
    garmentIds: ['m_outer_white_blazer', 'm_top_linen_shirt', 'm_bottom_jeans_dark'],
    extras: ['Loafer da nâu', 'Đồng hồ mặt tròn dây da'],
    auraAdvice:
      'Tông kem – trắng – navy thanh lịch: chất liệu tự nhiên, phom vừa người. Hợp phòng họp lẫn bữa trưa với khách.',
  },
  {
    id: 'm_look_vintage_retro',
    title: 'Sơ mi linen kem & jeans xanh vừa Vintage',
    gender: 'Nam',
    styleId: 'vintage',
    occasion: 'Dạo phố / Cafe',
    season: 'Nắng ấm',
    garmentIds: ['m_top_linen_shirt', 'm_bottom_jeans_mid'],
    extras: ['Giày loafer da nâu', 'Kính mát gọng đồi mồi'],
    auraAdvice:
      'Chất liệu linen mộc mạc phối cùng tone jeans xanh cổ điển đem lại cảm giác hoài niệm và lịch lãm.',
  },
  {
    id: 'm_look_sporty_active',
    title: 'Áo phông trắng & jeans xanh đậm Sporty',
    gender: 'Nam',
    styleId: 'sporty',
    occasion: 'Thể thao / Vận động',
    season: 'Mọi thời tiết',
    garmentIds: ['m_top_white_tee', 'm_bottom_jeans_dark'],
    extras: ['Sneaker chạy bộ siêu nhẹ', 'Mũ lưỡi trai thể thao'],
    auraAdvice:
      'Trang phục năng động, thoáng khí thích hợp cho các hoạt động di chuyển và thể thao ngoài trời.',
  },
  {
    id: 'm_look_techwear_minimal',
    title: 'Áo phông trắng & jeans sáng Techwear',
    gender: 'Nam',
    styleId: 'techwear',
    occasion: 'Dạo phố / Cafe',
    season: 'Mọi thời tiết',
    garmentIds: ['m_top_white_tee', 'm_bottom_jeans_light'],
    extras: ['Balo chống nước', 'Sneaker đen quai dán'],
    auraAdvice:
      'Tông màu tối giản với phụ kiện đa năng chống nước tạo vẻ ngoài hiện đại và cá tính.',
  },
  {
    id: 'm_look_gorpcore_outdoor',
    title: 'Blazer trắng, sơ mi linen & jeans sáng Gorpcore',
    gender: 'Nam',
    styleId: 'gorpcore',
    occasion: 'Du lịch',
    season: 'Nắng ấm',
    garmentIds: ['m_outer_white_blazer', 'm_top_linen_shirt', 'm_bottom_jeans_light'],
    extras: ['Giày trekking cổ thấp', 'Mũ tai bèo dã ngoại'],
    auraAdvice:
      'Phong cách outdoor dã ngoại phóng khoáng, chất liệu tự nhiên giúp bạn thoải mái trải nghiệm thiên nhiên.',
  },
  {
    id: 'm_look_workwear_sturdy',
    title: 'Sơ mi linen & jeans đen Workwear',
    gender: 'Nam',
    styleId: 'workwear',
    occasion: 'Đi làm / Đi học',
    season: 'Mọi thời tiết',
    garmentIds: ['m_top_linen_shirt', 'm_bottom_jeans_black'],
    extras: ['Boots da bụi bặm', 'Thắt lưng da bản to'],
    auraAdvice:
      'Thiết kế bụi bặm, bền bỉ và khỏe khoắn mang lại diện mạo nam tính, phong trần.',
  },
  {
    id: 'm_look_preppy_classic',
    title: 'Blazer trắng, áo phông & jeans vừa Preppy',
    gender: 'Nam',
    styleId: 'preppy_men',
    occasion: 'Đi làm / Đi học',
    season: 'Mát mẻ',
    garmentIds: ['m_outer_white_blazer', 'm_top_white_tee', 'm_bottom_jeans_mid'],
    extras: ['Giày loafer da nâu', 'Cặp xách học đường'],
    auraAdvice:
      'Phong cách học đường thanh lịch chỉn chu, vừa mang tinh thần cổ điển vừa hiện đại.',
  },
];
