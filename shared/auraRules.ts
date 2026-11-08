/**
 * Aura trả lời theo luật (không cần Gemini).
 *
 * Dùng ở hai chỗ:
 * - Lệnh gõ tắt (/lenh, /phoi, /size…): luôn trả lời ở đây, ngay lập tức, không tốn lượt Gemini.
 * - Câu hỏi tự nhiên khi Gemini lỗi, hết hạn mức hoặc chưa có key: tách từ khoá trong câu
 *   (dịp, thời tiết, nhiệt độ, dáng người, màu, món đồ trong tủ) rồi ghép bộ từ tủ đồ thật.
 *
 * File thuần (không đụng window/Node), dùng chung cho server (server/app.ts) và client (AuraChatPanel).
 * Chữ trả về dùng **đậm** và dấu "•" vì khung chat chỉ hiểu hai kiểu này.
 */
import { normalizeGender, type GenderOption } from './gender';
import { calculateRecommendedSize, type BodyMeasurementsInput } from './sizing';
import { styleLabel } from './styles';
import { normalizeVi } from './text';

// ───────────────────────────── Kiểu dữ liệu ─────────────────────────────

export interface AuraGarment {
  id?: string;
  name: string;
  category: string;
  color?: string;
  season?: string;
  occasion?: string;
  styleTag?: string;
  favorite?: boolean;
}

export interface AuraLocalInput {
  message: string;
  profile?: (BodyMeasurementsInput & { displayName?: string; favoriteStyles?: string[] }) | null;
  wardrobe?: AuraGarment[] | null;
  weather?: { city?: string; temp?: number; condition?: string; seasonMatch?: string } | null;
  /** Dịp đang chọn trên app (vd. "Dạo phố / Cafe") */
  occasion?: string | null;
}

export type AuraOccasionKey = 'work' | 'street' | 'party' | 'sport' | 'travel';
export type AuraWeatherKey = 'hot' | 'warm' | 'cool' | 'cold' | 'rain';
export type AuraConcern = 'short' | 'slim' | 'curvy' | 'broadShoulder' | 'bigLegs';
export type AuraIntent =
  | 'help'
  | 'outfit'
  | 'size'
  | 'weather'
  | 'wardrobe'
  | 'shop'
  | 'color'
  | 'pair'
  | 'greet'
  | 'thanks';

export interface AuraContext {
  /** Lệnh gõ tắt đã chuẩn hoá (vd. "/phoi"), không có thì undefined */
  command?: string;
  intent: AuraIntent;
  occasion?: AuraOccasionKey;
  weather?: AuraWeatherKey;
  tempC?: number;
  concerns: AuraConcern[];
  colors: string[];
  /** Món trong tủ được nhắc tới trong câu (cho ý "phối với gì") */
  mentionedItem?: AuraGarment;
}

// ───────────────────────────── Bảng lệnh ─────────────────────────────

export const AURA_COMMANDS: readonly { command: string; aliases: string[]; example: string; desc: string }[] = [
  { command: '/lenh', aliases: ['/help', '/giup', '/huongdan'], example: '/lenh', desc: 'Xem các lệnh Aura hiểu' },
  { command: '/phoi', aliases: ['/outfit', '/goiy'], example: '/phoi hẹn hò', desc: 'Lên một bộ từ tủ đồ của bạn (thêm dịp nếu muốn)' },
  { command: '/size', aliases: ['/co'], example: '/size', desc: 'Size áo, quần, jeans hợp với số đo của bạn' },
  { command: '/thoitiet', aliases: ['/weather'], example: '/thoitiet', desc: 'Thời tiết hôm nay và nên mặc gì' },
  { command: '/tudo', aliases: ['/wardrobe'], example: '/tudo', desc: 'Tóm tắt tủ đồ: có gì, còn thiếu gì' },
  { command: '/mua', aliases: ['/sam', '/shop'], example: '/mua', desc: 'Gợi ý 1–2 món nên sắm thêm' },
  { command: '/mau', aliases: ['/color'], example: '/mau đen', desc: 'Màu nào hợp với một màu' },
];

const COMMAND_INTENT: Record<string, AuraIntent> = {
  '/lenh': 'help',
  '/phoi': 'outfit',
  '/size': 'size',
  '/thoitiet': 'weather',
  '/tudo': 'wardrobe',
  '/mua': 'shop',
  '/mau': 'color',
};

/** true khi tin nhắn là lệnh gõ tắt (bắt đầu bằng "/") */
export function isAuraCommand(message: string): boolean {
  return /^\s*\//.test(message || '');
}

function resolveCommand(word: string): string | undefined {
  const w = normalizeVi(word).replace(/[^a-z/]/g, '');
  const found = AURA_COMMANDS.find((c) => c.command === w || c.aliases.includes(w));
  return found?.command;
}

// ───────────────────────────── Từ khoá ─────────────────────────────

/** Từ khoá đã bỏ dấu (so khớp nguyên từ trên chuỗi normalizeVi) */
const OCCASION_WORDS: Record<AuraOccasionKey, string[]> = {
  work: ['di lam', 'cong so', 'van phong', 'phong van', 'di hoc', 'len lop', 'den truong', 'di hop', 'cuoc hop', 'thuyet trinh', 'cong ty'],
  street: ['cafe', 'ca phe', 'cafe sang', 'dao pho', 'di choi', 'shopping', 'xem phim', 'gap ban', 'di dao'],
  party: ['tiec', 'hen ho', 'date', 'dam cuoi', 'an cuoi', 'sinh nhat', 'party', 'su kien', 'an toi', 'prom', 'ky niem'],
  sport: ['the thao', 'gym', 'chay bo', 'yoga', 'tap luyen', 'di tap', 'da bong', 'cau long', 'di boi', 'pickleball', 'tennis'],
  travel: ['du lich', 'di bien', 'bai bien', 'phuot', 'da lat', 'sapa', 'nghi duong', 'cam trai', 'leo nui', 'di xa', 'resort'],
};

export const OCCASION_LABELS: Record<AuraOccasionKey, string> = {
  work: 'Đi làm / Đi học',
  street: 'Dạo phố / Cafe',
  party: 'Tiệc tối / Hẹn hò',
  sport: 'Thể thao / Vận động',
  travel: 'Du lịch',
};

const WEATHER_LABELS: Record<AuraWeatherKey, string> = {
  hot: 'nắng nóng',
  warm: 'ấm dễ chịu',
  cool: 'mát, se lạnh',
  cold: 'lạnh',
  rain: 'mưa',
};

/** Giá trị "season" của món đồ hợp với từng kiểu thời tiết */
const WEATHER_SEASONS: Record<AuraWeatherKey, string[]> = {
  hot: ['Nắng ấm'],
  warm: ['Nắng ấm', 'Mát mẻ'],
  cool: ['Mát mẻ', 'Se lạnh'],
  cold: ['Se lạnh'],
  rain: ['Mưa', 'Mát mẻ'],
};

const CONCERN_WORDS: Record<AuraConcern, string[]> = {
  short: ['thap', 'lun', 'nam lun', 'chan ngan', 'nho con', 'nguoi nho'],
  slim: ['gay', 'nguoi mong', 'cao gay', 'gay go', 'it can'],
  curvy: ['map', 'beo', 'bung', 'bung to', 'tron', 'day dan', 'mo bung', 'tang can'],
  broadShoulder: ['vai rong', 'vai to', 'vai u'],
  bigLegs: ['chan to', 'dui to', 'bap chan', 'chan cong'],
};

/**
 * Màu: raw = từ có dấu (so trên chữ gốc, vì bỏ dấu sẽ trùng: "đỏ"/"độ", "tím"/"tìm", "đen"/"đến"),
 * plain = cụm không dấu không gây nhầm (cho người gõ không dấu).
 */
const COLORS: { raw: string[]; plain: string[]; label: string; pairs: string }[] = [
  { raw: ['đen'], plain: ['mau den', 'ao den', 'quan den', 'vay den', 'dam den'], label: 'đen', pairs: 'trắng, be, xám, đỏ rượu vang; đen toàn thân thì thêm một điểm nhấn kim loại hoặc da' },
  { raw: ['trắng'], plain: ['mau trang', 'ao trang', 'quan trang', 'vay trang', 'dam trang'], label: 'trắng', pairs: 'gần như mọi màu; đẹp nhất với navy, be, denim xanh, đen' },
  { raw: ['be', 'kem', 'beige'], plain: ['mau be', 'mau kem', 'beige'], label: 'be/kem', pairs: 'nâu, trắng, xanh rêu, navy; phối các sắc be đậm nhạt khác nhau rất sang' },
  { raw: ['xám', 'ghi'], plain: ['mau xam', 'mau ghi'], label: 'xám', pairs: 'trắng, đen, xanh pastel, hồng nhạt' },
  { raw: ['navy', 'xanh navy', 'xanh than', 'xanh đậm'], plain: ['navy', 'xanh navy', 'xanh than'], label: 'xanh navy', pairs: 'trắng, be, xám, nâu da bò' },
  { raw: ['xanh dương', 'xanh da trời', 'denim', 'jean', 'jeans'], plain: ['xanh duong', 'xanh da troi', 'denim', 'jean', 'jeans'], label: 'xanh dương', pairs: 'trắng, be, nâu, vàng nhạt' },
  { raw: ['xanh lá', 'xanh rêu', 'rêu', 'olive'], plain: ['xanh la', 'xanh reu', 'olive'], label: 'xanh rêu', pairs: 'be, kem, nâu, trắng ngà' },
  { raw: ['đỏ', 'đỏ đô', 'đỏ rượu'], plain: ['mau do', 'do do', 'do ruou'], label: 'đỏ', pairs: 'đen, trắng, be, denim; chỉ nên có một món đỏ trong bộ' },
  { raw: ['hồng'], plain: ['mau hong', 'hong pastel'], label: 'hồng', pairs: 'trắng, xám, be, xanh denim nhạt' },
  { raw: ['vàng'], plain: ['mau vang'], label: 'vàng', pairs: 'trắng, navy, denim, xám' },
  { raw: ['nâu'], plain: ['mau nau', 'nau dat', 'socola'], label: 'nâu', pairs: 'be, kem, trắng, xanh rêu, xanh navy' },
  { raw: ['tím'], plain: ['mau tim'], label: 'tím', pairs: 'xám, trắng, be, đen' },
  { raw: ['màu cam', 'cam đất'], plain: ['mau cam', 'cam dat'], label: 'cam', pairs: 'trắng, navy, denim, be' },
];

// ───────────────────────────── Phân tích câu ─────────────────────────────

/** Tìm nguyên từ/cụm từ trong chuỗi đã chuẩn hoá */
function hasWord(text: string, word: string): boolean {
  return ` ${text} `.includes(` ${word} `);
}
function hasAny(text: string, words: readonly string[]): boolean {
  return words.some((w) => hasWord(text, w));
}

/** Chuẩn hoá và bỏ dấu câu để so khớp nguyên từ */
function clean(text: string): string {
  return normalizeVi(text).replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Giữ dấu tiếng Việt, chỉ bỏ dấu câu (cho các từ dễ nhầm khi bỏ dấu) */
function cleanRaw(text: string): string {
  return (text || '').normalize('NFC').toLowerCase().replace(/[.,!?;:()"'“”…/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectOccasion(text: string): AuraOccasionKey | undefined {
  return (Object.keys(OCCASION_WORDS) as AuraOccasionKey[]).find((k) => hasAny(text, OCCASION_WORDS[k]));
}

/** Nhiệt độ người dùng gõ vào: "35 độ", "18°C", "30c" */
function detectTemp(raw: string): number | undefined {
  // "35 độ", "35 do", "18°C", "30c" (không bắt "2 cái")
  const m = raw.toLowerCase().match(/(-?\d{1,2})\s*(?:°|độ|do(?![a-zà-ỹ])|c(?![a-zà-ỹ]))/);
  if (!m) return undefined;
  const t = Number(m[1]);
  return t >= -10 && t <= 50 ? t : undefined;
}

function weatherFromTemp(t: number): AuraWeatherKey {
  if (t >= 30) return 'hot';
  if (t >= 25) return 'warm';
  if (t >= 19) return 'cool';
  return 'cold';
}

function detectWeather(raw: string, text: string, tempC?: number): AuraWeatherKey | undefined {
  const r = cleanRaw(raw);
  // Từ thời tiết xét trên chữ có dấu: bỏ dấu thì "mưa" trùng "mua", "nắng" trùng "nặng", "ơi" trùng "oi"
  if (hasAny(r, ['mưa', 'nồm', 'ẩm ướt']) || hasAny(text, ['troi mua', 'mua to', 'mua phun', 'mua rao'])) return 'rain';
  if (hasAny(r, ['se lạnh', 'heo may', 'mát mẻ', 'trời mát', 'mùa thu']) || hasAny(text, ['se lanh', 'mat me', 'troi mat'])) return 'cool';
  if (hasAny(r, ['lạnh', 'rét', 'gió mùa', 'mùa đông']) || hasAny(text, ['troi lanh', 'ret', 'mua dong'])) return 'cold';
  if (hasAny(r, ['nóng', 'nắng', 'oi bức', 'mùa hè']) || hasAny(text, ['troi nong', 'nang gat', 'oi buc', 'mua he'])) return 'hot';
  if (tempC !== undefined) return weatherFromTemp(tempC);
  return undefined;
}

function detectConcerns(text: string): AuraConcern[] {
  return (Object.keys(CONCERN_WORDS) as AuraConcern[]).filter((k) => hasAny(text, CONCERN_WORDS[k]));
}

function detectColors(raw: string, text: string): string[] {
  const r = cleanRaw(raw);
  return COLORS.filter((c) => hasAny(r, c.raw) || hasAny(text, c.plain)).map((c) => c.label);
}

/** Món trong tủ được nhắc tới: tên món nằm trong câu, hoặc trùng ≥ 2 từ có nghĩa */
function detectMentionedItem(text: string, wardrobe: AuraGarment[]): AuraGarment | undefined {
  let best: { item: AuraGarment; score: number } | undefined;
  for (const item of wardrobe) {
    const name = clean(item.name);
    if (!name) continue;
    if (` ${text} `.includes(` ${name} `)) return item;
    const words = name.split(' ').filter((w) => w.length >= 3);
    const score = words.filter((w) => hasWord(text, w)).length;
    if (score >= 2 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item;
}

/** Đọc câu người dùng: lệnh, ý định, dịp, thời tiết, dáng người, màu, món đồ được nhắc */
export function detectAuraContext(message: string, wardrobe: AuraGarment[] = []): AuraContext {
  const raw = (message || '').trim();
  let body = raw;
  let command: string | undefined;
  if (isAuraCommand(raw)) {
    const [first, ...rest] = raw.trim().split(/\s+/);
    command = resolveCommand(first) ?? first.toLowerCase();
    body = rest.join(' ');
  }
  const text = clean(body);
  const tempC = detectTemp(body);
  const ctx: AuraContext = {
    command,
    intent: 'outfit',
    occasion: detectOccasion(text),
    weather: detectWeather(body, text, tempC),
    tempC,
    concerns: detectConcerns(text),
    colors: detectColors(body, text),
    mentionedItem: detectMentionedItem(text, wardrobe),
  };

  if (command) {
    ctx.intent = COMMAND_INTENT[command] ?? 'help';
    return ctx;
  }

  const asksPair = hasAny(text, ['phoi voi', 'mac voi', 'di voi', 'ket hop voi', 'hop voi gi', 'phoi gi', 'phoi sao']);
  if (hasAny(text, ['lenh', 'huong dan', 'ban lam duoc gi', 'giup gi duoc', 'cach dung'])) ctx.intent = 'help';
  else if (hasAny(text, ['size', 'co nao', 'mac so', 'vua khong', 'so may', 'size gi'])) ctx.intent = 'size';
  else if (ctx.mentionedItem && asksPair) ctx.intent = 'pair';
  else if (ctx.colors.length > 0 && (asksPair || hasAny(text, ['mau', 'mau gi', 'hop mau']))) ctx.intent = 'color';
  else if (hasAny(text, ['nen mua', 'mua them', 'sam', 'sam them', 'con thieu', 'thieu gi', 'nen sam'])) ctx.intent = 'shop';
  else if (hasAny(text, ['tu do', 'tu quan ao', 'bao nhieu mon', 'co nhung gi'])) ctx.intent = 'wardrobe';
  else if (hasAny(text, ['thoi tiet', 'troi hom nay', 'nhiet do']) && !ctx.occasion) ctx.intent = 'weather';
  else if (ctx.mentionedItem) ctx.intent = 'pair';
  else if (/^(xin )?chao\b|^(hi|hello|hey|alo)\b/.test(text) && text.split(' ').length <= 4) ctx.intent = 'greet';
  else if (hasAny(text, ['cam on', 'thank', 'thanks', 'tks'])) ctx.intent = 'thanks';
  return ctx;
}

// ───────────────────────────── Ghép bộ ─────────────────────────────

type Role = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'accessory';

const ROLE_CATEGORIES: Record<Role, string[]> = {
  top: ['Áo'],
  bottom: ['Quần', 'Chân váy', 'Quần & Chân váy'],
  dress: ['Đầm & Váy liền'],
  outer: ['Áo khoác'],
  shoes: ['Giày dép'],
  accessory: ['Phụ kiện'],
};

const FEMALE_ONLY = ['Chân váy', 'Đầm & Váy liền', 'Quần & Chân váy'];

/** Món gợi ý thêm khi tủ đồ thiếu, theo giới tính và dịp */
const FALLBACK_ITEMS: Record<GenderOption, Record<AuraOccasionKey, Record<Role, string>>> = {
  Nữ: {
    work: { top: 'Sơ mi lụa trơn màu kem', bottom: 'Quần âu ống suông cạp cao', dress: 'Đầm suông midi cổ sơ mi', outer: 'Blazer dáng rộng màu be', shoes: 'Giày loafer hoặc slingback gót 3–5cm', accessory: 'Túi tote da phom cứng' },
    street: { top: 'Áo thun baby tee trơn', bottom: 'Quần jeans ống rộng cạp cao', dress: 'Đầm hai dây chất đũi', outer: 'Cardigan len mỏng', shoes: 'Sneaker trắng', accessory: 'Túi kẹp nách + kính mát' },
    party: { top: 'Áo croptop cổ vuông', bottom: 'Chân váy satin midi', dress: 'Đầm midi ôm nhẹ màu trơn', outer: 'Blazer lửng hoặc áo choàng mỏng', shoes: 'Giày cao gót mũi nhọn 5–7cm', accessory: 'Ví cầm tay + khuyên tai kim loại' },
    sport: { top: 'Áo bra thể thao + áo thun thoáng khí', bottom: 'Quần legging hoặc biker short', dress: 'Bộ tennis dress', outer: 'Áo khoác gió mỏng', shoes: 'Giày chạy bộ đệm êm', accessory: 'Mũ lưỡi trai + bình nước' },
    travel: { top: 'Áo sơ mi linen rộng', bottom: 'Quần short linen hoặc chân váy maxi', dress: 'Đầm maxi hoa nhí', outer: 'Áo khoác chống nắng mỏng', shoes: 'Sandal quai ngang đế bằng', accessory: 'Mũ cói + túi cói' },
  },
  Nam: {
    work: { top: 'Sơ mi Oxford trắng', bottom: 'Quần âu xám đứng phom', dress: '', outer: 'Blazer navy không lót', shoes: 'Giày loafer hoặc derby da', accessory: 'Đồng hồ dây da + thắt lưng cùng tông giày' },
    street: { top: 'Áo thun trơn dày dặn', bottom: 'Quần jeans ống đứng', dress: '', outer: 'Áo sơ mi khoác ngoài hoặc overshirt', shoes: 'Sneaker trắng', accessory: 'Mũ lưỡi trai hoặc túi đeo chéo' },
    party: { top: 'Sơ mi lụa hoặc polo dệt kim', bottom: 'Quần âu ống đứng màu tối', dress: '', outer: 'Blazer đen hoặc navy', shoes: 'Giày da Chelsea hoặc loafer', accessory: 'Đồng hồ kim loại mảnh' },
    sport: { top: 'Áo thun thể thao thấm hút', bottom: 'Quần short thể thao 2 lớp', dress: '', outer: 'Áo khoác gió mỏng', shoes: 'Giày chạy bộ đệm êm', accessory: 'Mũ lưỡi trai + băng cổ tay' },
    travel: { top: 'Sơ mi linen cổ Cuba', bottom: 'Quần short kaki hoặc quần linen', dress: '', outer: 'Áo khoác gió gấp gọn', shoes: 'Sandal da hoặc sneaker vải', accessory: 'Kính mát + túi đeo chéo' },
  },
};

const WEATHER_TIPS: Record<AuraWeatherKey, string> = {
  hot: 'Trời nóng: ưu tiên cotton, linen, màu sáng; tránh đồ bó và chất nỉ, mang thêm kính hoặc mũ chống nắng.',
  warm: 'Trời ấm dễ chịu: chất cotton mỏng là đủ, có thể thêm một lớp khoác mỏng cho buổi tối.',
  cool: 'Trời mát: thêm một lớp khoác mỏng (cardigan, blazer, overshirt) để cởi ra khi vào phòng có điều hoà.',
  cold: 'Trời lạnh: mặc nhiều lớp mỏng thay vì một áo thật dày; giữ ấm cổ và chân, ưu tiên len và nỉ.',
  rain: 'Trời mưa: tránh vải trắng mỏng và giày vải/da lộn; chọn quần dài vừa mắt cá hoặc đồ nhanh khô, mang áo khoác chống nước.',
};

const OCCASION_TIPS: Record<AuraOccasionKey, string> = {
  work: 'Đi làm/đi học: phom đứng, màu trung tính, tối đa 3 màu trong một bộ để gọn gàng, chỉn chu.',
  street: 'Dạo phố/cafe: thoải mái là chính, thêm một món điểm nhấn (túi, mũ, màu áo) để bộ đồ có “điểm nhớ”.',
  party: 'Tiệc/hẹn hò: chọn một điểm nhấn duy nhất (cổ áo, chất liệu bóng, màu đậm) và để phần còn lại đơn giản.',
  sport: 'Thể thao: chất thấm hút, co giãn, giày đúng môn; tránh cotton dày vì lâu khô.',
  travel: 'Du lịch: đồ ít nhăn, dễ phối chéo, giày đã đi quen chân; mang thêm một lớp khoác gấp gọn.',
};

const CONCERN_TIPS: Record<AuraConcern, string> = {
  short: 'Kéo dài dáng: quần/chân váy cạp cao, sơ vin áo, phối cùng tông từ eo xuống giày; tránh quần lửng cắt ngang bắp chân.',
  slim: 'Dáng mảnh: mặc nhiều lớp (áo + khoác), chất vải có độ dày và độ đứng, kẻ ngang hoặc màu sáng giúp đầy đặn hơn.',
  curvy: 'Gọn dáng: cổ chữ V, phom suông vừa người (không bó, không quá rộng), màu tối ở phần muốn che, chất vải rủ.',
  broadShoulder: 'Cân vai: cổ V hoặc cổ sâu, tay raglan; tránh độn vai, tay phồng và kẻ ngang ở thân trên.',
  bigLegs: 'Che chân: quần ống suông hoặc ống đứng, chân váy chữ A dài qua gối; tránh skinny và váy bó ngắn.',
};

interface Pick {
  role: Role;
  label: string;
  text: string;
  fromWardrobe: boolean;
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function occasionFromLabel(label?: string | null): AuraOccasionKey | undefined {
  if (!label) return undefined;
  const found = (Object.keys(OCCASION_LABELS) as AuraOccasionKey[]).find((k) => OCCASION_LABELS[k] === label);
  return found ?? detectOccasion(clean(label));
}

function weatherFromContext(w: AuraLocalInput['weather']): AuraWeatherKey | undefined {
  if (!w) return undefined;
  if (w.seasonMatch === 'Mưa' || (w.condition && w.condition.toLowerCase().includes('mưa'))) return 'rain';
  if (typeof w.temp === 'number') return weatherFromTemp(w.temp);
  return undefined;
}

function scoreItem(item: AuraGarment, weather: AuraWeatherKey, occasion: AuraOccasionKey, colors: string[], anchor?: AuraGarment): number {
  let s = 0;
  if (item.season && WEATHER_SEASONS[weather].includes(item.season)) s += 3;
  else if (!item.season || item.season === 'Mọi thời tiết') s += 1;
  else s -= 2;
  const occ = occasionFromLabel(item.occasion);
  if (occ === occasion) s += 3;
  else if (!item.occasion) s += 1;
  if (item.favorite) s += 1;
  if (colors.length > 0 && item.color && detectColors(item.color, clean(item.color)).some((c) => colors.includes(c))) s += 2;
  // Tránh hai món cùng màu đậm nổi (trừ màu trung tính)
  if (anchor && anchor.color && item.color && clean(anchor.color) === clean(item.color)) {
    const neutral = ['đen', 'trắng', 'be/kem', 'xám', 'xanh navy'];
    if (!detectColors(item.color, clean(item.color)).some((c) => neutral.includes(c))) s -= 2;
  }
  return s;
}

function pickRole(
  role: Role,
  pool: AuraGarment[],
  used: Set<AuraGarment>,
  weather: AuraWeatherKey,
  occasion: AuraOccasionKey,
  colors: string[],
  seed: number,
  anchor?: AuraGarment,
): AuraGarment | undefined {
  const candidates = pool
    .filter((i) => ROLE_CATEGORIES[role].includes(i.category) && !used.has(i))
    .map((i) => ({ i, s: scoreItem(i, weather, occasion, colors, anchor) }))
    .filter((c) => c.s > -1)
    .sort((a, b) => b.s - a.s);
  if (candidates.length === 0) return undefined;
  // Giữa các món điểm cao ngang nhau, đổi món theo câu hỏi để không lặp một bộ mãi
  const top = candidates.filter((c) => c.s >= candidates[0].s - 1).slice(0, 3);
  return top[seed % top.length].i;
}

const ROLE_LABELS: Record<Role, string> = {
  top: 'Áo',
  bottom: 'Quần / Chân váy',
  dress: 'Đầm',
  outer: 'Áo khoác',
  shoes: 'Giày',
  accessory: 'Phụ kiện',
};

function buildOutfit(
  gender: GenderOption,
  wardrobe: AuraGarment[],
  occasion: AuraOccasionKey,
  weather: AuraWeatherKey,
  colors: string[],
  seed: number,
  anchor?: AuraGarment,
): Pick[] {
  const pool = wardrobe.filter((i) => gender === 'Nữ' || !FEMALE_ONLY.includes(i.category));
  const used = new Set<AuraGarment>();
  const fallback = FALLBACK_ITEMS[gender][occasion];
  const picks: Pick[] = [];
  const add = (role: Role, item?: AuraGarment) => {
    if (item) {
      used.add(item);
      picks.push({ role, label: ROLE_LABELS[role], text: item.name, fromWardrobe: true });
    } else if (fallback[role]) {
      picks.push({ role, label: ROLE_LABELS[role], text: fallback[role], fromWardrobe: false });
    }
  };

  const anchorRole = anchor
    ? (Object.keys(ROLE_CATEGORIES) as Role[]).find((r) => ROLE_CATEGORIES[r].includes(anchor.category))
    : undefined;
  if (anchor && anchorRole) used.add(anchor);

  const wantDress =
    gender === 'Nữ' &&
    anchorRole !== 'top' &&
    anchorRole !== 'bottom' &&
    (anchorRole === 'dress' || ((occasion === 'party' || occasion === 'travel') && pool.some((i) => i.category === 'Đầm & Váy liền')));

  const roles: Role[] = wantDress ? ['dress'] : ['top', 'bottom'];
  if (weather === 'cool' || weather === 'cold' || weather === 'rain' || (occasion === 'work' && gender === 'Nam')) roles.push('outer');
  roles.push('shoes', 'accessory');

  for (const role of roles) {
    if (anchor && role === anchorRole) {
      picks.push({ role, label: ROLE_LABELS[role], text: anchor.name, fromWardrobe: true });
      continue;
    }
    add(role, pickRole(role, pool, used, weather, occasion, colors, seed, anchor));
  }
  return picks;
}

// ───────────────────────────── Câu trả lời ─────────────────────────────

const FOOTER_FALLBACK = '\n\n(Aura đang trả lời nhanh theo từ khoá vì AI tạm bận. Gõ **/lenh** để xem các lệnh.)';
const FOOTER_COMMAND = '\n\nGõ **/lenh** để xem các lệnh khác.';

interface Resolved {
  name: string;
  gender: GenderOption;
  size: ReturnType<typeof calculateRecommendedSize>;
  wardrobe: AuraGarment[];
  weather: AuraWeatherKey;
  weatherLine: string;
  occasion: AuraOccasionKey;
  styles: string[];
  seed: number;
}

function resolve(input: AuraLocalInput, ctx: AuraContext): Resolved {
  const profile = input.profile ?? {};
  const gender = normalizeGender(profile.gender) ?? 'Nữ';
  const size = calculateRecommendedSize(profile);
  const w = input.weather ?? {};
  const weather = ctx.weather ?? weatherFromContext(w) ?? 'warm';
  const temp = ctx.tempC ?? w.temp;
  const weatherLine =
    ctx.weather || ctx.tempC !== undefined
      ? `${typeof temp === 'number' ? `${temp}°C, ` : ''}${WEATHER_LABELS[weather]} (theo bạn mô tả)`
      : `${w.city || 'Nơi bạn ở'} ${typeof w.temp === 'number' ? `${w.temp}°C` : ''}${w.condition ? `, ${w.condition.toLowerCase()}` : ''}`.trim();
  return {
    name: profile.displayName || 'bạn',
    gender,
    size,
    wardrobe: (input.wardrobe ?? []).filter((i) => i && i.name && i.category),
    weather,
    weatherLine,
    occasion: ctx.occasion ?? occasionFromLabel(input.occasion) ?? 'street',
    styles: (profile.favoriteStyles ?? []).map((s) => styleLabel(s, 'short')).filter(Boolean),
    seed: hash(input.message || ''),
  };
}

/** Mẹo theo dáng người: theo câu người dùng, nếu không có thì suy từ số đo trong hồ sơ */
function bodyConcerns(ctx: AuraContext, r: Resolved): AuraConcern[] {
  if (ctx.concerns.length > 0) return ctx.concerns;
  const out: AuraConcern[] = [];
  const shortLimit = r.gender === 'Nam' ? 165 : 155;
  if (r.size.heightCm < shortLimit) out.push('short');
  const bmi = r.size.weightKg / Math.pow(r.size.heightCm / 100, 2);
  if (bmi >= 25) out.push('curvy');
  else if (bmi < 18.5) out.push('slim');
  return out;
}

function sizeFor(role: Role, r: Resolved): string {
  if (role === 'top' || role === 'outer' || role === 'dress') return ` (Size ${r.size.topSize})`;
  if (role === 'bottom') return ` (Size ${r.size.bottomSize})`;
  return '';
}

function outfitReply(ctx: AuraContext, r: Resolved, anchor?: AuraGarment): string {
  const picks = buildOutfit(r.gender, r.wardrobe, r.occasion, r.weather, ctx.colors, r.seed, anchor);
  const lines = picks.map(
    (p) => `• **${p.label}**: ${p.fromWardrobe ? `**${p.text}**` : p.text}${sizeFor(p.role, r)}${p.fromWardrobe ? '' : ' — gợi ý thêm'}`,
  );
  const fromCount = picks.filter((p) => p.fromWardrobe).length;
  const reasons = [WEATHER_TIPS[r.weather], OCCASION_TIPS[r.occasion], ...bodyConcerns(ctx, r).map((c) => CONCERN_TIPS[c])];
  const colorTip = ctx.colors.length
    ? `\n\n**Về màu ${ctx.colors.join(', ')}**: hợp với ${COLORS.find((c) => c.label === ctx.colors[0])!.pairs}.`
    : '';
  const head = anchor
    ? `Phối **${anchor.name}** cho dịp **${OCCASION_LABELS[r.occasion]}** · ${r.weatherLine}`
    : `Công thức cho **${OCCASION_LABELS[r.occasion]}** · ${r.weatherLine}`;
  const wardrobeNote =
    r.wardrobe.length === 0
      ? '\n\nTủ đồ của bạn đang trống nên Aura gợi ý món cơ bản. Thêm đồ vào **Tủ đồ của tôi** để Aura phối bằng đồ thật của bạn.'
      : fromCount === 0
        ? '\n\nTủ đồ chưa có món hợp dịp/thời tiết này nên Aura gợi ý món nên có.'
        : '';
  return `${head}\n\n${lines.join('\n')}\n\n**Vì sao hợp với bạn (${r.size.heightCm}cm, ${r.size.weightKg}kg, Size ${r.size.shortSize})**\n${reasons
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n')}${colorTip}${wardrobeNote}`;
}

function helpReply(r: Resolved): string {
  const list = AURA_COMMANDS.map((c) => `• **${c.example}**: ${c.desc}`).join('\n');
  return `Aura hiểu các lệnh sau (trả lời ngay, không cần chờ AI):\n\n${list}\n\nBạn cũng có thể hỏi tự nhiên, Aura sẽ đọc các từ khoá trong câu:\n• Dịp: “đi làm”, “hẹn hò”, “du lịch Đà Lạt”, “đi gym”…\n• Thời tiết: “trời mưa”, “35 độ”, “se lạnh”…\n• Dáng người: “mình thấp”, “bụng hơi to”, “vai rộng”…\n• Món đồ: “${r.wardrobe[0]?.name || 'áo sơ mi trắng'} phối với gì?”\n• Màu: “áo đen hợp màu gì?”`;
}

function sizeReply(r: Resolved): string {
  const s = r.size;
  const note = s.hasCustomMeasurements
    ? ''
    : '\n\nBạn chưa nhập số đo nên Aura đang dùng số đo trung bình. Cập nhật trong **Hồ sơ** để size chính xác hơn.';
  return `Size của ${r.name} (${s.gender}, ${s.heightCm}cm, ${s.weightKg}kg, số đo ${s.bustCm}-${s.waistCm}-${s.hipCm}cm):\n\n• **Tổng thể**: ${s.overallSize}\n• **Áo**: ${s.topSize}\n• **Quần / Chân váy**: ${s.bottomSize}\n• **Jeans**: ${s.jeansSize}\n\n**Lưu ý khi mặc**: ${s.fitAdvice}${note}`;
}

function weatherReply(ctx: AuraContext, r: Resolved): string {
  return `**Thời tiết**: ${r.weatherLine}\n\n${WEATHER_TIPS[r.weather]}\n\nMuốn Aura lên bộ luôn thì gõ **/phoi** hoặc **/phoi ${r.occasion === 'work' ? 'đi làm' : 'cafe'}**.`;
}

const ESSENTIALS: Record<GenderOption, { category: string; name: string }[]> = {
  Nữ: [
    { category: 'Áo', name: 'Áo sơ mi trắng hoặc blouse trơn' },
    { category: 'Quần', name: 'Quần âu ống suông hoặc jeans ống rộng' },
    { category: 'Chân váy', name: 'Chân váy chữ A dài qua gối' },
    { category: 'Đầm & Váy liền', name: 'Đầm midi trơn màu' },
    { category: 'Áo khoác', name: 'Blazer hoặc cardigan màu trung tính' },
    { category: 'Giày dép', name: 'Sneaker trắng hoặc loafer' },
    { category: 'Phụ kiện', name: 'Túi xách phom cứng màu trung tính' },
  ],
  Nam: [
    { category: 'Áo', name: 'Áo thun trơn trắng/đen dày dặn' },
    { category: 'Áo', name: 'Sơ mi Oxford trắng hoặc xanh nhạt' },
    { category: 'Quần', name: 'Quần chinos be hoặc jeans ống đứng' },
    { category: 'Áo khoác', name: 'Áo khoác overshirt hoặc blazer navy' },
    { category: 'Giày dép', name: 'Sneaker trắng tối giản' },
    { category: 'Phụ kiện', name: 'Thắt lưng da + đồng hồ dây da' },
  ],
};

function missingEssentials(r: Resolved): { category: string; name: string }[] {
  const counts = new Map<string, number>();
  for (const i of r.wardrobe) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  const seen = new Map<string, number>();
  return ESSENTIALS[r.gender].filter((e) => {
    const n = (seen.get(e.category) ?? 0) + 1;
    seen.set(e.category, n);
    const have = (counts.get(e.category) ?? 0) + (e.category === 'Quần' || e.category === 'Chân váy' ? counts.get('Quần & Chân váy') ?? 0 : 0);
    return have < n;
  });
}

function shopReply(r: Resolved): string {
  const missing = missingEssentials(r);
  const style = r.styles.length ? ` theo phong cách **${r.styles.slice(0, 2).join(', ')}**` : '';
  if (missing.length === 0) {
    return `Tủ đồ của ${r.name} đã đủ các món cơ bản. Nếu muốn sắm thêm${style}, hãy chọn **một món điểm nhấn** (áo khoác màu đậm, giày kiểu dáng lạ, túi nổi bật) để phối mới lại những món đang có.`;
  }
  const pick = missing.slice(0, 2);
  return `Hai món nên sắm thêm${style} để phối được nhiều bộ hơn:\n\n${pick
    .map((m, i) => `${i + 1}. **${m.name}** (${m.category}${m.category === 'Giày dép' || m.category === 'Phụ kiện' ? '' : `, Size ${m.category === 'Áo' || m.category === 'Áo khoác' || m.category === 'Đầm & Váy liền' ? r.size.topSize : r.size.bottomSize}`})`)
    .join('\n')}\n\nĐây là các món cơ bản mà tủ đồ hiện còn thiếu; chọn màu trung tính (trắng, đen, be, navy) để dễ phối nhất.`;
}

function wardrobeReply(r: Resolved): string {
  if (r.wardrobe.length === 0) {
    return `Tủ đồ của ${r.name} đang trống. Vào **Tủ đồ của tôi** → **Thêm đồ** để Aura phối bằng đồ thật của bạn. Gõ **/mua** để xem nên bắt đầu với món nào.`;
  }
  const counts = new Map<string, number>();
  for (const i of r.wardrobe) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  const lines = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `• **${c}**: ${n} món`);
  const fav = r.wardrobe.filter((i) => i.favorite).length;
  const missing = missingEssentials(r);
  return `Tủ đồ của ${r.name} có **${r.wardrobe.length} món**${fav ? ` (${fav} món yêu thích)` : ''}:\n\n${lines.join('\n')}${
    missing.length ? `\n\nCòn thiếu: ${missing.map((m) => m.name.toLowerCase()).join('; ')}. Gõ **/mua** để xem nên sắm gì trước.` : ''
  }`;
}

function colorReply(ctx: AuraContext): string {
  if (ctx.colors.length === 0) {
    return `Bạn muốn phối với màu nào? Ví dụ: **/mau đen**, **/mau be**, **/mau xanh navy**.\n\nAura biết các màu: ${COLORS.map((c) => c.label).join(', ')}.`;
  }
  return ctx.colors
    .map((label) => `**${label[0].toUpperCase()}${label.slice(1)}** hợp với: ${COLORS.find((c) => c.label === label)!.pairs}.`)
    .join('\n\n') + '\n\nQuy tắc chung: tối đa 3 màu trong một bộ, trong đó ít nhất một màu trung tính.';
}

/**
 * Câu trả lời của Aura không cần Gemini.
 * mode "command": người dùng gõ lệnh "/…"; mode "fallback": Gemini không trả lời được.
 */
export function answerAuraLocally(input: AuraLocalInput, mode: 'command' | 'fallback' = 'fallback'): string {
  const ctx = detectAuraContext(input.message, input.wardrobe ?? []);
  const r = resolve(input, ctx);
  let reply: string;
  switch (ctx.intent) {
    case 'help':
      reply = ctx.command && !COMMAND_INTENT[ctx.command] && ctx.command !== '/lenh'
        ? `Aura chưa hiểu lệnh **${ctx.command}**.\n\n${helpReply(r)}`
        : helpReply(r);
      return reply;
    case 'size':
      reply = sizeReply(r);
      break;
    case 'weather':
      reply = weatherReply(ctx, r);
      break;
    case 'wardrobe':
      reply = wardrobeReply(r);
      break;
    case 'shop':
      reply = shopReply(r);
      break;
    case 'color':
      reply = colorReply(ctx);
      break;
    case 'pair':
      reply = outfitReply(ctx, r, ctx.mentionedItem);
      break;
    case 'greet':
      reply = `Chào ${r.name}! Hôm nay ${r.weatherLine}. Bạn định đi đâu để Aura lên bộ? Ví dụ: “đi làm”, “hẹn hò tối nay”, hoặc gõ **/phoi**.`;
      break;
    case 'thanks':
      reply = `Rất vui được giúp ${r.name}! Cần phối bộ khác thì cứ nhắn Aura nhé.`;
      break;
    default:
      reply = outfitReply(ctx, r);
  }
  return reply + (mode === 'command' ? FOOTER_COMMAND : FOOTER_FALLBACK);
}
