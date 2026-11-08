/**
 * Phong cách thời trang: danh sách có sẵn theo giới tính + phong cách người dùng tự nhập.
 *
 * Hồ sơ lưu `favoriteStyles` dạng id:
 *  - id có sẵn, ví dụ "minimalist", "city_boy";
 *  - phong cách tự nhập: "custom:<chữ>" (tối đa 50 ký tự).
 * Hồ sơ cũ lưu tên đầy đủ ("Tối giản (Minimalist)") hoặc tên tiếng Việt của bản AI Studio ("Tối giản Tinh tế",
 * commit 52d16c7): migrateLegacyStyles chuyển cả hai sang id.
 *
 * Món đồ / bộ đồ vẫn mang `styleTag` là tên phong cách; resolveStyleId đổi tên đó ra id
 * bằng so khớp chính xác (không so chuỗi con, nên "Preppy" không còn khớp nhầm "Preppy Goth").
 */
import type { GenderOption } from './gender';
import { normalizeVi } from './text';

export interface StylePreset {
  id: string;
  /** Tên hiển thị đầy đủ */
  label: string;
  /** Tên ngắn cho nhãn trên thẻ */
  shortTag: string;
  genders: readonly GenderOption[];
  /** Tên cũ / cách gọi khác, so khớp chính xác sau khi bỏ dấu */
  aliases: readonly string[];
  /** Mô tả + ảnh minh hoạ riêng cho từng giới tính (ảnh có thể chưa có) */
  byGender: Partial<Record<GenderOption, { subtitle: string; image?: string }>>;
}

export const CUSTOM_STYLE_PREFIX = 'custom:';
export const MIN_FAVORITE_STYLES = 1;
export const MAX_FAVORITE_STYLES = 8;
export const MAX_CUSTOM_STYLE_LENGTH = 50;

const BOTH: readonly GenderOption[] = ['Nữ', 'Nam'];
const FEMALE: readonly GenderOption[] = ['Nữ'];
const MALE: readonly GenderOption[] = ['Nam'];

export const STYLE_PRESETS: readonly StylePreset[] = [
  // ---------- Dùng cho cả Nam và Nữ ----------
  {
    id: 'minimalist',
    label: 'Tối giản (Minimalist)',
    shortTag: 'Minimalist',
    genders: BOTH,
    aliases: ['Tối giản Tinh tế', 'Minimalist', 'Tối giản'],
    byGender: {
      Nữ: {
        subtitle: 'Tinh tế, tôn dáng với áo cổ yếm/cổ lọ dệt kim & gam màu nâu espresso, kem, rêu',
        image: '/assets/aistudio/outfit_set_22_turtleneck_ruffle_skirt_f1c7ebce.png',
      },
      Nam: { subtitle: 'Áo phông trơn, sơ mi phom suông, quần ống đứng; gam trắng, đen, be, xám' },
    },
  },
  {
    id: 'smart_casual',
    label: 'Thanh lịch (Smart Casual)',
    shortTag: 'Smart Casual',
    genders: BOTH,
    aliases: ['Thanh lịch Nhã nhặn', 'Smart Casual', 'Thanh lịch'],
    byGender: {
      Nữ: {
        subtitle: 'Chỉn chu công sở & tiệc tối với đầm lụa midi đỏ rượu vang & quần âu ống suông',
        image: '/assets/aistudio/outfit_dress_24_silk_midi_evening_8dc9f369.jpg',
      },
      Nam: { subtitle: 'Sơ mi Oxford, polo dệt kim, quần chinos và giày loafer' },
    },
  },
  {
    id: 'streetwear',
    label: 'Đường phố (Streetwear)',
    shortTag: 'Streetwear',
    genders: BOTH,
    aliases: ['Đường phố Năng động', 'Streetwear', 'Đường phố'],
    byGender: {
      Nữ: {
        subtitle: 'Năng động, phóng khoáng cùng Hoodie Valley, Bomber ngôi sao & quần Baggy',
        image: '/assets/aistudio/outfit_set_01_valley_hoodie_803fab0c.png',
      },
      Nam: { subtitle: 'Hoodie, áo phông oversize in hình, quần cargo/baggy và sneaker' },
    },
  },
  {
    id: 'vintage',
    label: 'Cổ điển (Vintage / Retro)',
    shortTag: 'Vintage',
    genders: BOTH,
    aliases: ['Cổ điển Hoài niệm', 'Vintage', 'Retro', 'Cổ điển'],
    byGender: {
      Nữ: {
        subtitle: 'Hoài niệm với áo len dệt kim tay loe, họa tiết chấm bi & quần jeans ống loe',
        image: '/assets/aistudio/outfit_set_15_grey_bell_pearl_jeans_845b5138.png',
      },
      Nam: { subtitle: 'Sơ mi cổ Cuba, áo len cardigan, quần ống rộng tông nâu, kem, rêu' },
    },
  },
  {
    id: 'sporty',
    label: 'Thể thao (Sporty / Athleisure)',
    shortTag: 'Sporty',
    genders: BOTH,
    aliases: ['Thể thao Khỏe khoắn', 'Sporty', 'Athleisure', 'Thể thao'],
    byGender: {
      Nữ: {
        subtitle: 'Thoáng khí, linh hoạt với hoodie California, croptop & quần nỉ ống rộng',
        image: '/assets/cropped/outfit_sporty_1.jpg',
      },
      Nam: { subtitle: 'Áo thun thể thao, quần jogger, áo khoác gió và giày chạy bộ' },
    },
  },
  {
    id: 'old_money',
    label: 'Old Money (Quiet Luxury)',
    shortTag: 'Old Money',
    genders: BOTH,
    aliases: ['Old Money', 'Quiet Luxury'],
    byGender: {
      Nữ: { subtitle: 'Len cashmere, sơ mi lụa, quần âu cạp cao; gam kem, be, navy' },
      Nam: { subtitle: 'Polo dệt kim, áo len cổ tròn, quần âu xếp ly, loafer da' },
    },
  },
  {
    id: 'office',
    label: 'Công sở thanh lịch (Office)',
    shortTag: 'Công sở',
    genders: BOTH,
    aliases: ['Công sở', 'Office', 'Công sở thanh lịch'],
    byGender: {
      Nữ: { subtitle: 'Blazer, sơ mi, chân váy bút chì hoặc quần âu ống đứng' },
      Nam: { subtitle: 'Sơ mi, blazer, quần âu và giày tây; gam trung tính' },
    },
  },

  // ---------- Nữ ----------
  {
    id: 'coquette_party',
    label: 'Dark Coquette (Tiểu thư Cổ điển)',
    shortTag: 'Dark Coquette',
    genders: FEMALE,
    aliases: ['Tiểu thư Cổ điển', 'Dark Coquette', 'Coquette', 'Tiểu thư', 'Tiểu thư Dạ tiệc (Little Black Dress)', 'Party Dress'],
    byGender: {
      Nữ: {
        subtitle: 'Quyến rũ, kiêu kỳ với áo corset, đầm nơ ruy băng & chân váy xếp tầng',
        image: '/assets/aistudio/outfit_set_17_grey_bow_black_skirt_67b245d7.png',
      },
    },
  },
  {
    id: 'y2k_grunge',
    label: 'Cá tính Y2K (Cyber Grunge)',
    shortTag: 'Y2K',
    genders: FEMALE,
    aliases: ['Cá tính Hiện đại (Y2K)', 'Y2K', 'Cyber Grunge', 'Cá tính Y2K'],
    byGender: {
      Nữ: {
        subtitle: 'Nổi bật với áo lưới xuyên thấu, áo trễ vai & quần jeans đính nơ / bươm bướm',
        image: '/assets/aistudio/outfit_set_10_mesh_top_pink_bow_jeans_dc58c8f8.png',
      },
    },
  },
  {
    id: 'preppy_korean',
    label: 'Preppy Goth / Học đường (Korean Chic)',
    shortTag: 'Preppy Goth',
    genders: FEMALE,
    aliases: ['Học đường Trẻ trung', 'Preppy Goth', 'Preppy Học đường (Korean Chic)', 'Hàn Quốc (Korean Chic)', 'Korean Chic', 'Preppy'],
    byGender: {
      Nữ: {
        subtitle: 'Trẻ trung với đầm giả vest xếp ly, sơ mi, cardigan navy & chân váy chữ A',
        image: '/assets/aistudio/outfit_dress_25_blazer_pleated_office_1b75a8e6.jpg',
      },
    },
  },
  {
    id: 'soft_girl',
    label: 'Nữ tính Ngọt ngào (Soft Girl / Balletcore)',
    shortTag: 'Soft Girl',
    genders: FEMALE,
    aliases: ['Nữ tính Dịu dàng', 'Soft Girl', 'Balletcore', 'Nữ tính'],
    byGender: {
      Nữ: {
        subtitle: 'Dịu dàng với đầm ren trắng thắt nơ, áo quây nơ & chân váy bèo tầng',
        image: '/assets/aistudio/outfit_dress_23_coquette_ribbon_3a26beae.jpg',
      },
    },
  },
  {
    id: 'boho_resort',
    label: 'Du lịch Phóng khoáng (Boho / Maxi)',
    shortTag: 'Boho',
    genders: FEMALE,
    aliases: ['Phóng khoáng Du lịch', 'Phóng khoáng', 'Boho', 'Maxi', 'Boho / Maxi', 'Du lịch'],
    byGender: {
      Nữ: {
        subtitle: 'Bay bổng cho chuyến đi xa với áo cổ yếm lụa & chân váy maxi dài xếp tầng',
        image: '/assets/cropped/outfit_boho_1.jpg',
      },
    },
  },
  {
    id: 'clean_girl',
    label: 'Clean Girl (Tự nhiên)',
    shortTag: 'Clean Girl',
    genders: FEMALE,
    aliases: ['Clean Girl'],
    byGender: { Nữ: { subtitle: 'Áo ba lỗ, sơ mi trắng, quần ống rộng; tóc búi gọn, gam trung tính' } },
  },

  // ---------- Nam ----------
  {
    id: 'city_boy',
    label: 'City Boy (Nhật Bản)',
    shortTag: 'City Boy',
    genders: MALE,
    aliases: ['City Boy'],
    byGender: { Nam: { subtitle: 'Sơ mi oversize, quần ống rộng, mũ lưỡi trai và túi tote' } },
  },
  {
    id: 'techwear',
    label: 'Techwear (Công nghệ)',
    shortTag: 'Techwear',
    genders: MALE,
    aliases: ['Techwear'],
    byGender: { Nam: { subtitle: 'Áo khoác chống nước, quần cargo nhiều túi, tông đen và xám' } },
  },
  {
    id: 'gorpcore',
    label: 'Gorpcore (Dã ngoại)',
    shortTag: 'Gorpcore',
    genders: MALE,
    aliases: ['Gorpcore', 'Outdoor'],
    byGender: { Nam: { subtitle: 'Áo gió, áo fleece, quần dù và giày trekking' } },
  },
  {
    id: 'workwear',
    label: 'Workwear (Bụi bặm)',
    shortTag: 'Workwear',
    genders: MALE,
    aliases: ['Workwear'],
    byGender: { Nam: { subtitle: 'Áo khoác denim/canvas, quần kaki dày, boots da' } },
  },
  {
    id: 'korean_men',
    label: 'Hàn Quốc (Korean Style)',
    shortTag: 'Hàn Quốc',
    genders: MALE,
    aliases: ['Korean Style', 'Hàn Quốc'],
    byGender: { Nam: { subtitle: 'Áo len cổ lọ, blazer dáng rộng, quần âu ống suông' } },
  },
  {
    id: 'preppy_men',
    label: 'Preppy (Học đường)',
    shortTag: 'Preppy',
    genders: MALE,
    aliases: ['Preppy', 'Học đường'],
    byGender: { Nam: { subtitle: 'Sơ mi Oxford, áo len gile, quần chinos và giày loafer' } },
  },
];

const PRESET_BY_ID = new Map(STYLE_PRESETS.map((p) => [p.id, p]));

export const isCustomStyle = (value: string) => value.startsWith(CUSTOM_STYLE_PREFIX);

export function getStylePreset(id: string): StylePreset | undefined {
  return PRESET_BY_ID.get(id);
}

export function stylesForGender(gender: GenderOption): StylePreset[] {
  return STYLE_PRESETS.filter((p) => p.genders.includes(gender));
}

/** Tạo id phong cách tự nhập; trả về null nếu rỗng */
export function makeCustomStyle(text: string): string | null {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CUSTOM_STYLE_LENGTH);
  return clean ? `${CUSTOM_STYLE_PREFIX}${clean}` : null;
}

/** Tên hiển thị của một id phong cách (id có sẵn hoặc custom:…) */
export function styleLabel(value: string, variant: 'full' | 'short' = 'full'): string {
  if (isCustomStyle(value)) return value.slice(CUSTOM_STYLE_PREFIX.length);
  const preset = PRESET_BY_ID.get(value);
  if (preset) return variant === 'short' ? preset.shortTag : preset.label;
  // Tên cũ chưa chuyển đổi: hiện phần trước dấu ngoặc
  return value.split('(')[0].trim() || value;
}

/**
 * Đổi một tên phong cách (styleTag của món đồ, tên cũ trong hồ sơ, id) ra id có sẵn.
 * So khớp chính xác sau khi bỏ dấu; nếu một tên thuộc nhiều phong cách (vd. "Preppy"),
 * ưu tiên phong cách của giới tính `gender`.
 */
export function resolveStyleId(text: string, gender?: GenderOption): string | null {
  if (!text) return null;
  if (PRESET_BY_ID.has(text)) return text;
  const key = normalizeVi(text);
  const hits = STYLE_PRESETS.filter(
    (p) =>
      normalizeVi(p.id) === key ||
      normalizeVi(p.label) === key ||
      normalizeVi(p.shortTag) === key ||
      p.aliases.some((a) => normalizeVi(a) === key)
  );
  if (hits.length === 0) return null;
  return (gender && hits.find((p) => p.genders.includes(gender))?.id) || hits[0].id;
}

/**
 * Chuyển danh sách phong cách của hồ sơ cũ (tên đầy đủ) sang id; bỏ trùng, bỏ phong cách không
 * dành cho giới tính hiện tại. Tên không nhận ra được giữ lại dạng custom:…
 * Không cắt bớt: nếu dài hơn MAX_FAVORITE_STYLES, cổng cập nhật hồ sơ để người dùng chọn lại.
 */
export function migrateLegacyStyles(styles: readonly string[] | undefined, gender: GenderOption): string[] {
  const out: string[] = [];
  for (const raw of styles ?? []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    let value: string | null;
    if (isCustomStyle(raw)) {
      value = makeCustomStyle(raw.slice(CUSTOM_STYLE_PREFIX.length));
    } else {
      const id = resolveStyleId(raw, gender);
      if (id) {
        value = PRESET_BY_ID.get(id)!.genders.includes(gender) ? id : null;
      } else {
        value = makeCustomStyle(raw);
      }
    }
    if (value && !out.some((v) => normalizeVi(v) === normalizeVi(value!))) out.push(value);
  }
  return out;
}

/**
 * Từ khoá (đã bỏ dấu) để hiểu phong cách người dùng tự nhập. Khớp nguyên từ/cụm từ, không khớp
 * chuỗi con: "han" khớp "kieu han quoc" nhưng không khớp "hanoi".
 */
const CUSTOM_STYLE_KEYWORDS: Record<string, readonly string[]> = {
  minimalist: ['toi gian', 'don gian', 'basic', 'minimal', 'trung tinh'],
  smart_casual: ['lich su', 'thanh lich', 'smart', 'casual', 'di choi'],
  streetwear: ['duong pho', 'street', 'hiphop', 'hip hop', 'skater', 'baggy', 'oversize', 'oversized'],
  vintage: ['co dien', 'retro', 'hoai co', 'vintage', '80s', '90s'],
  sporty: ['the thao', 'gym', 'chay bo', 'athleisure', 'sport', 'nang dong'],
  old_money: ['sang trong', 'quy toc', 'lich lam', 'luxury', 'old money', 'quiet luxury'],
  office: ['cong so', 'van phong', 'di lam', 'business', 'cong viec'],
  city_boy: ['nhat', 'nhat ban', 'japan', 'japanese', 'city boy'],
  techwear: ['cong nghe', 'tech', 'chien thuat', 'tactical', 'ninja'],
  gorpcore: ['da ngoai', 'leo nui', 'phuot', 'outdoor', 'trekking', 'cam trai'],
  workwear: ['bui', 'bui bam', 'lao dong', 'work', 'workwear', 'cao boi', 'cowboy'],
  korean_men: ['han', 'han quoc', 'korea', 'korean', 'kpop', 'oppa'],
  preppy_men: ['hoc duong', 'hoc sinh', 'sinh vien', 'preppy', 'ivy'],
  coquette_party: ['tiec', 'du tiec', 'coquette', 'nu tinh', 'tieu thu'],
  y2k_grunge: ['y2k', 'grunge', 'noi loan', 'ca tinh'],
  preppy_korean: ['hoc duong', 'korean chic', 'han', 'han quoc'],
  soft_girl: ['de thuong', 'ngot ngao', 'cute', 'soft'],
  boho_resort: ['bien', 'di bien', 'boho', 'resort', 'nghi duong'],
  clean_girl: ['clean', 'nhe nhang', 'tinh te'],
};

/**
 * Phong cách có sẵn (đúng giới tính) gần với phong cách người dùng tự nhập, để gợi ý ghép từ
 * đồ đã có thay vì trả về danh sách trống. Không nhận ra từ khoá nào thì trả về [].
 */
export function relatedPresetsForCustom(text: string, gender?: GenderOption): string[] {
  const words = ` ${normalizeVi(text).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return STYLE_PRESETS.filter(
    (p) =>
      (!gender || p.genders.includes(gender)) &&
      (CUSTOM_STYLE_KEYWORDS[p.id] ?? []).some((kw) => words.includes(` ${kw} `))
  ).map((p) => p.id);
}

/**
 * Món đồ / bộ đồ mang tên phong cách `itemStyleTag` có thuộc một trong các phong cách `selected`
 * (id hoặc custom:…) không. Danh sách rỗng nghĩa là không lọc.
 */
export function matchesStyles(
  itemStyleTag: string | undefined,
  selected: readonly string[] | undefined,
  gender?: GenderOption
): boolean {
  if (!selected || selected.length === 0) return true;
  if (!itemStyleTag) return false;
  const itemId = resolveStyleId(itemStyleTag, gender);
  const itemKey = normalizeVi(itemStyleTag);
  return selected.some((s) => {
    if (isCustomStyle(s)) {
      const text = s.slice(CUSTOM_STYLE_PREFIX.length);
      // Trùng đúng tên, hoặc món thuộc phong cách có sẵn gần với chữ người dùng nhập
      return (
        normalizeVi(text) === itemKey ||
        (itemId !== null && relatedPresetsForCustom(text, gender).includes(itemId))
      );
    }
    const id = PRESET_BY_ID.has(s) ? s : resolveStyleId(s, gender);
    return id !== null && id === itemId;
  });
}

/** Nhãn ngắn cho styleTag của món đồ / bộ đồ (vd. "Tối giản (Minimalist)" → "Minimalist") */
export function styleTagBadge(tag: string, gender?: GenderOption): string {
  const id = resolveStyleId(tag, gender);
  return id ? PRESET_BY_ID.get(id)!.shortTag : styleLabel(tag, 'short');
}
