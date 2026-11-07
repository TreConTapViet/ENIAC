# Nguồn ảnh trong danh mục

Mọi ảnh trong `public/assets/catalog/` đều phải được ghi ở đây kèm nguồn và giấy phép. Thông tin này cũng có trong trường `credit` của từng món trong `src/catalog/garments.*.ts`, và test `scripts/catalog.test.ts` kiểm tra trường này.

## Quy tắc chọn ảnh

- Chỉ dùng ảnh **Unsplash** hoặc **Pexels** loại miễn phí. Không dùng ảnh Unsplash+ (có dấu "+", giấy phép trả phí).
- Ảnh phải chụp riêng món đồ (trải phẳng hoặc treo móc) trên nền trơn: **không có người, không có logo hay chữ nổi bật**.
- Tải ở 900 px, nén JPEG dưới **150 KB** bằng `sips` có sẵn trên macOS, rồi đặt vào `public/assets/catalog/{male,unisex}/`.
- Phần còn thiếu được tạo bằng Gemini, cùng kiểu với ảnh đồ nữ có sẵn trong `public/assets/aistudio/` (nền trắng, nhìn thẳng). Ảnh tạo bằng AI ghi nguồn là `Gemini (AI)`.

## Giấy phép

- [Unsplash License](https://unsplash.com/license): dùng miễn phí, kể cả mục đích thương mại, không bắt buộc ghi nguồn (dự án vẫn ghi). Không được gom ảnh để dựng một dịch vụ ảnh cạnh tranh.
- [Pexels License](https://www.pexels.com/license/): dùng miễn phí, không bắt buộc ghi nguồn. Không bán lại ảnh khi chưa chỉnh sửa.

## Đồ nam (`public/assets/catalog/male/`)

| File | Món | Nguồn | Tác giả | Giấy phép |
|---|---|---|---|---|
| `m_top_white_tee.jpg` | Áo phông trắng cổ tròn | [Unsplash](https://unsplash.com/photos/a-plain-white-t-shirt-hangs-on-a-wooden-hanger-8ACmRoleM24) | Avtar Singh | Unsplash License |
| `m_top_linen_shirt.jpg` | Sơ mi linen cổ trụ màu kem | [Pexels](https://www.pexels.com/photo/shirt-on-hanger-on-branch-22441297/) | (ghi trên trang ảnh) | Pexels License |
| `m_outer_white_blazer.jpg` | Blazer trắng hai hàng cúc | [Pexels](https://www.pexels.com/photo/elegant-white-double-breasted-suit-jacket-39483049/) | (ghi trên trang ảnh) | Pexels License |
| `m_bottom_jeans_mid.jpg` | Quần jeans slim xanh vừa | Unsplash, ảnh `photo-1714143136372-ddaf8b606da7` | [TuanAnh Blue](https://unsplash.com/@blueeyeaa) | Unsplash License |
| `m_bottom_jeans_dark.jpg` | Quần jeans slim xanh đậm | Unsplash, ảnh `photo-1714143164072-7646ef5cb24d` | [TuanAnh Blue](https://unsplash.com/@blueeyeaa) | Unsplash License |
| `m_bottom_jeans_black.jpg` | Quần jeans đen slim | Unsplash, ảnh `photo-1718252540511-e958742e4165` | [TuanAnh Blue](https://unsplash.com/@blueeyeaa) | Unsplash License |
| `m_bottom_jeans_folded.jpg` | Quần jeans xanh sáng ống đứng | Unsplash, ảnh `photo-1714143136367-7bb68f3f0669` | [TuanAnh Blue](https://unsplash.com/@blueeyeaa) | Unsplash License |

Ảnh Unsplash ghi theo mã ảnh đọc được từ địa chỉ `https://images.unsplash.com/<mã>`.

## Đang chờ bổ sung

Hiện có 2 áo, 1 áo khoác và 4 quần. Để đạt **ít nhất 10 áo và 10 quần nam**, phần còn lại sẽ được tạo bằng Gemini ngay khi project của `GEMINI_API_KEY` bật thanh toán. Gói miễn phí có hạn mức tạo ảnh bằng 0.

Danh sách cần tạo:

- **Áo:** áo phông đen, sơ mi Oxford xanh nhạt, polo dệt kim navy, sơ mi sọc xanh trắng, áo len cổ tròn màu kem, hoodie xám, sơ mi flannel caro đỏ, áo len cổ lọ đen, sơ mi cổ Cuba.
- **Quần:** chinos be, quần âu xám xếp ly, cargo xanh rêu, jogger xám, short kaki, quần ống rộng đen, short thể thao navy.
- **Áo khoác:** áo khoác denim, áo khoác gió đen, blazer navy.

## Ảnh đồ nữ có sẵn (`public/assets/aistudio/`, `public/assets/cropped/`)

Ảnh trong hai thư mục này có từ bản AI Studio của dự án. Giai đoạn dọn dẹp (Giai đoạn 10) sẽ rà lại: ảnh nào không rõ nguồn hoặc không còn dùng thì xoá.
