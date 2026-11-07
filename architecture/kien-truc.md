# Kiến trúc hệ thống Smart-wardrobe

> Tài liệu này mô tả **cách các phần của hệ thống làm việc với nhau**, không liệt kê tính năng.
> Phải cập nhật tài liệu mỗi khi code thay đổi kiến trúc (thêm/bớt thành phần, đổi luồng dữ liệu, đổi công nghệ).
>
> Cập nhật lần cuối: 2026-11-07. Trạng thái: thiết kế, chưa có code.

Bộ tài liệu kiến trúc:

| File | Nội dung |
|---|---|
| [kien-truc.md](kien-truc.md) | Thành phần, công nghệ, luồng hoạt động của từng phần (file này) |
| [sodokientruc.md](sodokientruc.md) | Sơ đồ theo chuẩn C4 và UML, có chú thích cách hệ thống chạy |
| [logic-he-thong.md](logic-he-thong.md) | Luật hoạt động: route guard, kiểm tra dữ liệu, lỗi, hạn mức, bảo mật web |
| [phan-quyen.md](phan-quyen.md) | Vai trò, ma trận quyền, Custom Claims, Security Rules |
| [du-lieu.md](du-lieu.md) | Cấu trúc Firestore, Storage và index |
| [quyet-dinh.md](quyet-dinh.md) | Nhật ký quyết định kiến trúc (ADR) |

## 1. Tổng quan

Smart-wardrobe là website giúp người dùng phối đồ, gồm hai nguồn quần áo:

- **Đồ của chính người dùng:** người dùng tải ảnh lên, AI nhận diện từng món và lưu vào tủ đồ ảo.
- **Đồ trong kho chung:** do quản trị viên đưa vào.

Dựa trên hồ sơ cơ thể và hai nguồn đồ đó, AI gợi ý cách phối. Bộ đồ được xem trên ma-nơ-canh theo hai lớp: lớp 3D để xoay xem mọi góc, và lớp ảnh chân thực do AI tạo.

Hệ thống có hai khối và **không có máy chủ riêng**:

- **Frontend:** ứng dụng React chạy trên trình duyệt. Frontend lo giao diện (cả khu quản trị), hiển thị ma-nơ-canh 3D, và đọc/ghi dữ liệu được Rules cho phép.
- **Firebase (toàn bộ backend):**
  - Authentication: tài khoản và vai trò.
  - Firestore: dữ liệu, có đồng bộ thời gian thực.
  - Storage: ảnh và mô hình 3D.
  - Cloud Functions (Node.js): AI, nghiệp vụ quản trị, tác vụ nền.
  - Hosting: phân phối website.
  - App Check: chặn gọi API từ ngoài website.
  - Secret Manager: giữ API key.

Gemini là dịch vụ bên ngoài duy nhất, và chỉ Cloud Functions được gọi đến nó.

## 2. Công nghệ

| Phần | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện | HTML, TailwindCSS, ReactJS | Người dùng chọn |
| Công cụ build frontend | Vite | Claude chọn |
| Điều hướng trang (thanh bên trái) | React Router | Claude chọn |
| 3D ma-nơ-canh | Three.js qua React Three Fiber (+ drei) | Claude chọn, người dùng đồng ý |
| Backend | **Chỉ Firebase**: không Express, không WebSocket server | Người dùng chọn |
| Đăng nhập | Firebase Authentication (email + mật khẩu) | Người dùng chọn |
| Vai trò | Custom Claims của Firebase Auth | Claude chọn |
| Cơ sở dữ liệu và đồng bộ thời gian thực | Cloud Firestore (`onSnapshot`, offline persistence) | Claude chọn |
| Lưu ảnh và mô hình 3D | Firebase Storage | Claude chọn |
| Xử lý phía server | Cloud Functions for Firebase (2nd gen), Node.js | Người dùng chọn |
| AI | Gemini API, key từ Google AI Studio | Người dùng chọn |
| Lưu API key | Secret Manager (`GEMINI_API_KEY`) | Claude chọn |
| Chống lạm dụng | Firebase App Check (reCAPTCHA Enterprise) | Claude chọn |
| Hosting | Firebase Hosting | Claude chọn |

Tên model Gemini không ghi cứng trong code mà đọc từ `config/models`. Hệ thống cần hai loại model:
- **Model đọc ảnh và văn bản:** dùng cho nhận diện quần áo, trợ lý AI và gợi ý phối đồ.
- **Model tạo ảnh:** dùng cho lớp ảnh chân thực.

## 3. Sơ đồ tổng thể

Sơ đồ đầy đủ theo chuẩn nằm ở [sodokientruc.md](sodokientruc.md). Bản rút gọn:

```
┌───────────────────────────── Trình duyệt ─────────────────────────────┐
│  React + Tailwind (SPA)                                                │
│  Khu người dùng: /app/*        Khu quản trị: /admin/*  (admin, sysadmin)│
│        │ Firebase JS SDK (Auth, Firestore, Storage)   │ httpsCallable   │
└────────┼──────────────────────────────────────────────┼─────────────────┘
         │                 App Check token              │
         ▼                                              ▼
┌───────────────────────── Firebase project ──────────────────────────────┐
│  Auth (+ Custom Claims)   Firestore   Storage   ◄── Security Rules       │
│        ▲                     ▲           ▲                               │
│        └──── Admin SDK ──────┴───────────┘                               │
│                         Cloud Functions (Node.js)                        │
│   AI:        analyzeGarment, chatAssistant, suggestOutfits, renderRealistic
│   Quản trị:  adminCatalog*, adminListUsers, adminSetRole,                │
│              adminSetUserStatus, adminStats                              │
│   Nền:       onUserCreate, onWardrobeDelete, dọn dữ liệu theo lịch       │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ GEMINI_API_KEY (Secret Manager)
                                   ▼
                            ┌──────────────┐
                            │  Gemini API  │
                            └──────────────┘
```

Có ba nguyên tắc:

1. **Frontend không bao giờ gọi Gemini trực tiếp.** Mọi tác vụ AI đi qua Cloud Functions loại *callable*. Firebase tự đính kèm token đăng nhập và token App Check, nên function luôn biết `uid` và vai trò của người gọi.
2. **Frontend được đọc/ghi trực tiếp những gì Rules cho phép.** Đó là dữ liệu của chính người dùng và kho chung ở trạng thái đã đăng (chỉ đọc). Dữ liệu do AI sinh ra, mọi thao tác quản trị, và các trường `role`/`status`/`usage` chỉ được ghi bởi Cloud Functions.
3. **Đồng bộ thời gian thực bằng Firestore.** Các tab và thiết bị nhận thay đổi qua `onSnapshot`. Khi mất mạng, offline persistence xếp hàng các thao tác ghi. Hệ thống không cần WebSocket hay BroadcastChannel tự viết.

## 4. Quy trình làm việc của từng phần

### 4.1 Đăng nhập và điều hướng

1. Người dùng nhập email và mật khẩu. Frontend gọi `signInWithEmailAndPassword` (khi đăng ký thì gọi `createUserWithEmailAndPassword`).
2. Khi tài khoản mới được tạo, trigger `onUserCreate` tạo `users/{uid}` và đặt Custom Claim `role: "user"`.
3. Frontend lắng nghe `onAuthStateChanged`, đọc `role` từ `getIdTokenResult()`, rồi giữ người dùng cùng vai trò trong một AuthContext dùng chung.
4. Route guard kiểm tra theo thứ tự trong [logic-he-thong.md](logic-he-thong.md) mục 1. Trang đầu tiên sau khi đăng nhập là Hồ sơ, cho đến khi hồ sơ hoàn tất.
5. Thanh bên trái chỉ đổi route và không tải lại trang. Mục "Quản trị" chỉ hiện với `admin` và `sysadmin`.

### 4.2 Hồ sơ người dùng

1. Trang Hồ sơ hiện form với các thông tin: chiều cao, cân nặng, số đo, dáng người, giới tính, phong cách ưa thích. Có thể kèm ảnh toàn thân (không bắt buộc).
2. Khi lưu, frontend ghi thẳng vào `users/{uid}`. Rules chỉ cho ghi các trường hồ sơ (xem [phan-quyen.md](phan-quyen.md) mục 3.4). Ảnh toàn thân (nếu có) được tải lên `users/{uid}/body/`.
3. Hồ sơ là đầu vào chung cho các phần khác:
   - Ma-nơ-canh 3D dùng số đo để co giãn cơ thể.
   - Gợi ý phối đồ và trợ lý AI dùng dáng người và phong cách.
   - Ảnh chân thực dùng mô tả cơ thể.
4. Mỗi lần lưu, hệ thống thêm một bản chụp vào `users/{uid}/profileHistory` để trang Lịch sử xem lại được.

### 4.3 Nhận diện ảnh quần áo (tải đồ vào tủ)

```
Chọn ảnh → nén/resize ở trình duyệt → tạo wardrobe doc (uploading) → upload Storage
        → gọi analyzeGarment → Function gọi Gemini → ghi attributes + cutout + thumb → ready
```

1. Frontend tạo `users/{uid}/wardrobe/{itemId}` với `status: "uploading"`. Sau đó frontend resize ảnh (cạnh dài khoảng 1024px) và tải lên `users/{uid}/wardrobe/{itemId}/original.jpg`.
2. Frontend gọi `analyzeGarment({ itemId, requestId })`.
3. Function kiểm tra hạn mức trong transaction, rồi đặt `status: "analyzing"`. Function đọc ảnh bằng Admin SDK và gửi cho Gemini, yêu cầu trả **JSON theo schema cố định** (xem [du-lieu.md](du-lieu.md), trường `attributes`).
4. Function kiểm tra JSON. Nếu sai thì thử lại một lần, sau đó đặt `status: "error"` và hoàn lại lượt dùng. Nếu đúng thì tạo `cutout.png` và `thumb.webp`, ghi `attributes`, rồi đặt `status: "ready"`.
5. Frontend lắng nghe document bằng `onSnapshot`, nên thấy trạng thái đổi mà không cần tải lại trang, kể cả khi đã rời trang rồi quay lại.

### 4.4 Trợ lý AI (hỏi đáp)

1. Người dùng gửi tin nhắn, có thể kèm ảnh. Frontend gọi `chatAssistant({ conversationId, message, imagePath?, requestId })`.
2. Function dựng ngữ cảnh gồm:
   - Hồ sơ người dùng.
   - Bản tóm tắt tủ đồ và kho chung đã đăng (id, loại, màu, kiểu; không gửi ảnh).
   - Khoảng N tin nhắn gần nhất của cuộc hội thoại.
   - System prompt định vai "stylist". Nội dung người dùng gửi được đặt riêng trong phần dữ liệu, tách khỏi system prompt.
3. Gemini trả lời kèm `itemRefs` (`{source, id}`) cho những món được nhắc đến. Function kiểm tra mọi ref có tồn tại và người dùng được phép xem.
4. Function lưu tin nhắn hỏi và trả lời vào `messages`, rồi trả câu trả lời về frontend.

### 4.5 Gợi ý phối đồ

1. Người dùng chọn bối cảnh (dịp, thời tiết, phong cách) và có cho dùng đồ trong kho chung hay không. Frontend gọi `suggestOutfits({ occasion, weather, count, includeCatalog, requestId })`.
2. Function đọc hồ sơ, tủ đồ có `status: "ready"`, và catalog đã đăng (nếu được chọn), rồi gửi cho Gemini dạng văn bản có cấu trúc. Gemini trả JSON gồm danh sách bộ đồ, mỗi bộ có `items` theo vị trí mặc và lý do phối.
3. Function **kiểm tra lại kết quả**: mọi ref phải tồn tại, mỗi vị trí mặc chỉ có một món, và bộ đồ phải có ít nhất áo + quần hoặc váy liền. Bộ nào không hợp lệ thì loại bỏ.
4. Các bộ hợp lệ được ghi vào `users/{uid}/outfits` với `source: "ai"`, `saved: false`, rồi trả về frontend. Người dùng mở bộ đồ trên ma-nơ-canh hoặc bấm lưu.

### 4.6 Ma-nơ-canh: lớp 3D (chạy hoàn toàn trên trình duyệt)

1. Frontend tải mô hình cơ thể dạng glTF có **morph targets** cho chiều cao, vòng ngực, vòng eo, vòng hông và độ đầy cơ thể. Giá trị morph được tính từ hồ sơ.
2. Với mỗi món trong bộ đồ, frontend chọn mô hình 3D theo thứ tự:
   - Món trong kho chung có `model3dPath` (mô hình riêng do admin tải lên): dùng mô hình đó. Cách này cho kết quả giống thật nhất.
   - Còn lại: dùng **mẫu quần áo 3D dựng sẵn** theo `category`, có morph tương ứng để vừa với cơ thể.
3. Với mẫu dựng sẵn, màu chính và màu phụ được áp lên material. `cutout.png` được chiếu làm texture ở mặt trước để giữ hoa văn và logo.
4. React Three Fiber dựng cảnh với đèn studio và điều khiển xoay/zoom. Đổi món đồ chỉ đổi mesh hoặc texture, không gọi backend.
5. Mô hình cơ thể và mẫu dựng sẵn nằm trong `frontend/public/models/`. Mô hình riêng của kho chung tải từ Storage. Tất cả được tải lười (lazy) và cache trong bộ nhớ.

### 4.7 Ma-nơ-canh: lớp ảnh chân thực (AI tạo ảnh)

1. Người dùng bấm "Xem thật". Frontend gọi `renderRealistic({ outfitId, requestId })`.
2. Function tính `itemsHash`. Nếu `renders[]` đã có ảnh với cùng hash thì trả ảnh đó luôn, không gọi AI và không tính lượt.
3. Nếu chưa có, function kiểm tra hạn mức rồi gửi cho **model Gemini tạo ảnh**: ảnh gốc từng món, mô tả cơ thể từ hồ sơ, và ảnh toàn thân nếu có. Yêu cầu kèm theo là giữ đúng màu, hoa văn và kiểu dáng từng món.
4. Ảnh kết quả được lưu vào `users/{uid}/renders/{outfitId}/{renderId}.png` và ghi vào `renders[]`. Frontend nhận qua `onSnapshot`.

### 4.8 Lịch sử

1. Trang Lịch sử chỉ đọc và không có function riêng.
2. Trang đọc các bộ đồ đã lưu (`outfits`, `saved == true`), `profileHistory` và `conversations`, sắp xếp theo `createdAt` giảm dần, phân trang bằng `limit` + `startAfter`.
3. Từ Lịch sử, người dùng mở lại một bộ đồ trên ma-nơ-canh hoặc khôi phục một phiên bản hồ sơ (ghi lại vào `users/{uid}` theo quy trình 4.2).

### 4.9 Kho đồ chung (quản trị viên)

```
Admin tải ảnh (+ model.glb tuỳ chọn) → adminCatalogCreate (draft) → AI điền attributes
     → admin xem lại, sửa → adminCatalogPublish → người dùng thấy món đồ
```

1. Trong `/admin/catalog`, admin tải ảnh lên `catalog/{id}/original.jpg`. Storage Rules chỉ cho admin ghi vào đây. Admin có thể tải thêm `model.glb`.
2. Frontend gọi `adminCatalogCreate({ id, name, ... })`. Function tạo document `status: "draft"`, rồi gọi Gemini nhận diện giống quy trình 4.3 để **điền sẵn** `attributes`, `cutout` và `thumb`. Thao tác của admin không tính vào hạn mức người dùng.
3. Admin kiểm tra và sửa thuộc tính bằng `adminCatalogUpdate`, rồi đăng bằng `adminCatalogPublish`. Món đồ chuyển sang `published` và xuất hiện ngay với người dùng qua `onSnapshot`.
4. Xoá bằng `adminCatalogArchive`: món đồ chuyển sang `archived`, ẩn với người dùng nhưng bộ đồ cũ không bị hỏng (xem [du-lieu.md](du-lieu.md) mục 5). Function chạy theo lịch xoá hẳn sau 30 ngày. Trong 30 ngày đó sysadmin có thể khôi phục hoặc xoá hẳn ngay.
5. Mỗi function trên ghi `auditLogs` trong cùng transaction.

### 4.10 Quản trị tài khoản và kiểm tra hệ thống

1. `/admin/system` (admin và sysadmin) gọi `adminStats`. Function này tổng hợp số người dùng, số lượt AI theo ngày, tỉ lệ lỗi, và chi phí ước tính từ bộ đếm trong Firestore.
2. `/admin/users` (admin chỉ xem, sysadmin được thao tác) gọi `adminListUsers` để xem email, vai trò, trạng thái, usage. Không có nội dung cá nhân.
3. Sysadmin khoá tài khoản bằng `adminSetUserStatus`. Function đặt `status: "locked"`, `disabled: true`, và thu hồi refresh token.
4. Sysadmin đổi vai trò bằng `adminSetRole`. Function đặt Custom Claims, thu hồi token, cập nhật bản sao `users/{uid}.role`, và ghi audit. Chi tiết luật bảo vệ ở [phan-quyen.md](phan-quyen.md) mục 3.3.

### 4.11 Tác vụ nền

| Function | Kích hoạt | Việc |
|---|---|---|
| `onUserCreate` | Tạo tài khoản Auth | Tạo `users/{uid}`, đặt claim `role: "user"` |
| `onWardrobeDelete` | Xoá document wardrobe | Xoá ảnh trong Storage, đánh dấu `broken` cho bộ đồ liên quan |
| `cleanupDaily` | Lịch, 03:00 giờ Việt Nam | Xoá bộ AI gợi ý chưa lưu sau 7 ngày, xoá catalog `archived` sau 30 ngày, cắt `profileHistory` còn 50 bản |
| `deleteAccount` | Callable | Xoá `users/{uid}`, `users/{uid}/` trên Storage, và tài khoản Auth |

## 5. Dữ liệu

Toàn bộ cấu trúc nằm ở [du-lieu.md](du-lieu.md). Tóm tắt: dữ liệu cá nhân nằm dưới `users/{uid}/…`; dữ liệu dùng chung nằm ở `catalog`, `config`, `auditLogs`. Đường dẫn Storage đi theo cùng cấu trúc đó.

## 6. Bảo mật và vận hành

- **API key Gemini** lưu bằng `firebase functions:secrets:set GEMINI_API_KEY`, chỉ khai báo cho các function cần dùng. Key không bao giờ xuất hiện trong code frontend, trong `.env` của Vite hay trong repo.
- **Phân quyền:** xem [phan-quyen.md](phan-quyen.md).
- **Callable functions** đều bật `enforceAppCheck` và từ chối request không có `auth`. Function kiểm tra mọi đường dẫn và id có thuộc phạm vi người gọi được phép hay không.
- **Phát triển cục bộ** bằng Firebase Emulator Suite (Auth, Firestore, Storage, Functions). Gemini được giả lập (mock) khi chạy test. Khi chạy thử thủ công thì dùng key từ `functions/.secret.local` (không commit).
- **Hai môi trường:** project Firebase `dev` và `prod`, mỗi bên có key và dữ liệu riêng.

## 7. Cấu trúc thư mục dự kiến

```
smart-wardrobe/
├─ frontend/                React + Vite + Tailwind
│  ├─ src/pages/            Login, Profile, Wardrobe, Assistant, Suggestions, Mannequin, History, Settings
│  ├─ src/pages/admin/      Catalog, Users, System
│  ├─ src/components/       Sidebar, các thẻ món đồ, viewer 3D
│  ├─ src/lib/              khởi tạo Firebase + App Check, wrapper gọi callable, AuthContext
│  └─ public/models/        mô hình cơ thể và mẫu quần áo 3D (glTF)
├─ functions/               Cloud Functions (Node.js)
│  └─ src/
│     ├─ ai/                analyzeGarment, chatAssistant, suggestOutfits, renderRealistic
│     ├─ admin/             adminCatalog*, adminListUsers, adminSetRole, adminSetUserStatus, adminStats
│     ├─ triggers/          onUserCreate, onWardrobeDelete, cleanupDaily, deleteAccount
│     └─ shared/            gemini client, kiểm tra quyền, hạn mức, schema, audit
├─ shared/schemas/          schema dùng chung frontend + functions
├─ scripts/grant-role.mjs   cấp vai trò ban đầu
├─ firestore.rules
├─ firestore.indexes.json
├─ storage.rules
└─ firebase.json
```

## 8. Các điểm còn mở

Những điểm sau để người xây dựng quyết định, và ghi lại vào [quyet-dinh.md](quyet-dinh.md) khi đã chốt:

- Cách tách nền ảnh quần áo (`cutout.png`): nhờ model Gemini tạo ảnh, dùng thư viện tách nền chạy trong Function, hay chạy ngay trên trình duyệt.
- Nguồn mô hình cơ thể và các mẫu quần áo 3D: tự dựng hay dùng mô hình có giấy phép phù hợp.
- Tên model Gemini cụ thể cho từng loại tác vụ.
