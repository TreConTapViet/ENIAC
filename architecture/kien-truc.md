# Kiến trúc hệ thống Smart-wardrobe

> Tài liệu này mô tả **cách các phần của hệ thống làm việc với nhau**, không liệt kê tính năng.
> Phải cập nhật tài liệu mỗi khi code thay đổi kiến trúc (thêm/bớt thành phần, đổi luồng dữ liệu, đổi công nghệ).
>
> Cập nhật lần cuối: 2026-11-07. Trạng thái: thiết kế, chưa có code.

## 1. Tổng quan

Smart-wardrobe là website giúp người dùng phối đồ từ chính quần áo của họ. Người dùng tải ảnh quần áo lên, AI nhận diện từng món và lưu vào tủ đồ ảo. Dựa trên hồ sơ cơ thể và tủ đồ đó, AI gợi ý cách phối. Bộ đồ được xem trên ma-nơ-canh theo hai lớp: lớp 3D để xoay xem mọi góc, và lớp ảnh chân thực do AI tạo.

Hệ thống có ba khối:

- **Frontend:** ứng dụng React chạy trên trình duyệt. Frontend lo giao diện, hiển thị ma-nơ-canh 3D, và đọc/ghi dữ liệu của chính người dùng.
- **Firebase:** gồm Authentication, Firestore, Storage và Hosting. Firebase lo tài khoản, lưu dữ liệu, lưu ảnh và phân phối website.
- **Backend (Cloud Functions, Node.js):** là nơi duy nhất gọi Gemini. Backend giữ API key và xử lý mọi tác vụ AI.

## 2. Công nghệ

| Phần | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện | HTML, TailwindCSS, ReactJS | Người dùng chọn |
| Công cụ build frontend | Vite | Claude chọn |
| Điều hướng trang (thanh bên trái) | React Router | Claude chọn |
| 3D ma-nơ-canh | Three.js qua React Three Fiber (+ drei) | Claude chọn, người dùng đồng ý |
| Đăng nhập | Firebase Authentication (email + mật khẩu) | Người dùng chọn |
| Cơ sở dữ liệu | Cloud Firestore | Claude chọn |
| Lưu ảnh | Firebase Storage | Claude chọn |
| Backend | Cloud Functions for Firebase, Node.js | Người dùng chọn |
| AI | Gemini API, key từ Google AI Studio | Người dùng chọn |
| Lưu API key | Firebase Secret Manager (`GEMINI_API_KEY`) | Claude chọn |
| Hosting | Firebase Hosting | Claude chọn |

Tên model Gemini không ghi cứng trong code mà lấy từ biến cấu hình. Hệ thống cần hai loại model:
- **Model đọc ảnh và văn bản:** dùng cho nhận diện quần áo, trợ lý AI và gợi ý phối đồ.
- **Model tạo ảnh:** dùng cho lớp ảnh chân thực.

## 3. Sơ đồ tổng thể

```
┌──────────────────────── Trình duyệt ────────────────────────┐
│  React + Tailwind                                            │
│  ┌──────────────┐  ┌───────────────────────────────────────┐ │
│  │ Thanh bên    │  │ Trang đang mở                          │ │
│  │ trái         │  │ (Hồ sơ / Trợ lý AI / Gợi ý / 3D /      │ │
│  │ (React Router)│ │  Lịch sử)                              │ │
│  └──────────────┘  └───────────────────────────────────────┘ │
│        │ Firebase JS SDK            │ httpsCallable          │
└────────┼────────────────────────────┼────────────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────────────────┐
│ Firebase Auth    │        │ Cloud Functions (Node.js)    │
│ Firestore        │◄──────►│  - analyzeGarment            │
│ Storage          │ Admin  │  - chatAssistant             │
│ (Security Rules) │  SDK   │  - suggestOutfits            │
└──────────────────┘        │  - renderRealistic           │
                            └──────────────┬───────────────┘
                                           │ GEMINI_API_KEY (Secret)
                                           ▼
                                   ┌───────────────┐
                                   │  Gemini API   │
                                   └───────────────┘
```

Có hai nguyên tắc:

1. **Frontend không bao giờ gọi Gemini trực tiếp.** Mọi tác vụ AI đi qua Cloud Functions loại *callable*. Firebase tự đính kèm và kiểm tra token đăng nhập, nên function luôn biết `uid` của người gọi.
2. **Frontend được tự đọc/ghi dữ liệu của chính người dùng** trong Firestore và Storage, ví dụ hồ sơ, danh sách tủ đồ, lịch sử. Security Rules giới hạn theo `uid`. Dữ liệu do AI sinh ra chỉ được ghi bởi Cloud Functions.

## 4. Quy trình làm việc của từng phần

### 4.1 Đăng nhập và điều hướng

1. Người dùng nhập email và mật khẩu. Frontend gọi `signInWithEmailAndPassword` (khi đăng ký thì gọi `createUserWithEmailAndPassword`).
2. Firebase Auth trả về phiên đăng nhập. Frontend lắng nghe `onAuthStateChanged` và giữ trạng thái người dùng trong một AuthContext dùng chung.
3. Router kiểm tra:
   - Chưa đăng nhập: chuyển về trang đăng nhập.
   - Đã đăng nhập nhưng chưa có `users/{uid}` hoặc hồ sơ chưa hoàn tất: chuyển đến trang Hồ sơ (đây là trang đầu tiên sau khi login).
   - Đã có hồ sơ: hiện bố cục chính gồm thanh bên trái và trang đang chọn.
4. Thanh bên trái chỉ đổi route và không tải lại trang. Mỗi trang tự lấy dữ liệu mình cần.

### 4.2 Hồ sơ người dùng

1. Trang Hồ sơ hiện form với các thông tin: chiều cao, cân nặng, số đo, dáng người, giới tính, phong cách ưa thích. Có thể kèm ảnh toàn thân (không bắt buộc).
2. Khi lưu, frontend ghi thẳng vào `users/{uid}`. Ảnh toàn thân (nếu có) được tải lên `users/{uid}/body/`.
3. Hồ sơ là đầu vào chung cho các phần khác:
   - Ma-nơ-canh 3D dùng số đo để co giãn cơ thể.
   - Gợi ý phối đồ và trợ lý AI dùng dáng người và phong cách.
   - Ảnh chân thực dùng mô tả cơ thể.
4. Khi hồ sơ được sửa, hệ thống lưu thêm một bản chụp vào `users/{uid}/profileHistory` để trang Lịch sử xem lại được.

### 4.3 Nhận diện ảnh quần áo (tải đồ vào tủ)

```
Chọn ảnh → nén/resize ở trình duyệt → upload Storage → gọi analyzeGarment(path)
        → Function đọc ảnh → Gemini trả JSON → ghi Firestore wardrobe → giao diện cập nhật
```

1. Frontend resize ảnh (cạnh dài khoảng 1024px) rồi tải lên `users/{uid}/wardrobe/{itemId}/original.jpg`.
2. Frontend gọi `analyzeGarment({ itemId, storagePath })`.
3. Function kiểm tra đường dẫn ảnh có thuộc `uid` của người gọi hay không, đọc ảnh bằng Admin SDK, rồi gửi ảnh cho Gemini. Function yêu cầu Gemini trả về **JSON theo schema cố định**: loại đồ, nhóm vị trí mặc (`top` / `bottom` / `shoes` / `outer` / `accessory`), màu chính, màu phụ, hoa văn, chất liệu, kiểu dáng, mùa và mức độ trang trọng.
4. Function kiểm tra JSON. Nếu sai schema thì thử lại một lần, sau đó báo lỗi. Nếu đúng thì ghi `users/{uid}/wardrobe/{itemId}` với `status: "ready"`.
5. Function tạo thêm ảnh đã tách nền (`cutout.png`) để lớp 3D dùng làm texture. Cách tách nền để người xây dựng quyết định (xem mục 7).
6. Frontend lắng nghe tài liệu wardrobe bằng `onSnapshot`. Món đồ đi qua các trạng thái `uploading` → `analyzing` → `ready` (hoặc `error`) mà không cần tải lại trang.

### 4.4 Trợ lý AI (hỏi đáp)

1. Người dùng gửi tin nhắn, có thể kèm ảnh. Frontend gọi `chatAssistant({ conversationId, message, imagePath? })`.
2. Function dựng ngữ cảnh gồm:
   - Hồ sơ người dùng.
   - Bản tóm tắt tủ đồ (danh sách món: id, loại, màu, kiểu; không gửi ảnh).
   - Khoảng N tin nhắn gần nhất của cuộc hội thoại.
   - System prompt định vai "stylist".
3. Gemini trả lời. Nếu câu trả lời nhắc đến món đồ cụ thể, function yêu cầu Gemini trả kèm danh sách `itemIds` để frontend hiển thị thẻ món đồ.
4. Function lưu cả tin nhắn hỏi và trả lời vào `users/{uid}/conversations/{conversationId}/messages`, rồi trả câu trả lời về frontend.

### 4.5 Gợi ý phối đồ

1. Người dùng chọn bối cảnh như dịp, thời tiết hoặc phong cách (tuỳ chọn). Frontend gọi `suggestOutfits({ occasion, weather, count })`.
2. Function đọc hồ sơ và toàn bộ tủ đồ có `status: "ready"`, rồi gửi cho Gemini dạng văn bản có cấu trúc. Function yêu cầu Gemini trả JSON gồm danh sách bộ đồ, mỗi bộ có `itemIds` theo vị trí mặc và lý do phối.
3. Function **kiểm tra lại kết quả**: mọi `itemId` phải tồn tại trong tủ đồ, mỗi vị trí mặc chỉ có một món, và bộ đồ phải có ít nhất áo + quần (hoặc váy liền). Bộ nào không hợp lệ thì loại bỏ.
4. Các bộ hợp lệ được ghi vào `users/{uid}/outfits/{outfitId}` với `source: "ai"` rồi trả về frontend. Từ thẻ gợi ý, người dùng mở thẳng bộ đồ trên ma-nơ-canh.

### 4.6 Ma-nơ-canh: lớp 3D (chạy hoàn toàn trên trình duyệt)

1. Frontend tải một mô hình cơ thể dạng glTF có **morph targets** cho chiều cao, vòng ngực, vòng eo, vòng hông và độ đầy cơ thể. Giá trị morph được tính từ hồ sơ.
2. Mỗi nhóm vị trí mặc có một bộ **mẫu quần áo 3D dựng sẵn**: áo thun, sơ mi, áo khoác, quần dài, quần short, váy, giày… Mẫu được chọn theo `type` trong dữ liệu wardrobe. Mẫu cũng có morph tương ứng để vừa với cơ thể.
3. Màu chính và màu phụ (từ dữ liệu nhận diện) được áp lên material của mẫu. Ảnh `cutout.png` được chiếu làm texture ở mặt trước để giữ hoa văn và logo.
4. React Three Fiber dựng cảnh với đèn studio và điều khiển xoay/zoom. Đổi món đồ chỉ đổi mesh hoặc texture, không gọi backend.
5. Thư mục mô hình 3D nằm trong `frontend/public/models/` và được tải lười (lazy) khi người dùng mở trang ma-nơ-canh.

### 4.7 Ma-nơ-canh: lớp ảnh chân thực (AI tạo ảnh)

1. Trên trang ma-nơ-canh, người dùng bấm "Xem thật". Frontend gọi `renderRealistic({ outfitId })`.
2. Function lấy ảnh gốc của từng món trong bộ đồ, mô tả cơ thể từ hồ sơ, và ảnh toàn thân nếu người dùng đã cung cấp. Tất cả được gửi cho **model Gemini tạo ảnh**, kèm yêu cầu giữ đúng màu, hoa văn và kiểu dáng từng món.
3. Ảnh kết quả được lưu vào `users/{uid}/renders/{outfitId}/{renderId}.png`. Đường dẫn được ghi vào `outfits/{outfitId}.renders[]`.
4. Frontend hiển thị trạng thái đang tạo (mất vài giây) rồi hiện ảnh. Ảnh đã tạo được dùng lại và không tạo lại nếu bộ đồ không đổi.
5. Giới hạn số lần tạo ảnh mỗi ngày cho mỗi người dùng được đếm trong `users/{uid}.usage` để kiểm soát chi phí.

### 4.8 Lịch sử

1. Trang Lịch sử chỉ đọc. Không có Cloud Function nào phục vụ riêng cho trang này.
2. Trang có ba nguồn dữ liệu:
   - `outfits`: các bộ đã lưu, có ảnh render và thời gian.
   - `profileHistory`: các phiên bản hồ sơ.
   - `conversations`: các cuộc hội thoại với trợ lý.
3. Truy vấn sắp xếp theo `createdAt` giảm dần và phân trang bằng `limit` + `startAfter`.
4. Từ Lịch sử, người dùng mở lại một bộ đồ trên ma-nơ-canh hoặc khôi phục một phiên bản hồ sơ. Khôi phục nghĩa là ghi lại bản đó vào `users/{uid}` theo quy trình 4.2.

## 5. Dữ liệu

### Firestore

```
users/{uid}
  ├─ profile fields, usage, createdAt, updatedAt
  ├─ profileHistory/{versionId}
  ├─ wardrobe/{itemId}        ← kết quả nhận diện, status, đường dẫn ảnh
  ├─ outfits/{outfitId}       ← itemIds theo vị trí mặc, source (ai | user), renders[]
  └─ conversations/{convId}
       └─ messages/{msgId}
```

### Storage

```
users/{uid}/body/…                         ảnh toàn thân (tuỳ chọn)
users/{uid}/wardrobe/{itemId}/original.jpg ảnh gốc
users/{uid}/wardrobe/{itemId}/cutout.png   ảnh tách nền cho 3D
users/{uid}/renders/{outfitId}/…           ảnh chân thực do AI tạo
```

## 6. Bảo mật và vận hành

- **API key Gemini** được lưu bằng `firebase functions:secrets:set GEMINI_API_KEY` và chỉ được khai báo cho các function cần dùng. Key không bao giờ xuất hiện trong code frontend hay trong repo.
- **Security Rules** cho Firestore và Storage: chỉ chủ sở hữu (`request.auth.uid == uid`) được đọc và ghi. Các trường do AI sinh ra (kết quả nhận diện, `renders`, `usage`) chỉ được ghi từ Cloud Functions.
- **Callable functions** từ chối mọi request không có `context.auth`. Function cũng kiểm tra mọi `storagePath` và `itemId` có thuộc về người gọi hay không.
- **Phát triển cục bộ** bằng Firebase Emulator Suite (Auth, Firestore, Storage, Functions). Lời gọi Gemini vẫn đi ra ngoài với key thật, lấy từ file `.secret.local` không commit.

## 7. Cấu trúc thư mục dự kiến

```
smart-wardrobe/
├─ frontend/            React + Vite + Tailwind
│  ├─ src/pages/        Login, Profile, Assistant, Suggestions, Mannequin, History
│  ├─ src/components/   Sidebar, các thẻ món đồ, viewer 3D
│  ├─ src/lib/          khởi tạo Firebase, wrapper gọi callable functions
│  └─ public/models/    mô hình cơ thể và mẫu quần áo 3D (glTF)
├─ functions/           Cloud Functions (Node.js)
│  └─ src/              analyzeGarment, chatAssistant, suggestOutfits, renderRealistic, gemini client
├─ firestore.rules
├─ storage.rules
└─ firebase.json
```

## 8. Các điểm còn mở

Những điểm sau để người xây dựng quyết định, và ghi lại vào đây khi đã chốt:

- Cách tách nền ảnh quần áo (`cutout.png`): nhờ model Gemini tạo ảnh, dùng thư viện tách nền chạy trong Function, hay chạy ngay trên trình duyệt.
- Nguồn mô hình cơ thể và các mẫu quần áo 3D: tự dựng hay dùng mô hình có giấy phép phù hợp.
- Giới hạn số lần tạo ảnh chân thực và số lần gọi AI mỗi ngày.
- Tên model Gemini cụ thể cho từng loại tác vụ.
