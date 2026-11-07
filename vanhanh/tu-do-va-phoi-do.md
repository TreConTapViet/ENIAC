# Vận hành: Tủ đồ và phối đồ

> Luồng kỹ thuật: [kien-truc.md](../architecture/kien-truc.md) mục 4.3–4.5. Sơ đồ: [sodokientruc.md](../architecture/sodokientruc.md) mục 7–8. Hạn mức: [logic-he-thong.md](../architecture/logic-he-thong.md) mục 8.

## Tải quần áo vào tủ

| Bước | Người dùng thấy | Hệ thống làm |
|---|---|---|
| 1 | Chọn hoặc chụp ảnh | Kiểm tra định dạng, nén ảnh về 1024px |
| 2 | Thẻ món đồ "Đang tải lên" | Tạo `wardrobe/{id}` → upload Storage |
| 3 | "Đang phân tích" | `analyzeGarment`: kiểm tra quyền, trừ 1 lượt, gửi ảnh cho Gemini |
| 4 | Thẻ hiện ảnh tách nền, loại, màu, chất liệu | Kết quả hợp lệ → ghi thuộc tính, tạo `cutout` và `thumb` |
| 5 | Có thể sửa thuộc tính AI nhận sai | Ghi vào `userEdits`, giữ nguyên kết quả gốc của AI |

Một ảnh có nhiều món (ví dụ ảnh cả bộ) được tách thành nhiều món riêng. Code hiện tại đã làm được việc này qua `/api/extract-garments`.

**Khi lỗi:** thẻ hiện "Không nhận diện được" kèm nút Thử lại, và lượt dùng được hoàn lại. Nếu đã hết lượt trong ngày, app báo thời điểm lượt được làm mới (00:00).

## Gợi ý phối đồ

| Bước | Người dùng | Hệ thống |
|---|---|---|
| 1 | Chọn dịp, phong cách hoặc xu hướng (ví dụ Quiet Luxury), có dùng kho chung không | |
| 2 | (tuỳ chọn) Bấm "Theo thời tiết" | `weatherForecast` lấy thời tiết thật theo vị trí, cache 30 phút |
| 3 | Bấm Gợi ý | `suggestOutfits` đọc hồ sơ + tủ đồ + kho chung → Gemini → **loại các bộ tham chiếu món không tồn tại hoặc thiếu áo/quần** |
| 4 | Thấy các thẻ bộ đồ kèm lý do phối | Bộ đồ ghi với `saved: false`; không lưu thì tự dọn sau 7 ngày |
| 5 | Bấm "Thử trên ma-nơ-canh" hoặc "Lưu" | Mở studio với bộ đồ đó / đặt `saved: true` |

Khi chọn một món, `colorPalette` gợi ý bảng màu phối hợp với nó. Thao tác này chỉ đọc và không ghi dữ liệu.

**Điều kiện:** tủ đồ cần ít nhất 1 áo và 1 quần (hoặc 1 váy liền). Nếu chưa đủ và không dùng kho chung, function trả `failed-precondition`, app hiện "Thêm ít nhất một áo và một quần để nhận gợi ý".

## Trợ lý AI (hỏi đáp)

1. Người dùng nhắn tin, có thể kèm ảnh. App gọi `chatAssistant`.
2. Function gửi cho Gemini: hồ sơ, danh sách tủ đồ dạng văn bản, vài tin nhắn gần nhất. Nội dung người dùng gõ được tách riêng khỏi chỉ dẫn hệ thống để chống prompt injection.
3. Câu trả lời nhắc đến món nào thì hiện thẻ món đó. Hội thoại được lưu và xem lại được trong Lịch sử.

*(chưa có trong code: hiện chỉ có `ai-stylist` gợi ý theo xu hướng, chưa có hội thoại nhiều lượt)*
