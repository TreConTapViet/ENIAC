# Vận hành: App cài đặt được (PWA) ở `/app`

> Kiến trúc: [kien-truc.md](../architecture/kien-truc.md) mục 4.12. Bảng chuyển đổi dữ liệu: [du-lieu.md](../architecture/du-lieu.md) mục 7. Quyết định: ADR-008.

## Người dùng tải và dùng app

| Bước | Người dùng | Hệ thống |
|---|---|---|
| 1 | Thấy thẻ "Tải app" ở màn đăng nhập hoặc cuối không gian chính, hoặc thông báo nổi "Cài app" | Thông báo nổi hiện một lần sau 4 giây; đóng thì 14 ngày sau mới hiện lại |
| 2 | Bấm "Tải app" | Mở `/app/?install=1`; app mở sẵn bảng cài. Android/Chrome: hộp cài của trình duyệt. iPhone/Safari: hướng dẫn Chia sẻ → Thêm vào MH chính |
| 3 | Mở app | Đã đăng nhập ở web trên cùng trình duyệt thì vào thẳng (dùng chung phiên Firebase) và nhận hồ sơ web |
| 4 | Sửa hồ sơ, thêm hoặc xoá đồ trong app | Ghi lên Firestore khi email đã xác thực; web đang mở nhận ngay qua `onSnapshot`, và ngược lại |

Lưu ý: app cài trên điện thoại có bộ nhớ trình duyệt riêng, nên lần đầu mở có thể phải đăng nhập lại một lần.

"Tải app" là **cài PWA**, không có file APK.

## Chạy và build

```
npm install          # một lần cho cả web và app
npm run build:app    # build app ra APP/dist
npm run dev          # web ở http://localhost:3000, app ở http://localhost:3000/app/
npm run build        # bản production: web (dist/) + app (APP/dist)
npm run lint         # kiểm tra kiểu web rồi app
```

- `/app` lấy từ `APP/dist`. Ngay cả khi chạy dev, sửa code trong `APP/` xong phải chạy `npm run build:app` thì mới thấy thay đổi. Chưa build thì `/app/` báo "App chưa được build".
- App đọc chung `.env.local` ở gốc repo (`VITE_FIREBASE_*`, `VITE_EMAILJS_*`), không cần file env riêng. Đổi `.env.local` thì phải build lại app.
- Các tính năng AI của app dùng chung `GEMINI_API_KEY` và hạn mức với web.

## Tình huống đặc biệt

| Tình huống | Hệ thống phản ứng |
|---|---|
| Khách hoặc email chưa xác thực | App chạy bằng dữ liệu trên máy, không gọi Firestore, hiện nhắc xác thực email |
| Chưa có hồ sơ trên mây | App không tự tạo; mời người dùng hoàn tất bước đầu trên web (`/`) |
| Tuổi, BMI, dáng người, hoàn cảnh không hiện trên máy khác | Bình thường: các trường này chỉ lưu trên máy (luật Firestore chưa có chỗ) |
| Đăng ký email trong app | Tạo tài khoản Firebase thật và gửi thư xác thực. Sau khi bấm link, bấm "Tôi đã xác thực" trên thanh trạng thái |
| Đăng xuất trong app | Web trên cùng trình duyệt cũng bị đăng xuất (chung phiên) |

## Xử lý sự cố

| Sự cố | Dấu hiệu | Xử lý |
|---|---|---|
| `/app` trả 404 hoặc trang trắng | Chưa build app | `npm run build:app` rồi tải lại |
| App vẫn hiện bản cũ sau khi deploy | Service worker giữ cache | Đóng hết tab app rồi mở lại; nếu vẫn cũ thì gỡ app khỏi màn hình chính và cài lại |
| Lỗi `permission-denied` khi lưu trong app | Ghi trường ngoài `hasOnly` hoặc email chưa xác thực | Xem console; đối chiếu `APP/src/lib/webMapping.ts` với [du-lieu.md](../architecture/du-lieu.md) mục 7 |
| Không hiện hộp cài | Trình duyệt không hỗ trợ, hoặc app đã được cài | Dùng menu trình duyệt → "Cài đặt ứng dụng" / "Thêm vào màn hình chính" |
| Không đăng nhập được trên tên miền mới | Tên miền chưa có trong Firebase | Thêm vào Authentication → Settings → Authorized domains |
| Gợi ý AI / thời tiết trong app báo lỗi | Server trả 429 `RESOURCE_EXHAUSTED` | Gemini API key hết hạn mức; chờ hồi hạn mức hoặc nâng gói ở Google AI Studio |
