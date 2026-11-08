// Điểm vào của Vercel Function "/api". scripts/build-vercel.mjs đóng gói file này (cùng server/app.ts,
// shared/ và thư viện) thành một file duy nhất, nên không phụ thuộc cách Node tìm import không đuôi.
// Không đặt file này trong thư mục api/: Vercel sẽ tự dựng thêm function riêng cho mọi file ở đó.
import type { IncomingMessage, ServerResponse } from 'http';
import { app } from './app.ts';

/** Tham số do route trong .vercel/output/config.json gắn thêm, giữ phần đường dẫn sau /api/. */
const PATH_PARAM = '__api_path';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel thường giữ nguyên địa chỉ gốc (/api/aura/chat). Nếu function chỉ thấy "/api?__api_path=aura/chat"
  // thì dựng lại đường dẫn gốc để Express khớp đúng route.
  const url = new URL(req.url ?? '/', 'http://localhost');
  const original = url.searchParams.get(PATH_PARAM);
  url.searchParams.delete(PATH_PARAM);
  if (original !== null && (url.pathname === '/api' || url.pathname === '/api/')) {
    url.pathname = `/api/${original}`;
  }
  req.url = url.pathname + url.search;
  return app(req as any, res as any);
}
