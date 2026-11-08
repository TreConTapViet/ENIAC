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

| `m_top_black_tee.webp` | Áo phông đen cổ tròn basic | [Pexels](https://www.pexels.com/photo/a-black-shirt-hanging-on-the-wall-8532616/) | Hanna Pad | Pexels License |
| `m_top_linen_mandarin_shirt.webp` | Sơ mi linen trắng cổ tàu | [Pexels](https://www.pexels.com/photo/shirt-on-hanger-on-branch-22441292/) | dayong tien | Pexels License |
| `m_outer_tan_blazer.webp` | Blazer màu be dáng suông | [Pexels](https://www.pexels.com/photo/photograph-of-a-jacket-on-a-wooden-hanger-6909817/) | Roger Aribau Gisbert | Pexels License |
| `m_top_white_buttondown.webp`, `m_bottom_grey_flannel_trousers.webp`, `m_outer_grey_check_overcoat.webp` | Sơ mi trắng, quần flannel xám, măng tô caro | [Unsplash](https://unsplash.com/photos/HF0O7lhhMBU) | Benjamin R. (@dapperprofessional) | Unsplash License |
| `m_top_grey_pattern_shirt.webp`, `m_bottom_cobalt_check_trousers.webp` | Sơ mi xám hoạ tiết, quần cobalt kẻ caro | [Unsplash](https://unsplash.com/photos/MuhOKvEYE9g) | Benjamin R. | Unsplash License |
| `m_outer_navy_pinstripe_blazer.webp`, `m_bottom_navy_pinstripe_trousers.webp`, `m_outer_teal_check_blazer.webp` | Blazer + quần navy kẻ sọc, blazer xanh lục kẻ ô | [Unsplash](https://unsplash.com/photos/41UXKQIzhQA) | Benjamin R. | Unsplash License |
| `m_outer_blue_linen_blazer.webp` | Blazer linen xanh dương | [Unsplash](https://unsplash.com/photos/Hh-bzs_uhbk) | Benjamin R. | Unsplash License |
| `m_bottom_blue_wool_check_trousers.webp` | Quần len xanh kẻ ô | [Unsplash](https://unsplash.com/photos/btv3BferYeU) | Benjamin R. | Unsplash License |
| `m_outer_camel_blazer.webp` | Blazer màu lạc đà | [Unsplash](https://unsplash.com/photos/ItqFmSxKnIg) | Benjamin R. | Unsplash License |
| `m_top_blue_oxford.webp`, `m_top_navy_vneck_knit.webp`, `m_bottom_houndstooth_trousers.webp` | Sơ mi oxford xanh, áo len cổ tim, quần houndstooth | [Unsplash](https://unsplash.com/photos/p8OqZKJCMS0) | Benjamin R. | Unsplash License |
| `m_bottom_beige_chinos.webp` | Quần chinos be | [Unsplash](https://unsplash.com/photos/lBi04ECUJfw) | saeed karimi | Unsplash License |

Các file `.webp` (bổ sung 2026-11) đã được cắt nền bằng `rembg` (model `isnet-general-use`, ảnh rách nền chạy lại bằng `u2net`), cắt sát món đồ và đặt giữa khung 520×620 nền trong suốt giống ảnh đồ nữ; nhiều ảnh được cắt từ một ảnh trải phẳng cả bộ suit.

Ảnh Unsplash ghi theo mã ảnh đọc được từ địa chỉ `https://images.unsplash.com/<mã>`.

## Đang chờ bổ sung

Hiện có 8 áo, 7 áo khoác và 10 quần nam, nghiêng về đồ lịch sự (Công sở, Old Money, Thanh lịch, Preppy, Hàn Quốc). Ảnh miễn phí gần như không có đồ đường phố/thể thao chụp riêng, nên phần còn lại sẽ được tạo bằng Gemini ngay khi project của `GEMINI_API_KEY` bật thanh toán (thử lại ngày 2026-11-08 vẫn báo 429: gói miễn phí có hạn mức tạo ảnh bằng 0). Ảnh tạo xong cũng đi qua bước cắt nền ở trên.

Danh sách cần tạo (theo gu ảnh tham khảo: áo khoác Harrington/chore tông đất, jeans ống rộng wash bạc):

- **Workwear / Cổ điển:** áo khoác chore canvas nâu cổ nhung, áo khoác Harrington be khoá kéo, quần jeans ống rộng wash xám, quần kaki dày nâu.
- **City Boy:** áo khoác Harrington xanh rêu, quần ống rộng màu kem.
- **Đường phố:** hoodie xám trơn, quần cargo đen, jeans baggy xanh vừa.
- **Thể thao:** polo thể thao trắng, áo khoác track navy, quần jogger xám, quần short thể thao đen.
- **Techwear / Gorpcore:** áo khoác gió đen, áo fleece xanh rêu, quần cargo kỹ thuật đen, quần dù leo núi be.
