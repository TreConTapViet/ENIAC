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

## Số đo thêm: dài chân trong và dài lưng (tuỳ chọn, đã có trong code)

> Code: `shared/measurements.ts`, `src/components/ProfileDrawer.tsx`. Dữ liệu: [du-lieu.md](../architecture/du-lieu.md) mục 6. Quyết định: ADR-009.

| Bước | Người dùng | Hệ thống |
|---|---|---|
| 1 | Mở ảnh đại diện → "Thông tin cá nhân", kéo tới "Số đo thêm (không bắt buộc, cm)" | Hiện hai ô kèm hướng dẫn đo; ô trống nghĩa là chưa đo |
| 2 | Nhập **Dài chân trong**: từ đáy quần (háng) thẳng xuống mắt cá chân, đo phía trong chân (35–120 cm) | Nhận cả `76,5` lẫn `76.5`, làm tròn 0,5 cm |
| 3 | Nhập **Dài lưng**: từ đốt xương cổ nổi ở gáy xuống ngang eo (30–60 cm) | Ngoài khoảng thì báo lỗi đỏ dưới ô và khoá nút Lưu, không tự sửa số |
| 4 | Bấm "Lưu thay đổi" | Lưu trên máy ngay; tài khoản đã xác thực email thì lưu lên Firestore |
| 5 | (Tuỳ chọn) Xoá trống một ô rồi Lưu | Số đo đó bị xoá cả trên máy lẫn trên mây |

Hai số này được dùng ở đâu:
- **Aura** dùng để khuyên độ dài ống quần, độ dài váy/áo và vị trí cạp cho vừa người.
- **Studio 3D** nhận dài chân trong thành `inlegCm`. Lõi 3D hiện chưa dùng số này để đổi dáng ma-nơ-canh.
- **App `/app`** không hiện hai số này. Sửa hồ sơ trong app cũng không làm mất chúng.

Khi luật Firestore chưa được cập nhật: xem [trien-khai-va-su-co.md](trien-khai-va-su-co.md), mục Xử lý sự cố.

## Ảnh toàn thân (tuỳ chọn, nhạy cảm)

1. Lần đầu tải lên, app hiện hộp đồng ý riêng, nói rõ ảnh chỉ dùng để tạo ảnh chân thực cho chính người dùng.
2. Ảnh nằm ở `users/{uid}/body/`. Chỉ chủ tài khoản đọc được; admin và sysadmin cũng không xem được.
3. Người dùng có thể xoá ảnh này bất cứ lúc nào. Xoá tài khoản cũng xoá ảnh.

## Hiện trạng code

- Hồ sơ (tên, giới tính, chiều cao, cân nặng, 3 vòng, dài chân trong, dài lưng, phong cách, ảnh đại diện) đã được lưu: trên máy ở `sw_profile_{uid}`, trên mây ở `users/{uid}` khi email đã xác thực. Xem [kien-truc.md](../architecture/kien-truc.md) mục 4.1–4.2.
- `BodyMeasurements` của studio (`src/types/studio.ts`) có thêm các số đo tay/chân chi tiết. Phần này vẫn chỉ nằm trong state React: studio tự suy từ hồ sơ mỗi lần mở.
- Chưa có `profileHistory` (Lịch sử phiên bản hồ sơ) và chưa hỏi xác nhận khi rời trang lúc chưa lưu.
