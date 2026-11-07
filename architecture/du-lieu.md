# Mô hình dữ liệu Smart-wardrobe

> Nguồn chuẩn duy nhất cho cấu trúc Firestore và Storage. [kien-truc.md](kien-truc.md) mô tả luồng, [phan-quyen.md](phan-quyen.md) mô tả ai được đọc/ghi gì.
>
> Cập nhật lần cuối: 2026-11-07. Trạng thái: thiết kế, chưa có code.

## 1. Nguyên tắc

- **Dữ liệu cá nhân nằm dưới `users/{uid}`.** Nhờ đó Security Rules chỉ cần so `uid`, và việc xoá tài khoản chỉ là xoá một nhánh.
- **Dữ liệu dùng chung nằm ở collection gốc**, gồm `catalog`, `config`, `auditLogs`. Phần này do quản trị quản lý.
- **Trường do hệ thống ghi** (kết quả AI, `role`, `status`, `usage`, `renders`) không bao giờ được ghi từ client. Rules liệt kê rõ danh sách trường mà client được phép ghi.
- Mọi document đều có `createdAt` và `updatedAt` (lấy từ `serverTimestamp()`).
- Ảnh không lưu trong Firestore. Firestore chỉ giữ đường dẫn Storage.

## 2. Firestore

```
users/{uid}
  ├─ profileHistory/{versionId}
  ├─ wardrobe/{itemId}
  ├─ outfits/{outfitId}
  ├─ conversations/{convId}
  │    └─ messages/{msgId}
  └─ aiRequests/{requestId}          (khoá chống gọi trùng, tự xoá sau 24h bằng TTL)
catalog/{catalogItemId}
config/quotas                        (hạn mức mặc định)
config/models                        (tên model Gemini đang dùng)
auditLogs/{logId}
```

### `users/{uid}`

| Trường | Kiểu | Ai ghi | Ghi chú |
|---|---|---|---|
| `email`, `displayName` | string | client | |
| `role` | `"user" \| "admin" \| "sysadmin"` | Function | Bản sao để hiển thị; quyền thật nằm ở Custom Claims |
| `status` | `"active" \| "locked"` | Function | |
| `profileCompleted` | bool | client | Rules kiểm tra đủ trường bắt buộc |
| `body` | map | client | `gender`, `heightCm`, `weightKg`, `bodyShape`, `chestCm?`, `waistCm?`, `hipCm?` |
| `style` | map | client | `preferredStyles[]`, `avoidColors[]`, `fitPreference` |
| `bodyPhotoPath?` | string | client | `users/{uid}/body/...` |
| `preferences` | map | client | `theme`, `language`, `reducedMotion` |
| `usage` | map | Function | `date`, `analyzeGarment`, `chatAssistant`, `suggestOutfits`, `renderRealistic` |
| `quotaOverride?` | map | Function (sysadmin) | Hạn mức riêng cho người này |

### `users/{uid}/wardrobe/{itemId}`

| Trường | Kiểu | Ai ghi |
|---|---|---|
| `status` | `"uploading" \| "analyzing" \| "ready" \| "error"` | client tạo `uploading`, Function cập nhật |
| `originalPath`, `cutoutPath`, `thumbPath` | string | client ghi `originalPath`, Function ghi phần còn lại |
| `attributes` | map: `category`, `slot` (`top`/`bottom`/`dress`/`outer`/`shoes`/`accessory`), `primaryColor`, `secondaryColors[]`, `pattern`, `material`, `fit`, `seasons[]`, `formality` (1–5) | Function |
| `userEdits?` | map, cùng cấu trúc với `attributes` | client (người dùng sửa lại kết quả AI) |
| `errorCode?` | string | Function |

Giá trị hiển thị được tính bằng `userEdits ?? attributes`. Cách này giữ lại kết quả gốc của AI để còn so sánh.

### `users/{uid}/outfits/{outfitId}`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `items` | map `slot → { source: "wardrobe" \| "catalog", id }` | Một bộ đồ có thể trộn đồ của mình với đồ trong kho chung |
| `source` | `"ai" \| "user"` | |
| `context?` | map: `occasion`, `weather` | |
| `reason?` | string | Lý do AI đưa ra khi gợi ý bộ này |
| `itemsHash` | string | Hash của `items`, dùng để biết ảnh render cũ còn đúng không |
| `renders` | array `{ path, itemsHash, createdAt }` | Chỉ Function ghi |
| `saved` | bool | `true` khi người dùng bấm lưu; bộ AI gợi ý mà chưa lưu sẽ bị dọn sau 7 ngày |

### `users/{uid}/conversations/{convId}` và `messages/{msgId}`

- Conversation gồm `title`, `lastMessageAt`.
- Message gồm `role` (`user`/`model`), `text`, `imagePath?`, `itemRefs[]` (`{source, id}`), `createdAt`.
- Chỉ Function ghi message. Client chỉ đọc, và được xoá cả cuộc hội thoại.

### `catalog/{catalogItemId}` (kho đồ chung)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `status` | `"draft" \| "published" \| "archived"` | Người dùng chỉ thấy `published` |
| `name`, `brand?`, `description?` | string | |
| `imagePath`, `cutoutPath`, `thumbPath` | string | `catalog/{id}/...` |
| `model3dPath?` | string | Mô hình glTF riêng của món đồ, nếu có. Lớp 3D ưu tiên dùng mô hình này thay cho mẫu chung, nên hiển thị giống thật hơn |
| `attributes` | map, cùng schema với wardrobe | |
| `tags[]` | string | |
| `createdBy`, `updatedBy` | uid | |
| `archivedAt?` | timestamp | Sau 30 ngày ở trạng thái `archived`, món đồ bị xoá hẳn |

### `auditLogs/{logId}`

`actorUid`, `actorRole`, `action` (ví dụ `catalog.create`, `catalog.archive`, `user.lock`, `user.setRole`, `quota.update`), `targetType`, `targetId`, `before?`, `after?`, `createdAt`. Chỉ Function được ghi. Không ai được sửa hay xoá, kể cả sysadmin.

## 3. Storage

```
users/{uid}/body/{file}                         ảnh toàn thân (tuỳ chọn, nhạy cảm)
users/{uid}/wardrobe/{itemId}/original.jpg      client tải lên
users/{uid}/wardrobe/{itemId}/cutout.png        Function tạo
users/{uid}/wardrobe/{itemId}/thumb.webp        Function tạo (256px)
users/{uid}/chat/{convId}/{file}                ảnh gửi kèm tin nhắn
users/{uid}/renders/{outfitId}/{renderId}.png   Function tạo
catalog/{catalogItemId}/original.jpg            admin tải lên
catalog/{catalogItemId}/cutout.png, thumb.webp  Function tạo
catalog/{catalogItemId}/model.glb               admin tải lên (tuỳ chọn)
```

## 4. Chỉ mục (composite index)

| Collection | Trường |
|---|---|
| `wardrobe` | `status` ASC, `createdAt` DESC |
| `wardrobe` | `attributes.slot` ASC, `createdAt` DESC |
| `outfits` | `saved` ASC, `createdAt` DESC |
| `catalog` | `status` ASC, `attributes.slot` ASC, `updatedAt` DESC |
| `auditLogs` | `targetType` ASC, `createdAt` DESC |

TTL: `aiRequests.expireAt`.

## 5. Dữ liệu tham chiếu chéo

- Khi một món trong `catalog` bị chuyển sang `archived`, các bộ đồ đang dùng nó vẫn giữ tham chiếu. Giao diện hiện "Món đồ đã ngừng cung cấp", và ma-nơ-canh bỏ trống vị trí đó.
- Khi người dùng xoá một món trong `wardrobe`, trigger `onWardrobeDelete` xoá ảnh trong Storage. Các bộ đồ đang dùng món đó được đánh dấu `broken: true` và không bị xoá.
