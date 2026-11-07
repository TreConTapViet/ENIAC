/**
 * Chuẩn hoá chữ tiếng Việt để so khớp và tìm kiếm không cần gõ dấu:
 * bỏ dấu, đ → d, chữ thường, gộp khoảng trắng. "Đà Lạt" → "da lat".
 */
export function normalizeVi(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
