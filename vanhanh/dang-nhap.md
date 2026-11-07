# Vận hành: Đăng ký và đăng nhập

> Luật chi tiết: [logic-he-thong.md](../architecture/logic-he-thong.md) mục 1–2. Sơ đồ trình tự: [sodokientruc.md](../architecture/sodokientruc.md) mục 6.
> *(chưa có trong code: app hiện vào thẳng studio, chưa có đăng nhập)*

## Đăng ký

| Bước | Người dùng | Hệ thống |
|---|---|---|
| 1 | Nhập email, mật khẩu, tick Điều khoản | Kiểm tra định dạng ngay dưới ô nhập |
| 2 | Bấm Đăng ký | Firebase Auth tạo tài khoản. Trigger `onUserCreate` đặt vai trò `user` và tạo `users/{uid}` |
| 3 | Nhận email xác thực | Firebase gửi email; app chuyển sang `/verify-email` |
| 4 | Bấm link trong email, quay lại bấm "Tôi đã xác thực" | App gọi `user.reload()`; email đã xác thực thì chuyển sang Hồ sơ |

## Đăng nhập

| Bước | Người dùng | Hệ thống |
|---|---|---|
| 1 | Nhập email, mật khẩu | |
| 2 | Bấm Đăng nhập | Firebase Auth trả phiên kèm vai trò trong token |
| 3 | | Route guard kiểm tra lần lượt: email đã xác thực → tài khoản không bị khoá → hồ sơ đã hoàn tất → đủ vai trò cho trang muốn vào |
| 4 | Vào trang | Thanh bên trái hiện mục theo vai trò; admin thấy thêm "Quản trị" |

## Tình huống đặc biệt

| Tình huống | Hệ thống phản ứng |
|---|---|
| Sai email hoặc mật khẩu | Báo chung "Email hoặc mật khẩu không đúng", không tiết lộ email có tồn tại không |
| Sai nhiều lần | Firebase tạm chặn; báo thử lại sau |
| Quên mật khẩu | Luôn báo "Nếu email tồn tại, bạn sẽ nhận được link" |
| Tài khoản bị khoá | Đăng xuất ngay, báo tài khoản bị khoá |
| Phiên hết hạn hoặc bị thu hồi | Function trả `unauthenticated`; app đăng xuất, báo hết phiên |
| Đăng xuất ở một tab | Mọi tab khác cùng về trang đăng nhập |
| Vai trò vừa được đổi | App làm mới token, menu thay đổi ngay mà không cần đăng nhập lại |
