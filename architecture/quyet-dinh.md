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

---

### ADR-002: Backend chỉ dùng Firebase

- **Bối cảnh:** [hosonguoidung.md](../vanhanh/hosonguoidung.md) và README (sinh từ AI Studio) mô tả máy chủ Node.js/Express với WebSocket, và đặt `GEMINI_API_KEY` trong `.env.local` của app Vite.
- **Quyết định:** Toàn bộ backend dùng các dịch vụ Firebase: Auth, Firestore, Storage, Cloud Functions, Hosting, App Check và Secret Manager. Đồng bộ thời gian thực dùng Firestore `onSnapshot` và offline persistence.
- **Hệ quả:**
  - Không cần vận hành máy chủ riêng.
  - Phân quyền tập trung ở Rules.
  - Không tự cài đặt được giao thức WebSocket tuỳ biến. Hệ thống cũng không cần đến nó.
  - API key không được đặt ở frontend. Cách đặt key trong `.env.local` của README phải bỏ khi chuyển sang kiến trúc này.

### ADR-003: Chỉ Cloud Functions gọi Gemini

- **Bối cảnh:** Gọi Gemini từ trình duyệt sẽ lộ API key, và không kiểm soát được hạn mức.
- **Quyết định:** Mọi lời gọi Gemini đi qua callable functions. Key được nạp từ Secret Manager.
- **Hệ quả:** Mỗi tác vụ AI có thêm một bước qua function (độ trễ tăng thêm khoảng vài trăm ms). Bù lại, hệ thống kiểm tra được kết quả, đếm được hạn mức và ghi được log.

### ADR-004: Ma-nơ-canh hai lớp

- **Bối cảnh:** Người dùng muốn ma-nơ-canh giống thật nhất. Dựng 3D chỉ từ ảnh chụp không cho ra vải rủ tự nhiên, và không biết được mặt sau của món đồ.
- **Quyết định:** Có hai lớp:
  - Lớp 3D (React Three Fiber): mô hình cơ thể có morph theo số đo. Ưu tiên mô hình riêng của món đồ trong kho chung, nếu không có thì dùng mẫu dựng sẵn phủ texture.
  - Lớp ảnh chân thực: do model Gemini tạo ảnh sinh ra theo yêu cầu.
- **Hệ quả:** Lớp 3D tức thời nhưng chỉ ở mức gần đúng. Lớp ảnh chân thực mất vài giây, tốn hạn mức và chỉ xem được một góc.

### ADR-005: Phân quyền ba vai trò

- **Bối cảnh:** Ngoài người dùng còn có quản trị viên (đưa quần áo mới vào web) và người quản trị hệ thống (quyền cao hơn).
- **Quyết định:** Có ba vai trò `user` ⊂ `admin` ⊂ `sysadmin`, lưu ở Custom Claims. Chi tiết ở [phan-quyen.md](phan-quyen.md).
- **Hệ quả:** Vai trò có trong token nên Rules kiểm tra mà không cần đọc thêm document. Sau khi đổi vai trò phải làm mới token.
- **Ghi chú:** Ranh giới giữa `admin` và `sysadmin` là đề xuất của Claude. Người dùng có thể gộp lại thành một vai trò.

### ADR-006: Xoá mềm trong kho chung

- **Bối cảnh:** Bộ đồ của người dùng có thể tham chiếu đến món đồ trong kho chung.
- **Quyết định:** "Xoá" chuyển món đồ sang `archived` (ẩn với người dùng). Sau 30 ngày function mới xoá hẳn. Trong 30 ngày đó, sysadmin có thể khôi phục hoặc xoá hẳn ngay.
- **Hệ quả:** Lỡ tay xoá vẫn khôi phục được. Bộ đồ cũ hiện "đã ngừng cung cấp" thay vì bị lỗi.
