export type Occasion =
  | 'work'
  | 'casual'
  | 'party'
  | 'sports'
  | 'lounging'
  | 'beach';

export interface OccasionInfo {
  value: Occasion;
  label: string;
  emoji: string;
  description: string;
}

export const OCCASIONS: OccasionInfo[] = [
  { value: 'work', label: 'Đi làm', emoji: '💼', description: 'Trang phục công sở, thanh lịch và gọn gàng.' },
  { value: 'casual', label: 'Đi chơi / Hẹn hò', emoji: '☕', description: 'Phong cách trẻ trung, thoải mái nhưng vẫn nổi bật.' },
  { value: 'party', label: 'Đi tiệc', emoji: '🎉', description: 'Trang phục sang trọng, thu hút ánh nhìn.' },
  { value: 'sports', label: 'Thể thao', emoji: '🏃', description: 'Trang phục vận động thoáng, linh hoạt.' },
  { value: 'lounging', label: 'Ở nhà', emoji: '🏠', description: 'Trang phục thư giãn, thoải mái tối đa.' },
  { value: 'beach', label: 'Biển / Du lịch', emoji: '🏖️', description: 'Trang phục nhẹ, mát mẻ, năng động.' },
];

export function occasionInfo(value: Occasion): OccasionInfo {
  return OCCASIONS.find((o) => o.value === value) || OCCASIONS[1];
}
