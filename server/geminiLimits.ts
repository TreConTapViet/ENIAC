/**
 * Giới hạn token cho mọi lệnh gọi Gemini của server (một chỗ duy nhất để chỉnh).
 *
 * - Đầu ra: maxOutputTokens theo từng API. Với model có chế độ suy nghĩ (thinking), token suy nghĩ
 *   cũng tính vào giới hạn này, nên các API trả JSON được để dư để JSON không bị cắt cụt.
 * - Đầu vào: Gemini không có tham số "max input tokens", nên server cắt bớt chữ người dùng gửi lên
 *   trước khi ghép prompt. Ước lượng tiếng Việt ~3 ký tự / token.
 */

/** Số token đầu ra tối đa của từng API */
export const MAX_OUTPUT_TOKENS = {
  /** Chat Aura: câu trả lời dạng công thức phối đồ ~300–800 token */
  auraChat: 1024,
  /** JSON tối đa 6 bộ đồ */
  recommendOutfits: 2048,
  /** JSON góc xoay 17 khớp xương */
  pose: 1024,
  /** JSON 5 bảng màu */
  colorPalette: 1536,
  /** JSON thời tiết qua Google Search */
  weather: 768,
  /** JSON 3 bộ lookbook đầy đủ */
  aiStylist: 4096,
  /** JSON danh sách món tách từ ảnh, kèm khung bao */
  extractGarments: 4096,
} as const;

/** Giới hạn đầu vào (tính theo ký tự, ~3 ký tự / token) */
export const INPUT_LIMITS = {
  /** Tin nhắn chat: ~330 token */
  chatMessageChars: 1000,
  /** Chỉ gửi vài tin gần nhất, mỗi tin tối đa ~400 token */
  chatHistoryMessages: 6,
  chatHistoryMessageChars: 1200,
  /** Số món tủ đồ đưa vào prompt chat (~40 token / món) */
  chatWardrobeItems: 30,
  /** Mô tả tư thế, yêu cầu riêng, tóm tắt lịch sử của studio */
  posePromptChars: 300,
  customPromptChars: 500,
  savedOutfitsSummaryChars: 1500,
  /** Mô tả ảnh cần tạo */
  imagePromptChars: 600,
  /** Ảnh base64 gửi lên (~3 MB ảnh gốc). Ảnh lớn tốn nhiều token và dễ vượt hạn mức */
  imageBase64Chars: 4_000_000,
} as const;

/** Cắt chuỗi về tối đa `max` ký tự (giá trị không phải chuỗi thành chuỗi rỗng) */
export function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.length > max ? value.slice(0, max) : value;
}
