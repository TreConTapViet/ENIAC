# Phân quyền Smart-wardrobe

> Mô hình phân quyền theo vai trò (RBAC). Quyết định quyền **luôn** nằm ở Security Rules và Cloud Functions. Frontend chỉ ẩn/hiện menu cho tiện.
> Dữ liệu được nhắc đến: xem [du-lieu.md](du-lieu.md). Luồng: xem [kien-truc.md](kien-truc.md) mục 4.9–4.10.
>
> Cập nhật lần cuối: 2026-11-07. Trạng thái: thiết kế, chưa có code.

## 1. Vai trò

Vai trò sau bao gồm mọi quyền của vai trò trước nó: `user` ⊂ `admin` ⊂ `sysadmin`.

| Mã | Tên hiển thị | Ai | Mục đích |
|---|---|---|---|
| `user` | Người dùng | Mọi tài khoản đăng ký | Dùng website cho bản thân |
| `admin` | Quản trị viên | Nhân sự nội dung | Đưa quần áo mới vào kho chung, sửa, xoá; kiểm tra tình trạng hệ thống (chỉ xem) |
| `sysadmin` | Người quản trị hệ thống | Rất ít người | Mọi quyền của admin, thêm: cấp/thu hồi vai trò, khoá/mở khoá tài khoản, chỉnh hạn mức, cấu hình model AI |

Nguyên tắc quyền tối thiểu: admin và sysadmin **không** xem được ảnh cơ thể, tủ đồ cá nhân hay nội dung chat của người dùng. Họ chỉ thấy thông tin tài khoản và số liệu sử dụng.

## 2. Ma trận quyền

Ký hiệu: Đ = đọc, G = ghi/tạo/sửa, X = xoá, — = không có quyền. "Của mình" nghĩa là `request.auth.uid == uid`.

| Tài nguyên | user | admin | sysadmin | Thực thi tại |
|---|---|---|---|---|
| Hồ sơ, tủ đồ, bộ đồ, hội thoại **của mình** | Đ G X | Đ G X | Đ G X | Rules |
| Dữ liệu cá nhân **của người khác** | — | — | — | Rules |
| Thông tin tài khoản người khác (email, vai trò, trạng thái, usage) | — | Đ | Đ | Function `adminListUsers` |
| Kho đồ chung, trạng thái `published` | Đ | Đ | Đ | Rules |
| Kho đồ chung, trạng thái `draft`/`archived` | — | Đ | Đ | Rules |
| Tạo, sửa, đăng, ẩn món trong kho | — | G X | G X | Function `adminCatalog*` |
| Khôi phục món đã ẩn, xoá hẳn ngay | — | — | G X | Function |
| Thống kê hệ thống (lượt AI, lỗi, chi phí ước tính) | — | Đ | Đ | Function `adminStats` |
| Nhật ký quản trị `auditLogs` | — | Đ (của mình) | Đ (tất cả) | Rules |
| Khoá/mở khoá tài khoản | — | — | G | Function `adminSetUserStatus` |
| Cấp/thu hồi vai trò | — | — | G | Function `adminSetRole` |
| Hạn mức (`config/quotas`, `quotaOverride`) | — | Đ | G | Function |
| Cấu hình model (`config/models`) | — | Đ | G | Function |

## 3. Cơ chế

### 3.1 Vai trò nằm ở Custom Claims

- Vai trò được lưu trong token đăng nhập dưới dạng `{ role: "admin" }`. Chỉ Admin SDK (tức Cloud Functions hoặc script nội bộ) mới đặt được, nên client không tự nâng quyền được.
- `users/{uid}.role` chỉ là bản sao để hiển thị và truy vấn danh sách.
- Trigger `onUserCreate` đặt `role: "user"` cho mọi tài khoản mới.
- Sau khi đổi vai trò, function gọi `revokeRefreshTokens(uid)`. Phía người bị đổi vai trò, frontend gọi `getIdToken(true)` để token mới có hiệu lực ngay, không phải chờ token cũ hết hạn sau 1 giờ.

### 3.2 Sysadmin đầu tiên

Không có giao diện để tự phong sysadmin. Sysadmin đầu tiên được tạo bằng script `scripts/grant-role.mjs <email> sysadmin`. Script chạy trên máy người có quyền Owner của project Firebase, dùng Admin SDK. Từ sysadmin thứ hai trở đi thì cấp qua trang quản trị.

### 3.3 Luật bảo vệ

- Sysadmin không tự hạ vai trò hay khoá chính mình nếu đó là sysadmin cuối cùng. Function đếm số sysadmin trước khi cho phép.
- Admin không đổi được vai trò của ai, kể cả chính mình.
- Mọi thao tác quản trị được ghi vào `auditLogs` **trong cùng transaction** với thay đổi. Nếu không ghi được log thì thao tác cũng không được thực hiện.
- Mọi function quản trị kiểm tra theo thứ tự: có `auth` → `status` là `active` → `role` đủ cấp → tham số hợp lệ. Thiếu điều kiện nào thì trả `permission-denied` hoặc `invalid-argument` (xem [logic-he-thong.md](logic-he-thong.md) mục 7).
- Trang `/admin/*` yêu cầu tài khoản admin hoặc sysadmin đăng nhập lại (re-authenticate) nếu lần đăng nhập gần nhất đã quá 12 giờ.

### 3.4 Security Rules

Luật thật nằm ở [`firestore.rules`](../firestore.rules) (project `smart-wardrobe-79480`, database `(default)`). Tóm tắt:

| Collection | Đọc | Ghi |
|---|---|---|
| `users/{uid}` | Chỉ chủ tài khoản (`get`); không ai `list` | Chỉ chủ tài khoản; kiểm tra kiểu, khoảng giá trị, danh sách trường. Không có trường `passwordHash`, `role`, `status` nên client không tự nâng quyền được |
| `wardrobeItems`, `savedOutfits` | Chỉ chủ (`userId == request.auth.uid`); truy vấn phải lọc theo `userId` | Chỉ chủ; `userId` không đổi được; `savedOutfits` không sửa sau khi lưu |
| `catalog` | Đã đăng nhập: món `published`; `admin`/`sysadmin`: mọi trạng thái | Chỉ Cloud Functions |
| `config` | `admin`, `sysadmin` | Chỉ Cloud Functions |
| `auditLogs` | `sysadmin`: tất cả; `admin`: của mình | Không ai (chỉ Admin SDK) |
| Còn lại | Cấm | Cấm |

Vai trò đọc bằng `request.auth.token.get('role', 'user')`: tài khoản chưa được cấp claim là `user`.

Hai luật chung:

- **Email phải được xác thực** (`email_verified`) mới đọc/ghi được bất kỳ dữ liệu nào. Google tự xác thực; tài khoản email + mật khẩu nhận thư xác thực của Firebase khi đăng ký. Trước khi xác thực, app chạy bằng dữ liệu trên máy và hiện dải nhắc "Xác thực email".
- **Ảnh** (`imageUrl`, `avatarUrl`) chỉ nhận `https://…`, ảnh mẫu `/assets/…`, hoặc data URL `image/jpeg|png|webp`, tối đa ~350 KB. Ảnh đại diện còn nhận SVG nội tuyến mặc định của app (tối đa 20 KB).

Triển khai luật: dán nội dung `firestore.rules` vào Firebase Console → Firestore Database → Rules → Publish; hoặc `npx firebase-tools login` rồi `npx firebase-tools deploy --only firestore:rules` (đã có `firebase.json`, `.firebaserc`).

## 4. Kiểm thử bắt buộc

Bộ test Rules trên Emulator phải có ít nhất các ca sau:

- user đọc dữ liệu người khác → bị chặn
- user tự ghi `role` hoặc `usage` → bị chặn
- user đọc catalog `draft` → bị chặn
- admin đọc tủ đồ của user → bị chặn
- admin gọi `adminSetRole` → `permission-denied`
- sysadmin cuối cùng tự hạ cấp → `failed-precondition`
- tài khoản `locked` gọi bất kỳ function nào → `permission-denied`
