import type { CuratedOutfit } from './types';

/** Bộ đồ nam ghép từ MALE_GARMENTS (mỗi phong cách nam sẽ có ít nhất một bộ khi đủ ảnh) */
export const MALE_OUTFITS: CuratedOutfit[] = [
  {
    id: 'm_look_white_tee_mid_jeans',
    title: 'Áo phông trắng & jeans xanh vừa',
    gender: 'Nam',
    styleId: 'minimalist',
    occasion: 'Dạo phố / Cafe',
    season: 'Nắng ấm',
    garmentIds: ['m_top_white_tee', 'm_bottom_jeans_mid'],
    extras: ['Sneaker trắng tối giản', 'Đồng hồ dây da nâu'],
    auraAdvice:
      'Công thức tối giản không bao giờ lỗi: áo phông trắng vừa vai sơ vin nhẹ phía trước giúp chia tỷ lệ thân trên – chân rõ ràng, jeans slim giữ dáng gọn.',
  },
  {
    id: 'm_look_white_tee_black_jeans',
    title: 'Áo phông trắng & jeans đen đi học',
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
    title: 'Sơ mi linen kem & jeans xanh đậm',
    gender: 'Nam',
    styleId: 'smart_casual',
    occasion: 'Dạo phố / Cafe',
    season: 'Nắng ấm',
    garmentIds: ['m_top_linen_shirt', 'm_bottom_jeans_dark'],
    extras: ['Giày loafer da lộn', 'Thắt lưng da nâu'],
    auraAdvice:
      'Chất linen thoáng hợp tiết trời nóng ẩm; tông kem trên nền jeans đậm tạo vẻ chỉn chu mà không cứng nhắc. Xắn tay áo hai gấu để thêm phần thoải mái.',
  },
  {
    id: 'm_look_linen_light_jeans',
    title: 'Sơ mi linen & jeans sáng đi du lịch',
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
    title: 'Blazer trắng, áo phông & jeans đen hẹn hò',
    gender: 'Nam',
    styleId: 'korean_men',
    occasion: 'Tiệc tối / Hẹn hò',
    season: 'Mát mẻ',
    garmentIds: ['m_outer_white_blazer', 'm_top_white_tee', 'm_bottom_jeans_black'],
    extras: ['Giày derby đen', 'Dây chuyền bạc mảnh'],
    auraAdvice:
      'Blazer sáng màu khoác ngoài áo phông trắng là cách lên đồ tối kiểu Hàn: lịch sự nhưng không nặng nề. Jeans đen giữ tổng thể gọn và tôn chiều cao.',
  },
  {
    id: 'm_look_blazer_linen_dark',
    title: 'Blazer trắng & sơ mi linen đi làm',
    gender: 'Nam',
    styleId: 'old_money',
    occasion: 'Đi làm / Đi học',
    season: 'Mát mẻ',
    garmentIds: ['m_outer_white_blazer', 'm_top_linen_shirt', 'm_bottom_jeans_dark'],
    extras: ['Loafer da nâu', 'Đồng hồ mặt tròn dây da'],
    auraAdvice:
      'Tông kem – trắng – navy đúng tinh thần Old Money: chất liệu tự nhiên, không logo, phom vừa người. Hợp phòng họp lẫn bữa trưa với khách.',
  },
];
