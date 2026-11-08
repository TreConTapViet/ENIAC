# Kiến trúc hệ thống Smart-wardrobe

> Tài liệu này mô tả **cách các phần của hệ thống làm việc với nhau**, không liệt kê tính năng.
> Phải cập nhật tài liệu mỗi khi code thay đổi kiến trúc (thêm/bớt thành phần, đổi luồng dữ liệu, đổi công nghệ).
>
> Cập nhật lần cuối: 2026-11-07. Mô tả kiến trúc đích; hiện trạng code xem [hien-trang-code.md](hien-trang-code.md).

Bộ tài liệu kiến trúc:

| File | Nội dung |
|---|---|
| [kien-truc.md](kien-truc.md) | Thành phần, công nghệ, luồng hoạt động của từng phần (file này) |
| [so-do-kien-truc.md](so-do-kien-truc.md) | Sơ đồ theo chuẩn C4 và UML, có chú thích cách hệ thống chạy |
| [logic-he-thong.md](logic-he-thong.md) | Luật hoạt động: route guard, kiểm tra dữ liệu, lỗi, hạn mức, bảo mật web |
| [phan-quyen.md](phan-quyen.md) | Vai trò, ma trận quyền, Custom Claims, Security Rules |
| [du-lieu.md](du-lieu.md) | Cấu trúc Firestore, Storage và index |
| [quyet-dinh.md](quyet-dinh.md) | Nhật ký quyết định kiến trúc (ADR) |
| [hien-trang-code.md](hien-trang-code.md) | Code đang có so với kiến trúc đích, và lộ trình chuyển đổi |

Tài liệu này mô tả **kiến trúc đích**. Code hiện tại vẫn dùng máy chủ Express và chưa dùng Firebase; xem [hien-trang-code.md](hien-trang-code.md).

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
| 3D ma-nơ-canh | Three.js thuần, mô hình người glTF (`public/models`) | Theo code hiện có (ADR-007) |
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

Sơ đồ đầy đủ theo chuẩn nằm ở [so-do-kien-truc.md](so-do-kien-truc.md). Bản rút gọn:

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
│   AI:        analyzeGarment, chatAssistant, suggestOutfits, renderRealistic,
│              colorPalette, weatherForecast, poseFromText                 │   Quản trị:  adminCatalog*, adminListUsers, adminSetRole,                │
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

### 4.1 Đăng nhập, tài khoản khách và nơi lưu dữ liệu

Code hiện tại: `src/services/auth.ts`, `src/services/userData.ts`, `src/services/localStore.ts`, `src/hooks/useUserSession.ts`.

1. Người dùng có ba cách vào app:
   - **Email + mật khẩu.** Đăng ký xác nhận email bằng OTP (EmailJS), rồi `createUserWithEmailAndPassword` và gửi thư xác thực của Firebase.
   - **Google** (`signInWithPopup`).
   - **Khách** (`signInAnonymously`). Firebase cấp một uid ẩn danh gắn với trình duyệt này. App không thu thập IP; hạ tầng Google/Firebase vẫn thấy IP khi phục vụ request, như mọi trang web.
2. `useUserSession` lắng nghe `onIdTokenChanged`. Dùng hàm này chứ không phải `onAuthStateChanged`, vì nó còn báo khi khách nâng cấp (uid giữ nguyên) và khi email vừa được xác thực.
3. **Dữ liệu lưu trên máy trước, lên mây sau.**
   - Mọi thay đổi ghi vào state và localStorage ngay: `sw_profile_{uid}`, `sw_wardrobe_{uid}`, `sw_outfits_{uid}`.
   - Chỉ khi `canSync` (không phải khách **và** email đã xác thực) app mới gọi Firestore. Khách và tài khoản chưa xác thực không phát sinh request Firestore nào.
4. **Lần đầu được đồng bộ trên một máy:**
   - `syncLocalToCloud` tạo hồ sơ nếu trên mây chưa có, rồi tải lên những đồ và bộ đồ mà mây chưa có. Đối chiếu theo id, và theo nội dung đối với dữ liệu cũ tạo bằng `addDoc`.
   - Sau đó app nghe `onSnapshot`. Tài liệu dùng id cố định bằng id trên máy (`item_…`, `outfit_…`).
   - Đồ mẫu `starter_…` chỉ nằm trên máy.
5. **Nâng cấp tài khoản khách:**
   - `linkWithPopup` (Google) hoặc `linkWithCredential` (email; gửi thư xác thực) liên kết vào chính uid khách, nên dữ liệu giữ nguyên.
   - Nếu Google hoặc email đó đã có tài khoản: app đặt dấu `sw_pending_guest_merge`, đăng nhập vào tài khoản cũ, và `useUserSession` gộp đồ tự thêm cùng các bộ đã lưu của khách sang uid đó.
6. **Khách đăng xuất:** app hỏi xác nhận, xoá dữ liệu khách trên máy và xoá luôn tài khoản ẩn danh (`deleteUser`).
7. Sau khi đăng nhập: nếu chưa có hồ sơ thì vào onboarding, có rồi thì vào không gian chính. Chưa có thư viện router: `App.tsx` đổi mục bằng state, còn `useAppRoute` (`src/hooks/useAppRoute.ts` + `src/utils/routes.ts`) đồng bộ state đó với địa chỉ trang qua History API: `/login`, `/welcome`, `/profile-update`, `/discover`, `/studio` (ma-nơ-canh 3D), `/wardrobe`, `/history`; đường dẫn tiếng Việt cũ (`/goi-y`, `/ma-no-canh`, `/tu-do`, `/lich-su`) vẫn mở đúng mục rồi tự đổi sang tên mới. Mở link sâu khi chưa đăng nhập thì đăng nhập xong vào đúng mục đó. `server.ts` (`appType: "spa"` và `app.get("*")`) và route cuối trong `.vercel/output/config.json` (sinh bởi `scripts/build-vercel.mjs`) trả `index.html` cho các đường dẫn này. Phân quyền theo Custom Claim `role` mới có trong `firestore.rules`, giao diện chưa dùng.

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
5. Có hai function hỗ trợ, chỉ đọc và không ghi dữ liệu:
   - `colorPalette`: gợi ý bảng màu phối từ một món chính.
   - `weatherForecast`: Gemini kèm Google Search lấy thời tiết thật theo vị trí, làm đầu vào `weather` cho bước 1. Kết quả được cache 30 phút theo khu vực.

### 4.6 Ma-nơ-canh: lớp 3D (chạy hoàn toàn trên trình duyệt)

1. Frontend tải mô hình cơ thể dạng glTF có **morph targets** cho chiều cao, vòng ngực, vòng eo, vòng hông và độ đầy cơ thể. Giá trị morph được tính từ hồ sơ.
2. Với mỗi món trong bộ đồ, frontend chọn mô hình 3D theo thứ tự:
   - Món trong kho chung có `model3dPath` (mô hình riêng do admin tải lên): dùng mô hình đó. Cách này cho kết quả giống thật nhất.
   - Còn lại: dùng **mẫu quần áo 3D dựng sẵn** theo `category`, có morph tương ứng để vừa với cơ thể.
3. Với mẫu dựng sẵn, màu chính và màu phụ được áp lên material. `cutout.png` được chiếu làm texture ở mặt trước để giữ hoa văn và logo.
4. Three.js (`src/three/`) dựng cảnh với đèn studio và điều khiển xoay/zoom, cùng điều khiển từng khớp xương. Đổi món đồ chỉ đổi mesh hoặc texture, không gọi backend.
5. Ngoài ra còn có một số tính năng chỉ chạy trên trình duyệt, không đi qua backend:
   - Camera AR (`getUserMedia`) đặt ma-nơ-canh vào khung cảnh thật.
   - Quay video xoay 360°.
   - Xuất `.glb`.
6. Tư thế bằng lời: frontend gọi `poseFromText({ prompt })`. Function nhờ Gemini chuyển mô tả thành góc khớp theo schema. Frontend áp các góc đó vào khung xương.
7. Mô hình cơ thể và mẫu dựng sẵn nằm trong `public/models/`. Mô hình riêng của kho chung tải từ Storage. Tất cả được tải lười (lazy) và cache trong bộ nhớ.

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

> Code hiện tại (11/2026) khác bản dự kiến bên dưới. Những thư mục đã có thật:
> - `src/sections/`: các mục của không gian chính.
> - `src/hooks/`: `useUserSession`, `useThemePrefs`.
> - `src/services/`: `auth`, `userData`, `localStore`, `integrations`.
> - `src/domain/`: logic thuần, gồm loại đồ theo giới tính, cổng cập nhật hồ sơ, tủ đồ mẫu theo giới tính (`starterWardrobe.ts`), và bỏ trùng / xếp hạng gợi ý (`outfits.ts`).
> - `src/catalog/`: danh mục đồ có giới tính. Đồ nam lưu ở `garments.male.ts` và `outfits.male.ts`; bộ đồ tham chiếu món bằng id. Bộ sưu tập nữ cũ được gắn giới tính, riêng 4 bộ đường phố là Unisex. Nguồn ảnh ghi ở `vanhanh/nguon-anh.md`.
> - Gợi ý AI chỉ chọn trong id món có thật: `src/services/auraOutfits.ts` gửi lên `/api/aura/recommend-outfits`, Gemini trả kết quả theo schema enum, server kiểm tra lại. Khi Gemini trả thiếu hoặc lỗi quá 15 giây, server bù bằng `shared/outfitEngine.ts`.
> - `src/components/account`, `src/components/ui`, `src/shell/MobileTabBar.tsx` (thanh điều hướng dưới đáy, thay thanh bên khi màn hình < 768px hoặc điện thoại xoay ngang).
> - **Điện thoại:**
>   - `src/utils/device.ts` nhận diện điện thoại / máy yếu (`isPhone`, `isLowPowerDevice`), giới hạn tỉ lệ điểm ảnh WebGL (`renderPixelRatio`, tối đa 1.5 trên điện thoại) và tính hệ số lùi camera cho màn dọc (`portraitDistanceScale`). Có test ở `scripts/device.test.ts`.
>   - Giao diện tự co theo bề rộng: dưới 390px, cỡ chữ gốc của `<html>` tỉ lệ với `100vw` (mốc 390px = 16px, tối thiểu 13px). Mọi kích thước Tailwind tính theo `rem` nên co đều theo.
>   - Biến thể Tailwind `phone-land:` (định nghĩa trong `src/index.css`, khớp `PHONE_LANDSCAPE_QUERY`) giữ bố cục điện thoại khi xoay ngang.
>   - Trên màn cảm ứng, ô nhập có chữ ≥ 16px (iOS không tự phóng to). `viewport-fit=cover` đi kèm padding `env(safe-area-inset-*)` cho thanh tab, các bảng trượt từ đáy và khung chat Aura.
>   - Màn mở tủ (`Wardrobe3DCanvas`): trên điện thoại tắt đổ bóng và MSAA, camera lùi theo tỉ lệ màn dọc để cả tủ nằm trọn trong khung.
>   - Studio 3D: trên điện thoại (< 640px hoặc xoay ngang), `src/studio/studio.css` sắp lại các cụm nút nổi qua thuộc tính `data-studio` / `data-mobile-tools`, không sửa lõi `MannequinViewport`. Nút "Công cụ" trong `MannequinStudioApp` mở/gập nhóm nút phụ.
>   - Bong bóng Aura chỉ hiện trên máy tính; trên điện thoại, Aura mở từ thanh tab và phủ toàn màn hình.
> - Giao diện dùng token màu trong `src/index.css` (`bg-surface`, `text-fg`…): chế độ sáng là sáng, chế độ tối là tối, bỏ kiểu "ngoài tối – trong sáng". Ảnh sản phẩm đặt trong khung `bg-photo-well` luôn sáng.
> - **`shared/`: code dùng chung cho client và `server.ts`.** Gồm `gender.ts` (chỉ Nam/Nữ), `sizing.ts` (bảng size Nam/Nữ), `styles.ts` (phong cách theo giới tính, lưu bằng id hoặc `custom:…`, tối đa 8) và `text.ts` (`normalizeVi`, tìm kiếm không dấu).
>
> - **Thời tiết:** `shared/provinces.ts` chứa 34 tỉnh/thành theo NQ 202/2025/QH15, toạ độ lấy theo trung tâm hành chính, tìm được bằng tên cũ.
>   - `server/weatherApi.ts` cung cấp `GET /api/weather/current?province=`. Mỗi lần gọi Open-Meteo lấy cả 34 điểm, giữ trong bộ nhớ 30 phút, giới hạn 5 giây mỗi lần gọi.
>   - Khi Open-Meteo lỗi, server dùng số liệu cũ trong tối đa 6 giờ; quá hạn thì dùng số liệu khí hậu theo vùng và tháng (`shared/weather.ts`).
>   - Phía client, `useWeather` nhớ tỉnh đã chọn và tự làm mới mỗi 30 phút; `ProvinceSelect` là ô chọn tỉnh.
>   - Thời tiết riêng trong studio 3D (`/api/weather-forecast`) vẫn giữ nguyên.
>
> - **Aura dạng bong bóng:** gồm `src/components/aura/AuraBubble.tsx`, `AuraChatPanel.tsx` và `src/hooks/useAura.ts`.
>   - Bong bóng kéo thả được, thả ra thì dính về mép trái hoặc phải; kéo vào ô X thì ẩn hẳn.
>   - Bật lại từ mục "Trợ lý Aura" trên thanh bên hoặc công tắc trong Hồ sơ.
>   - Vị trí và trạng thái ẩn/hiện lưu trong `sw_aura_prefs`. Có chấm báo tin mới.
>
> Backend vẫn là Express: `server/app.ts` cùng `server/studioApi.ts` và `server/weatherApi.ts`; chưa có Cloud Functions. Trên máy, `server.ts` chạy app này kèm Vite. Trên Vercel, `scripts/build-vercel.mjs` (lệnh `npm run build:vercel`) tạo `.vercel/output` theo Build Output API: giao diện tĩnh từ `dist/` cộng một Vercel Function `/api` (esbuild gói `server/vercelEntry.ts` thành một file). Định tuyến nằm trong `config.json` do script sinh: file tĩnh → `/api/*` vào function → còn lại trả `index.html`. Bản viết lại đầy đủ nằm ở Giai đoạn 11 của kế hoạch.

```
ENIAC/                      (frontend giữ ở gốc repo như code hiện tại)
├─ src/pages/               Login, Profile, Wardrobe, Assistant, Suggestions, Studio (ma-nơ-canh), History, Settings
├─ src/pages/admin/         Catalog, Users, System
├─ src/components/          Sidebar, dock studio, thẻ món đồ, viewport 3D
├─ src/three/               dựng người, tóc, mặt, vải (đã có)
├─ src/lib/                 khởi tạo Firebase + App Check, wrapper gọi callable, AuthContext
├─ public/models/           mô hình cơ thể và animation (glTF, đã có)
├─ functions/               Cloud Functions (Node.js)
│  └─ src/
│     ├─ ai/                analyzeGarment, chatAssistant, suggestOutfits, renderRealistic,
│     │                     colorPalette, weatherForecast, poseFromText
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
