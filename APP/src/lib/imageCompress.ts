/**
 * Nén ảnh chọn từ máy thành data URL JPEG đủ nhỏ cho firestore.rules (imageUrl tối đa ~350 KB ký tự).
 */
const MAX_CHARS = 340000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WEBP.'));
    };
    img.src = url;
  });
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Tệp đã chọn không phải ảnh.');
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ nén ảnh.');

  // Thu nhỏ dần cạnh dài và chất lượng cho tới khi vừa giới hạn
  for (const [edge, quality] of [
    [900, 0.82],
    [720, 0.75],
    [560, 0.7],
    [420, 0.65],
    [320, 0.6],
  ] as const) {
    const scale = Math.min(1, edge / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_CHARS) return dataUrl;
  }
  throw new Error('Ảnh quá lớn sau khi nén. Hãy chọn ảnh khác.');
}
