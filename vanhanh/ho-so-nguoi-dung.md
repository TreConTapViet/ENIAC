# Vận hành: Hồ sơ người dùng

> Cấu trúc dữ liệu: [du-lieu.md](../architecture/du-lieu.md) (`users/{uid}.body`, `appearance`). Luật kiểm tra: [logic-he-thong.md](../architecture/logic-he-thong.md) mục 3.
> Bản trước của file này mô tả hồ sơ kiểu mạng xã hội (liên hệ, sở thích chủ đề, theo dõi hành vi) đồng bộ qua WebSocket server. Bản đó đã được thay vì không khớp mục đích phối đồ và kiến trúc chỉ dùng Firebase (ADR-002).

## Hồ sơ dùng để làm gì

Hồ sơ là **đầu vào chung** cho mọi phần khác:

| Phần dùng | Lấy gì từ hồ sơ |
|---|---|
| Ma-nơ-canh 3D | Toàn bộ số đo → co giãn cơ thể; `appearance` → da, tóc, trang điểm |
| Gợi ý phối đồ, trợ lý AI | Giới tính, chiều cao, cân nặng, số đo chính, phong cách ưa thích |
| Đánh giá độ vừa (`FitZoneReport`) | Số đo từng vùng so với kích thước món đồ |
| Ảnh chân thực | Mô tả cơ thể, ảnh toàn thân (nếu người dùng đồng ý cung cấp) |

## Luồng nhập hồ sơ lần đầu

| Bước | Người dùng | Hệ thống |
|---|---|---|
| 1 | Đăng nhập lần đầu | Route guard đưa về Hồ sơ vì `profileCompleted = false` |
| 2 | Nhập giới tính, chiều cao, cân nặng (bắt buộc), các số đo khác (tuỳ chọn) | Ma-nơ-canh xem trước bên cạnh đổi theo từng ô nhập (chạy trên trình duyệt) |
| 3 | Chọn phong cách ưa thích, màu tránh | |
| 4 | Bấm Lưu | Kiểm tra khoảng giá trị → ghi `users/{uid}` → Rules kiểm tra lại và chỉ cho ghi trường hồ sơ |
| 5 | | Lưu bản chụp vào `profileHistory`; `profileCompleted = true`; mở khoá các trang khác |

## Cập nhật về sau

- Sửa trong Hồ sơ hoặc trực tiếp trong tab `body` của studio. Cả hai nơi ghi cùng một document.
- Rời trang khi chưa lưu thì app hỏi xác nhận.
- Các tab hoặc thiết bị khác đang mở nhận thay đổi ngay qua `onSnapshot`. Khi mất mạng, thay đổi được xếp hàng và tự gửi khi có mạng lại. Hệ thống không cần WebSocket.
- Mỗi lần lưu thêm một phiên bản vào Lịch sử (giữ tối đa 50). Người dùng có thể khôi phục phiên bản cũ.

## Ảnh toàn thân (tuỳ chọn, nhạy cảm)

1. Lần đầu tải lên, app hiện hộp đồng ý riêng, nói rõ ảnh chỉ dùng để tạo ảnh chân thực cho chính người dùng.
2. Ảnh nằm ở `users/{uid}/body/`. Chỉ chủ tài khoản đọc được; admin và sysadmin cũng không xem được.
3. Người dùng có thể xoá ảnh này bất cứ lúc nào. Xoá tài khoản cũng xoá ảnh.

## Hiện trạng code

`BodyMeasurements` trong `src/types/studio.ts` đã có đủ số đo và tuỳ chỉnh ngoại hình, nhưng chỉ nằm trong state React và mất khi tải lại trang. Việc lưu vào Firestore là bước 2 trong [lộ trình](../architecture/hien-trang-code.md#4-thứ-tự-chuyển-đề-xuất).
