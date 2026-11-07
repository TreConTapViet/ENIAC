# Vận hành Smart-wardrobe

> Thư mục này trả lời câu hỏi **"hệ thống chạy như thế nào"**: theo từng hành trình, người dùng làm gì, hệ thống làm gì ở phía sau, và khi có sự cố thì xử lý ra sao.
> Thiết kế kỹ thuật (thành phần, dữ liệu, quyền) nằm ở [../architecture/](../architecture/kien-truc.md). Ở đây chỉ dẫn link, không chép lại.
>
> Cập nhật lần cuối: 2026-11-07. Mô tả hệ thống đích; phần nào code chưa có thì được ghi rõ là *(chưa có trong code)*.

## Các file

| File | Hành trình |
|---|---|
| [dang-nhap.md](dang-nhap.md) | Đăng ký, đăng nhập, quên mật khẩu, đăng xuất |
| [ho-so-nguoi-dung.md](ho-so-nguoi-dung.md) | Nhập và cập nhật hồ sơ cơ thể |
| [tu-do-va-phoi-do.md](tu-do-va-phoi-do.md) | Tải đồ vào tủ, gợi ý phối đồ, trợ lý AI, thời tiết, bảng màu |
| [studio-3d.md](studio-3d.md) | Ma-nơ-canh 3D, tư thế, AR, ảnh chân thực |
| [quan-tri.md](quan-tri.md) | Công việc của quản trị viên và người quản trị hệ thống |
| [trien-khai-va-su-co.md](trien-khai-va-su-co.md) | Chạy, triển khai, giám sát, xử lý sự cố |

## Một vòng sử dụng điển hình

```
Đăng ký ─► xác thực email ─► nhập hồ sơ cơ thể ─► (vào studio)
   │
   ├─► chụp/tải ảnh quần áo ─► AI nhận diện ─► món đồ vào tủ
   ├─► chọn dịp + thời tiết ─► AI gợi ý bộ đồ ─► mở trên ma-nơ-canh 3D
   │                                              └─► "Xem thật" ─► ảnh AI
   └─► lưu bộ đồ ─► xem lại trong Lịch sử
```

Ở mỗi bước, hệ thống tuân theo các nguyên tắc sau:

1. **Trình duyệt chỉ đọc/ghi dữ liệu của chính người dùng**, có Security Rules canh giữ.
2. **Mọi việc cần AI** đi qua Cloud Functions: kiểm tra quyền → trừ hạn mức → gọi Gemini → kiểm tra kết quả → ghi Firestore.
3. **Giao diện tự cập nhật** khi Firestore đổi (`onSnapshot`). Người dùng có thể rời trang trong lúc AI chạy, quay lại vẫn thấy đúng trạng thái.
4. **Lỗi luôn hiện câu tiếng Việt dễ hiểu** kèm nút thử lại ([logic-he-thong.md](../architecture/logic-he-thong.md) mục 7).
