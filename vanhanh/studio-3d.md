# Vận hành: Studio ma-nơ-canh 3D

> Luồng kỹ thuật: [kien-truc.md](../architecture/kien-truc.md) mục 4.6–4.7. Quyết định: ADR-004, ADR-007 trong [quyet-dinh.md](../architecture/quyet-dinh.md).
> Phần lớn trang này **đã có trong code** (`src/components/MannequinViewport.tsx`, `src/three/`).

## Hai lớp hiển thị

| | Lớp 3D | Lớp ảnh chân thực |
|---|---|---|
| Chạy ở đâu | Trình duyệt (Three.js) | Cloud Function + model Gemini tạo ảnh |
| Tốc độ | Tức thời | Vài giây |
| Góc nhìn | Xoay mọi góc, đổi tư thế | Một góc |
| Tốn lượt AI | Không | Có (10 lượt/ngày mặc định) |
| Có trong code | Có | Chưa |

## Khi mở studio

1. App tải mô hình người `.glb` theo giới tính trong hồ sơ, rồi co giãn khung xương và cơ theo từng số đo.
2. App áp `appearance`: da hoặc chất liệu ma-nơ-canh (sứ, thạch cao, titan…), kiểu tóc, màu tóc, trang điểm.
3. Từng món của bộ đồ được mặc lên:
   - Món trong kho chung có mô hình riêng → dùng mô hình đó.
   - Món còn lại → dùng mẫu dựng sẵn theo loại, phủ màu và hoa văn từ ảnh tách nền.
4. App tính **độ vừa theo từng vùng** (chật / vừa / rộng) bằng cách so số đo cơ thể với kích thước món đồ.

## Thao tác chỉ chạy trên trình duyệt

Các thao tác sau không gọi backend và không tốn lượt AI:

- Xoay, phóng to, chọn từng khớp xương để chỉnh tư thế; chọn animation đứng hoặc đi.
- So sánh hai bộ đồ cạnh nhau.
- **AR:** xin quyền camera, đặt ma-nơ-canh vào khung cảnh thật, hoặc dùng ảnh căn phòng tải lên. Nếu bị từ chối quyền camera, app hiện hướng dẫn bật lại và cho dùng ảnh thay thế.
- Quay video xoay 360°, xuất mô hình `.glb`. File được tải thẳng về máy và không lưu lên server.

## Thao tác gọi AI

| Thao tác | Function | Kết quả |
|---|---|---|
| Gõ "đứng khoanh tay, nghiêng đầu" | `poseFromText` | Góc từng khớp → app áp vào khung xương |
| Bấm "Xem thật" | `renderRealistic` | Ảnh chân thực. Nếu bộ đồ không đổi thì dùng lại ảnh cũ, không tốn lượt |

## Khi thiết bị yếu hoặc lỗi 3D

- Mất WebGL context: app tự khôi phục. Không khôi phục được thì hiện "Thiết bị không hỗ trợ 3D", nhưng vẫn cho dùng lớp ảnh chân thực.
- Máy chỉ có đồ hoạ phần mềm (software GL): app tự giảm chất lượng (bóng đổ, độ phân giải).
- Người dùng bật "giảm chuyển động": app tắt tự xoay và hiệu ứng.
