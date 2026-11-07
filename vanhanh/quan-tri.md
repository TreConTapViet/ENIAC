# Vận hành: Quản trị

> Quyền của từng vai trò: [phan-quyen.md](../architecture/phan-quyen.md). Sơ đồ: [sodokientruc.md](../architecture/sodokientruc.md) mục 9–10.
> *(chưa có trong code)*

## Quản trị viên (`admin`): đưa quần áo mới vào kho chung

| Bước | Quản trị viên | Hệ thống |
|---|---|---|
| 1 | Vào `/admin/catalog`, tải ảnh (và `model.glb` nếu có) | Storage Rules chỉ cho admin ghi vào `catalog/` |
| 2 | Nhập tên, thương hiệu, bấm Tạo | `adminCatalogCreate`: AI điền sẵn thuộc tính, tạo ảnh tách nền; trạng thái **Nháp** |
| 3 | Kiểm tra, sửa thuộc tính | `adminCatalogUpdate` |
| 4 | Thử bộ đồ trên ma-nơ-canh trước khi đăng | Bản nháp chỉ admin thấy |
| 5 | Bấm Đăng | Trạng thái **Đã đăng**; người dùng thấy ngay |
| 6 | Bấm Xoá | Trạng thái **Đã ẩn**; bộ đồ cũ của người dùng hiện "đã ngừng cung cấp"; xoá hẳn sau 30 ngày |

Mọi bước được ghi vào nhật ký quản trị (`auditLogs`) với người làm, thời gian, giá trị trước và sau.

**Kiểm tra hệ thống:** `/admin/system` hiện số người dùng, lượt AI theo ngày, tỉ lệ lỗi, chi phí ước tính. Trang này chỉ để xem.

## Người quản trị hệ thống (`sysadmin`)

| Việc | Cách làm | Hệ thống |
|---|---|---|
| Cấp vai trò admin cho nhân sự mới | `/admin/users` → chọn tài khoản → đổi vai trò | Đặt Custom Claims, thu hồi token cũ, ghi audit; người được cấp thấy menu Quản trị ngay |
| Khoá tài khoản vi phạm | `/admin/users` → Khoá | Vô hiệu tài khoản, đăng xuất mọi thiết bị của người đó |
| Tăng hạn mức cho một người | `/admin/users` → Hạn mức riêng | Ghi `quotaOverride` |
| Đổi hạn mức chung hoặc model Gemini | `/admin/system` → Cấu hình | Ghi `config/quotas`, `config/models`; có hiệu lực ở lần gọi kế tiếp, không cần deploy |
| Khôi phục món đồ admin lỡ xoá | `/admin/catalog` → bộ lọc Đã ẩn → Khôi phục | Về trạng thái Nháp |

## Tạo sysadmin đầu tiên

Chỉ làm một lần, trên máy người có quyền Owner của project Firebase:

```
node scripts/grant-role.mjs <email> sysadmin
```

Người đó đăng xuất rồi đăng nhập lại. Từ đó trở đi, mọi việc cấp quyền làm qua giao diện.

## Điều quản trị **không** làm được

- Xem ảnh, tủ đồ, số đo hay hội thoại của người dùng.
- Sửa hoặc xoá nhật ký quản trị.
- Hạ vai trò sysadmin cuối cùng.
