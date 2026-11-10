# Vận hành: Chạy, triển khai và xử lý sự cố

> Kiểm thử và môi trường: [logic-he-thong.md](../architecture/logic-he-thong.md) mục 14–15. Sơ đồ triển khai: [so-do-kien-truc.md](../architecture/so-do-kien-truc.md) mục 12.

## Chạy trên máy

**Code hiện tại** (Express + Vite):

```
npm install        # một lần cho cả web và app PWA
# tạo .env.local từ .env.example: GEMINI_API_KEY và VITE_FIREBASE_*
npm run build:app  # build app PWA ra APP/dist (cần cho /app)
npm run dev        # web http://localhost:3000, app http://localhost:3000/app/
npm run lint       # kiểm tra kiểu TypeScript
```

`server.ts` nạp `.env.local` rồi `.env`. App ở `/app` xem [app-pwa.md](app-pwa.md).

**Sau khi chuyển sang Firebase** *(chưa có)*:

```
npm install && npm --prefix functions install
firebase emulators:start          # Auth, Firestore, Storage, Functions
npm run dev                       # frontend trỏ vào emulator
```

Khi chạy test, Gemini được giả lập. Muốn gọi Gemini thật trên máy thì đặt key trong `functions/.secret.local`.

## Triển khai

**Hiện tại (Vercel):** project `eniac` của team `phwtrag` nối với repo GitHub `TreConTapViet/ENIAC`. Mỗi lần push, Vercel tự build bằng `npm run build:vercel` (khai báo trong `vercel.json`): nhánh `main` lên production, nhánh khác thành bản preview. Biến `GEMINI_API_KEY` và `VITE_FIREBASE_*` đặt ở Project Settings → Environment Variables. Thử bản build trên máy: `npm run build:vercel` rồi xem `.vercel/output/`. Tên miền Vercel mới phải được thêm vào Authorized domains của Firebase Auth thì đăng nhập Google mới chạy.

**Thiết kế đích (chưa làm):**

| Môi trường | Khi nào | Cách |
|---|---|---|
| `dev` | Mỗi lần merge vào `main` | GitHub Actions tự deploy Hosting preview + Functions + Rules |
| `prod` | Khi gắn tag `v*` | GitHub Actions deploy; cần người duyệt |

Trước mỗi lần deploy, CI phải qua: lint, type-check, unit test, test Security Rules, build.

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
| Chưa đăng luật có số đo dài chân / dài lưng | Console có cảnh báo "Firestore chưa có luật cho số đo dài chân/dài lưng"; hai số này không sang máy khác. Hồ sơ vẫn lưu bình thường | Đăng `firestore.rules` mới (Firebase Console → Firestore → Rules → Publish). Lần tải hồ sơ kế tiếp trên máy đã nhập sẽ tự đẩy số đo lên (ADR-009) |
| Admin lỡ xoá món trong kho | Người dùng báo món biến mất | Sysadmin khôi phục trong 30 ngày (`/admin/catalog` → Đã ẩn) |
| Người dùng mất quyền admin sau khi đổi | Menu không đổi | Người đó đăng xuất rồi đăng nhập lại để lấy token mới |

## Sao lưu

- Bật Firestore scheduled backup hằng ngày, giữ 30 ngày, ở project `prod`.
- Storage chỉ chứa ảnh của người dùng. Hệ thống không sao lưu riêng Storage, vì ảnh gốc là của người dùng và ảnh do AI tạo có thể tạo lại.
