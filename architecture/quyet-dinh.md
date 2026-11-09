# Nhật ký quyết định kiến trúc (ADR)

> Mỗi quyết định ảnh hưởng đến kiến trúc được ghi một mục ở đây: bối cảnh, quyết định, hệ quả, và ai quyết định.
> Không xoá mục cũ. Khi đổi ý thì thêm mục mới và ghi "Thay thế ADR-xxx" vào mục cũ.
>
> Cập nhật lần cuối: 2026-11-07.

| Mã | Quyết định | Trạng thái | Người quyết định |
|---|---|---|---|
| ADR-001 | Frontend dùng HTML + TailwindCSS + ReactJS (Vite) | Chấp nhận | Người dùng (Vite: Claude) |
| ADR-002 | Backend chỉ dùng Firebase, không có máy chủ riêng | Chấp nhận | Người dùng |
| ADR-003 | Chỉ Cloud Functions gọi Gemini; key nằm trong Secret Manager | Chấp nhận | Claude |
| ADR-004 | Ma-nơ-canh hai lớp: 3D + ảnh chân thực do AI tạo | Chấp nhận | Người dùng |
| ADR-005 | Phân quyền 3 vai trò bằng Custom Claims | Chấp nhận | Người dùng (vai trò), Claude (cơ chế) |
| ADR-006 | Xoá trong kho chung là ẩn 30 ngày rồi mới xoá hẳn | Chấp nhận | Claude |
| ADR-007 | 3D dùng Three.js thuần thay cho React Three Fiber | Chấp nhận | Theo code đã có |
| ADR-008 | Gộp app Huhu thành PWA ở `/app`, dùng chung một Firebase project với web | Chấp nhận | Người dùng |

---

### ADR-002: Backend chỉ dùng Firebase

- **Bối cảnh:** Code sinh từ AI Studio chạy máy chủ Express (`server.ts`) để gọi Gemini, với key nằm trong `.env.local` của server. Bản cũ của tài liệu hồ sơ người dùng còn mô tả thêm một WebSocket server.
- **Quyết định:** Toàn bộ backend dùng các dịch vụ Firebase: Auth, Firestore, Storage, Cloud Functions, Hosting, App Check và Secret Manager. Đồng bộ thời gian thực dùng Firestore `onSnapshot` và offline persistence.
- **Hệ quả:**
  - Không cần vận hành máy chủ riêng.
  - Phân quyền tập trung ở Rules.
  - Không tự cài đặt được giao thức WebSocket tuỳ biến. Hệ thống cũng không cần đến nó.
  - `server.ts` và `express` sẽ bị gỡ dần theo lộ trình ở [hien-trang-code.md](hien-trang-code.md). Key chuyển từ `.env.local` sang Secret Manager.

### ADR-003: Chỉ Cloud Functions gọi Gemini

- **Bối cảnh:** Gọi Gemini từ trình duyệt sẽ lộ API key, và không kiểm soát được hạn mức.
- **Quyết định:** Mọi lời gọi Gemini đi qua callable functions. Key được nạp từ Secret Manager.
- **Hệ quả:** Mỗi tác vụ AI có thêm một bước qua function (độ trễ tăng thêm khoảng vài trăm ms). Bù lại, hệ thống kiểm tra được kết quả, đếm được hạn mức và ghi được log.

### ADR-004: Ma-nơ-canh hai lớp

- **Bối cảnh:** Người dùng muốn ma-nơ-canh giống thật nhất. Dựng 3D chỉ từ ảnh chụp không cho ra vải rủ tự nhiên, và không biết được mặt sau của món đồ.
- **Quyết định:** Có hai lớp:
  - Lớp 3D (Three.js, xem ADR-007): mô hình cơ thể có morph theo số đo. Ưu tiên mô hình riêng của món đồ trong kho chung, nếu không có thì dùng mẫu dựng sẵn phủ texture.
  - Lớp ảnh chân thực: do model Gemini tạo ảnh sinh ra theo yêu cầu.
- **Hệ quả:** Lớp 3D tức thời nhưng chỉ ở mức gần đúng. Lớp ảnh chân thực mất vài giây, tốn hạn mức và chỉ xem được một góc.

### ADR-005: Phân quyền ba vai trò

- **Bối cảnh:** Ngoài người dùng còn có quản trị viên (đưa quần áo mới vào web) và người quản trị hệ thống (quyền cao hơn).
- **Quyết định:** Có ba vai trò `user` ⊂ `admin` ⊂ `sysadmin`, lưu ở Custom Claims. Chi tiết ở [phan-quyen.md](phan-quyen.md).
- **Hệ quả:** Vai trò có trong token nên Rules kiểm tra mà không cần đọc thêm document. Sau khi đổi vai trò phải làm mới token.
- **Ghi chú:** Ranh giới giữa `admin` và `sysadmin` là đề xuất của Claude. Người dùng có thể gộp lại thành một vai trò.

### ADR-007: Three.js thuần

- **Bối cảnh:** Thiết kế ban đầu chọn React Three Fiber. Code sau đó được viết bằng Three.js thuần (`src/three/`), và đã có đủ dựng người theo số đo, khung xương, AR, xuất `.glb`.
- **Quyết định:** Giữ Three.js thuần, không viết lại bằng React Three Fiber. Thay thế lựa chọn React Three Fiber trước đó.
- **Hệ quả:** Không phải viết lại phần 3D. Bù lại, React và Three.js nối với nhau thủ công qua `MannequinViewport.tsx`, nên phải tự dọn tài nguyên (dispose) khi component unmount.

### ADR-008: App PWA ở `/app`, chung Firebase với web

- **Bối cảnh:** Repo Huhu (https://github.com/quachngocnhuy2862008-prog/Huhu) là một PWA phối đồ có ma-nơ-canh. Nó dùng Firebase project riêng (`infinite-ascent-5c70r`, key nằm trong repo) và Supabase cho tủ đồ, với lược đồ khác web. Người dùng muốn web mời tải app, và dữ liệu đồng bộ khi đăng nhập cùng tài khoản.
- **Quyết định:**
  - Chép mã nguồn vào `APP/` (không dùng submodule).
  - Build với `base: '/app/'` và để `server.ts` phục vụ ở `/app`.
  - Chuyển app sang project `smart-wardrobe-79480`; bỏ Supabase.
  - Mọi đọc/ghi Firestore của app đi qua một lớp chuyển đổi tuân theo `firestore.rules` hiện có. **Không đổi luật.**
- **Hệ quả:**
  - Một tên miền, một phiên đăng nhập, một nơi lưu dữ liệu.
  - Trường riêng của app (tuổi, BMI, điểm vừa vặn…) chỉ nằm trên máy cho tới khi luật được mở rộng.
  - "Tải app" là cài PWA, không phải file APK.
  - `APP/` không có `package.json` riêng: build bằng `node_modules` ở gốc (mọi thư viện app cần đều đã có). Đổi phiên bản thư viện ở gốc thì app cũng đổi theo.
  - Đăng nhập email của app chuyển sang Firebase Auth email + mật khẩu. Bản gốc chỉ kiểm mã OTP rồi lưu trên máy, không có tài khoản thật nên không đồng bộ được.
  - Code `APP/` sửa trực tiếp trong ENIAC và không còn theo repo Huhu gốc (gốc chép từ commit `de2452f`).

### ADR-006: Xoá mềm trong kho chung

- **Bối cảnh:** Bộ đồ của người dùng có thể tham chiếu đến món đồ trong kho chung.
- **Quyết định:** "Xoá" chuyển món đồ sang `archived` (ẩn với người dùng). Sau 30 ngày function mới xoá hẳn. Trong 30 ngày đó, sysadmin có thể khôi phục hoặc xoá hẳn ngay.
- **Hệ quả:** Lỡ tay xoá vẫn khôi phục được. Bộ đồ cũ hiện "đã ngừng cung cấp" thay vì bị lỗi.
