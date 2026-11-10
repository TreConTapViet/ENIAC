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
| `body` | map | client | Theo `BodyMeasurements` trong `src/types/studio.ts`. Bắt buộc: `genderProfile`, `heightCm`, `weightKg`. Tuỳ chọn: `shoulderCm`, `chestCm`, `waistCm`, `hipCm`, `inlegCm`, `bicepCm`, `forearmCm`, `thighCm`, `calfCm` |
| `appearance` | map | client | Phần trang trí của ma-nơ-canh: `surfaceId`, `hairstyleId`, `hairColorHex`, trang điểm. Tách khỏi `body` vì không ảnh hưởng đến gợi ý phối đồ |
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

## 6. Số đo trong `users/{uid}` theo code hiện tại

> Mục 2 mô tả bản thiết kế đích (số đo gom trong map `body`). Code hiện tại lưu số đo thành trường phẳng; danh sách trường được phép nằm ở `profileFields()` trong [`firestore.rules`](../firestore.rules).

| Trường | Khoảng (cm / kg) | Bắt buộc | Ghi chú |
|---|---|---|---|
| `heightCm` | 100–250 | Không (app tự suy nếu thiếu) | |
| `weightKg` | 25–250 | Không | |
| `bustCm`, `waistCm`, `hipCm` | 40–200, 35–200, 40–200 | Không | |
| `inseamCm` | 35–120 | **Không** | Dài chân trong: đáy quần → mắt cá chân. Studio dùng làm `inlegCm` |
| `backLengthCm` | 30–60 | **Không** | Dài lưng: đốt sống cổ nổi ở gáy → eo |

- `inseamCm` và `backLengthCm` có thêm từ 2026-11-10 (ADR-009). Khoảng giá trị khai báo ở ba nơi phải khớp nhau: `shared/measurements.ts`, `firestore.rules` (`optionalNumberIn`) và `firebase-blueprint.json`. Test `scripts/measurements.test.ts` kiểm tra điều đó.
- Trên máy, `null` nghĩa là người dùng đã xoá số đo, còn không có trường nghĩa là chưa nhập bao giờ. Trên mây, xoá là `deleteField()`.
- Khoá localStorage `sw_measures_local_only_{uid}` = `1`: lần ghi gần nhất bị luật Firestore cũ từ chối hai trường này, nên bản trên máy là bản đúng.

## 7. App PWA (`/app`) dùng chung dữ liệu với web

> Viết theo **code hiện tại** và `firestore.rules`, không theo bản thiết kế đích ở mục 2. Luồng xem [kien-truc.md](kien-truc.md) mục 4.12.

Collection thật mà cả web lẫn app dùng:

| Đường dẫn | Ghi chú |
|---|---|
| `users/{uid}` | Hồ sơ; chỉ nhận các trường trong `profileFields()` của `firestore.rules` |
| `wardrobeItems/{itemId}` | Collection **gốc**, có `userId`; truy vấn phải lọc `where('userId', '==', uid)`. Id `item_…` |
| `savedOutfits/{outfitId}` | Collection gốc, có `userId`. App **chỉ đọc**, không tạo hay sửa |

### 7.1 Hồ sơ: app ↔ `users/{uid}`

| App (Huhu) | Web / Firestore | Chuyển đổi |
|---|---|---|
| `name` | `displayName` | Cắt 1–80 ký tự |
| `gender` `male` / `female` | `gender` `Nam` / `Nữ` | Hai chiều; đọc qua `normalizeGender` |
| `height_cm`, `weight_kg` | `heightCm`, `weightKg` | Giữ số |
| `bust_cm`, `waist_cm`, `hip_cm` | `bustCm`, `waistCm`, `hipCm` | Giữ số; trống thì không ghi |
| `avatar_url` | `avatarUrl` | Chỉ ghi nếu hợp lệ theo `isValidImageRef` (≤ ~350 KB) |
| `email` | `email` | Chỉ đọc, lấy từ Firebase Auth |
| `age`, `bmi`, `body_type`, `occasion`, `auth_provider`, `otp_verified` | — | **Chỉ trên máy** (localStorage `smart_wardrobe_*`) |
| — | `inseamCm`, `backLengthCm` | App không đọc, không ghi; giá trị web nhập được giữ nguyên trên mây |

Ghi bằng `updateDoc(ref, { ...thayĐổi, updatedAt: serverTimestamp() })`, và chỉ khi tài liệu đã tồn tại. Các trường của web mà app không biết (`favoriteStyles`, `accentColor`, `themeMode`…) được giữ nguyên.

- Số đo ngoài khoảng luật cho phép (cao 100–250, nặng 25–250, ngực 40–200, eo 35–200, hông 40–200) thì **không ghi** (giữ giá trị cũ trên mây), không ép về khoảng hợp lệ.
- Khi đọc: web chưa có số đo thì lấy hồ sơ trên máy cùng tài khoản. Nếu cả hai đều không có thì dùng mặc định 160 cm / 50 kg (Nữ), 170 cm / 62 kg (Nam). Đổi giới tính thì bỏ số đo 3 vòng cũ trên máy.
- Code: `APP/src/lib/webMapping.ts` (thuần, có test `scripts/webMapping.test.ts` đối chiếu trực tiếp với `firestore.rules`) và `APP/src/lib/firebase.ts`.

### 7.2 Tủ đồ: app ↔ `wardrobeItems`

| App (Huhu) | Firestore | Chuyển đổi |
|---|---|---|
| `id` | id tài liệu | Món mới tạo id `item_…` |
| `label` | `name` | 1–100 ký tự |
| `category` | `category` | `top`→`Áo`, `bottom`→`Quần`, `dress`→`Đầm & Váy liền`, `outerwear`→`Áo khoác`, `other`→`Phụ kiện`. Chiều ngược: `Chân váy` và `Quần & Chân váy`→`bottom`, `Giày dép`→`other` |
| `color` | `color` | Trống thì ghi `Chưa rõ` |
| `image_path` | `imageUrl` | Ảnh mới: data URL đã nén ≤ ~350 KB, hoặc `https://` |
| — | `styleTag` | Tên phong cách đầu tiên trong `favoriteStyles` của hồ sơ web (`styleLabel`), không có thì "Tối giản" |
| hoàn cảnh đang chọn (`work`, `casual`, `party`, `sports`, `lounging`, `beach`) | `occasion` | `Đi làm / Đi học`, `Dạo phố / Cafe`, `Tiệc tối / Hẹn hò`, `Thể thao / Vận động`, `Dạo phố / Cafe`, `Du lịch` |
| — | `season`, `favorite` | Món tạo từ app nhận `Mọi thời tiết` và `false`; người dùng sửa lại được trên web |
| `fit_score`, `fit_notes` | — | Không đồng bộ (bản gốc cũng không lưu) |

App chỉ tạo và xoá món, không sửa món có sẵn.

`createdAt` và `updatedAt` là `serverTimestamp()`; khi sửa thì giữ `createdAt` cũ, đúng như luật update.
