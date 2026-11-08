# Vận hành: Chạy, triển khai và xử lý sự cố

> Kiểm thử và môi trường: [logic-he-thong.md](../architecture/logic-he-thong.md) mục 14–15. Sơ đồ triển khai: [so-do-kien-truc.md](../architecture/so-do-kien-truc.md) mục 12.

## Chạy trên máy

**Code hiện tại** (Express + Vite):

```
npm install
# tạo .env.local với GEMINI_API_KEY=...
npm run dev        # http://localhost:3000
npm run lint       # kiểm tra kiểu TypeScript
```

**Sau khi chuyển sang Firebase** *(chưa có)*:

```
npm install && npm --prefix functions install
firebase emulators:start          # Auth, Firestore, Storage, Functions
npm run dev                       # frontend trỏ vào emulator
```

Khi chạy test, Gemini được giả lập. Muốn gọi Gemini thật trên máy thì đặt key trong `functions/.secret.local`.

## Triển khai

| Môi trường | Khi nào | Cách |
|---|---|---|
| `dev` | Mỗi lần merge vào `main` | GitHub Actions tự deploy Hosting preview + Functions + Rules |
| `prod` | Khi gắn tag `v*` | GitHub Actions deploy; cần người duyệt |

Trước mỗi lần deploy, CI phải qua: lint, type-check, unit test, test Security Rules, build.

### Bản đang chạy trên Vercel (`eniac-beta.vercel.app`)

Bảng trên là quy trình đích. Hiện tại Vercel tự build nhánh `main` bằng `npm run build:vercel` (khai báo trong `vercel.json`). Lệnh này chạy `vite build` rồi `scripts/build-vercel.mjs` để tạo `.vercel/output`: giao diện tĩnh + một Vercel Function `/api` chứa mọi API (Aura, thời tiết, studio). Function được phép chạy tối đa 60 giây; mỗi request gửi lên tối đa 4,5 MB (giới hạn của Vercel).

- **Biến môi trường:** Vercel không đọc `.env.local`. Vào Vercel → Project `eniac` → Settings → Environment Variables, thêm cho Production và Preview: đủ các biến `VITE_FIREBASE_*` như trong `.env.local` (dùng lúc build giao diện) và `GEMINI_API_KEY` (dùng lúc function chạy; thiếu thì Aura trả lời dự phòng, API studio báo 503). Đổi biến xong phải Redeploy. Thiếu các biến này thì `src/firebase.ts` ở `main` lùi về project AI Studio cũ (`unified-catalyst-8wpgt`), còn bản đã bỏ `firebase-applet-config.json` thì báo lỗi và trang trắng.
- **Tên miền được phép đăng nhập:** Firebase Console (project `smart-wardrobe-79480`) → Authentication → Settings → Authorized domains, thêm `eniac-beta.vercel.app`. Thiếu bước này thì đăng nhập Google báo `auth/unauthorized-domain`.
- **Đường dẫn từng mục** (`/dang-nhap`, `/goi-y`, `/ma-no-canh`, `/tu-do`, `/lich-su`…): route cuối trong `.vercel/output/config.json` trả `index.html` cho mọi đường dẫn không phải file, trừ `/api/`, `/assets/`, `/models/`, để mở thẳng hoặc tải lại trang không bị 404.
- **Kiểm tra sau khi deploy:** mở `https://eniac-beta.vercel.app/api/weather/current?province=ha-noi`, phải thấy JSON thời tiết. Lỗi của function xem ở Vercel → Project → Logs.
- **Thử bản Vercel trên máy:** `npm run build:vercel`, rồi `.vercel/output/functions/api.func/index.mjs` export hàm `handler(req, res)` chạy được bằng `http.createServer`.

**Quay lui:**
- Hosting: `firebase hosting:rollback`.
- Functions: deploy lại tag trước.
- Rules: deploy lại bản Rules trong tag trước.

## Giám sát hằng ngày

| Xem gì | Ở đâu | Ngưỡng cảnh báo |
|---|---|---|
| Tỉ lệ lỗi function | Cloud Logging / `/admin/system` | > 5% trong 10 phút |
| Gemini trả 429 (quá tải) | Log `geminiClient` | Liên tục trong 5 phút |
| Chi phí | Budget Alert trên Google Cloud | 50%, 90%, 100% ngân sách tháng |
| Lỗi giao diện | Dịch vụ theo dõi lỗi frontend | Lỗi mới xuất hiện |

## Xử lý sự cố

| Sự cố | Dấu hiệu | Xử lý |
|---|---|---|
| Gemini lỗi hoặc quá tải | Người dùng thấy "Hệ thống AI đang bận" | Function đã tự thử lại 2 lần và hoàn lượt. Nếu kéo dài, sysadmin đổi model dự phòng trong `config/models` |
| Model bị Google ngừng | Lỗi `not-found` từ Gemini | Đổi tên model trong `config/models`; không cần deploy |
| Lộ API key | Chi phí tăng bất thường | Tạo key mới ở AI Studio → `firebase functions:secrets:set GEMINI_API_KEY` → deploy lại functions → xoá key cũ |
| Bị gọi API ồ ạt | Lượt AI tăng đột biến từ ít tài khoản | Kiểm tra App Check đang bật; sysadmin khoá tài khoản nghi vấn; giảm `maxInstances` |
| Rules sai chặn người dùng | Nhiều lỗi `permission-denied` sau một lần deploy | Quay lui Rules về tag trước |
| Admin lỡ xoá món trong kho | Người dùng báo món biến mất | Sysadmin khôi phục trong 30 ngày (`/admin/catalog` → Đã ẩn) |
| Người dùng mất quyền admin sau khi đổi | Menu không đổi | Người đó đăng xuất rồi đăng nhập lại để lấy token mới |

## Sao lưu

- Bật Firestore scheduled backup hằng ngày, giữ 30 ngày, ở project `prod`.
- Storage chỉ chứa ảnh của người dùng. Hệ thống không sao lưu riêng Storage, vì ảnh gốc là của người dùng và ảnh do AI tạo có thể tạo lại.
