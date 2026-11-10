# Logic hệ thống Smart-wardrobe

> Tài liệu này mô tả **luật hoạt động** của website: trạng thái, điều kiện, kiểm tra, xử lý lỗi và các tiêu chuẩn chung mà mọi trang phải tuân theo.
> Kiến trúc (thành phần, công nghệ, luồng AI) nằm ở [kien-truc.md](kien-truc.md). Tài liệu này bổ sung, không lặp lại.
>
> Cập nhật lần cuối: 2026-11-07. Trạng thái: thiết kế, chưa có code.

---

## 1. Bản đồ trang và quyền truy cập

| Route | Trang | Ai được vào | Ghi chú |
|---|---|---|---|
| `/` | Trang giới thiệu | Mọi người | Đã đăng nhập thì chuyển `/app` |
| `/login` | Đăng nhập | Khách | Đã đăng nhập thì chuyển `/app` |
| `/register` | Đăng ký | Khách | |
| `/forgot-password` | Quên mật khẩu | Khách | |
| `/auth/action` | Xử lý link email (xác thực, đặt lại mật khẩu) | Mọi người | Đọc `mode` + `oobCode` |
| `/verify-email` | Nhắc xác thực email | Đã đăng nhập, chưa xác thực | |
| `/app/profile` | Hồ sơ | Đã xác thực | Bắt buộc hoàn tất trước khi vào trang khác |
| `/app/wardrobe` | Tủ đồ | Đã có hồ sơ | |
| `/app/assistant` | Trợ lý AI | Đã có hồ sơ | |
| `/app/suggestions` | Gợi ý phối đồ | Đã có hồ sơ | |
| `/app/mannequin/:outfitId?` | Ma-nơ-canh | Đã có hồ sơ | |
| `/app/history` | Lịch sử | Đã có hồ sơ | |
| `/app/settings` | Cài đặt tài khoản | Đã xác thực | |
| `/admin/catalog` | Kho đồ chung | `admin`, `sysadmin` | Xem [phan-quyen.md](phan-quyen.md) |
| `/admin/system` | Tình trạng hệ thống | `admin`, `sysadmin` | |
| `/admin/users` | Tài khoản | `admin` (chỉ xem), `sysadmin` | |
| `/terms`, `/privacy` | Điều khoản, Chính sách riêng tư | Mọi người | Bắt buộc có link ở footer và form đăng ký |
| `*` | 404 | Mọi người | |

### Thứ tự kiểm tra của Route Guard

Mỗi lần đổi route, guard kiểm tra lần lượt và dừng ở điều kiện đầu tiên không đạt:

```
authLoading?            → hiện màn hình chờ (không nhấp nháy trang login)
chưa đăng nhập?         → /login?redirect=<route hiện tại>
email chưa xác thực?    → /verify-email
tài khoản bị khoá?      → đăng xuất + thông báo
hồ sơ chưa hoàn tất?    → /app/profile   (trừ khi đang ở /app/profile hoặc /app/settings)
thiếu vai trò yêu cầu?  → trang 403
→ cho vào
```

Sau khi đăng nhập thành công, chuyển về `redirect` nếu có và nó là đường dẫn nội bộ (bắt đầu bằng `/`, không bắt đầu bằng `//`), nếu không thì về `/app`. Việc này chặn lỗi open redirect.

---

## 2. Tài khoản và phiên đăng nhập

### 2.1 Đăng ký

1. Kiểm tra ở frontend: email đúng định dạng; mật khẩu ≥ 8 ký tự, có chữ và số; nhập lại mật khẩu khớp; đã tick đồng ý Điều khoản.
2. Gọi `createUserWithEmailAndPassword`. Firebase tự kiểm tra trùng email.
3. Gửi email xác thực (`sendEmailVerification`), chuyển sang `/verify-email`.
4. Trigger `auth.user().onCreate` (Cloud Function) đặt Custom Claim `role: "user"` và tạo `users/{uid}` với giá trị mặc định: `role: "user"`, `status: "active"`, `profileCompleted: false`, `usage` = 0, `createdAt`.

### 2.2 Đăng nhập

- Thông báo lỗi **chung chung** cho sai email hoặc sai mật khẩu ("Email hoặc mật khẩu không đúng") để không lộ email nào đã có tài khoản.
- Firebase tự chặn khi đăng nhập sai nhiều lần (`auth/too-many-requests`); giao diện hiện thông báo thử lại sau.
- Tuỳ chọn "Ghi nhớ đăng nhập": bật thì dùng `browserLocalPersistence`, tắt thì dùng `browserSessionPersistence`.
- Nút bấm bị khoá trong lúc chờ, tránh gửi hai lần.

### 2.3 Xác thực email, quên mật khẩu, đổi mật khẩu

- Trang `/verify-email` có nút "Gửi lại", khoá 60 giây giữa hai lần gửi, và nút "Tôi đã xác thực" gọi `user.reload()` để kiểm tra lại.
- Quên mật khẩu: luôn hiện "Nếu email tồn tại, bạn sẽ nhận được link", dù email có tồn tại hay không.
- Đổi mật khẩu và đổi email (trong Cài đặt) yêu cầu nhập lại mật khẩu cũ (`reauthenticateWithCredential`).

### 2.4 Đăng xuất và hết phiên

- Đăng xuất: gọi `signOut`, huỷ mọi listener `onSnapshot`, xoá cache dữ liệu người dùng trong bộ nhớ, về `/login`.
- Đồng bộ giữa các tab: `onAuthStateChanged` tự báo cho mọi tab; tab nào nhận `user = null` thì về `/login`.
- Token hết hạn hoặc bị thu hồi: callable trả `unauthenticated` → frontend đăng xuất và báo "Phiên đăng nhập đã hết hạn".

### 2.5 Xoá tài khoản và xuất dữ liệu

- **Xoá tài khoản** (Cài đặt → Vùng nguy hiểm): nhập lại mật khẩu + gõ chữ `XOA` để xác nhận. Function `deleteAccount` xoá toàn bộ `users/{uid}` (kể cả subcollection), thư mục Storage `users/{uid}/`, rồi xoá tài khoản Auth.
- **Xuất dữ liệu**: function `exportUserData` gom hồ sơ, tủ đồ, bộ đồ, hội thoại thành một file JSON + đường dẫn ảnh có hạn (signed URL), trả link tải.

---

## 3. Hồ sơ và tính "hoàn tất"

- Trường bắt buộc: giới tính, chiều cao (100–250 cm), cân nặng (25–300 kg), dáng người. Các số đo còn lại tuỳ chọn, nếu nhập thì phải trong khoảng hợp lý (ví dụ vòng eo 40–200 cm).
- **Dài chân trong** (`inseamCm`, 35–120 cm) và **dài lưng** (`backLengthCm`, 30–60 cm) là tuỳ chọn, đã có trong code (`shared/measurements.ts`).
  - Ô nhập để trống được, nhận cả dấu phẩy lẫn dấu chấm, làm tròn 0,5 cm.
  - Ngoài khoảng thì báo lỗi ngay dưới ô và khoá nút Lưu, không tự ép số.
  - Xoá trống ô là xoá số đo (`null` trên máy, `deleteField()` trên mây).
- `profileCompleted = true` khi đủ trường bắt buộc. Cờ này do frontend tính khi lưu và được Security Rules kiểm tra lại (không cho ghi `true` khi thiếu trường).
- Lưu theo kiểu **có nút Lưu**, không tự lưu từng ô. Nếu rời trang khi còn thay đổi chưa lưu thì hỏi xác nhận (`beforeunload` + chặn điều hướng của router).
- Mỗi lần lưu thành công ghi thêm một bản vào `profileHistory` (xem [kien-truc.md](kien-truc.md) mục 4.2). Giữ tối đa 50 bản, bản cũ nhất bị xoá bởi function.

---

## 4. Phân quyền

Chi tiết đầy đủ (ma trận quyền, Custom Claims, Rules, luật bảo vệ) nằm ở [phan-quyen.md](phan-quyen.md). Tóm tắt:

| Vai trò | Quyền |
|---|---|
| `user` | Đọc/ghi dữ liệu của chính mình; đọc kho đồ chung đã đăng |
| `admin` | Thêm, sửa, ẩn quần áo trong kho chung; xem tình trạng hệ thống và danh sách tài khoản (chỉ xem) |
| `sysadmin` | Mọi quyền của admin, thêm: cấp/thu hồi vai trò, khoá/mở khoá tài khoản, chỉnh hạn mức và cấu hình model |

- Không vai trò nào xem được ảnh cơ thể, tủ đồ hay hội thoại riêng của người dùng khác.
- Frontend ẩn menu theo vai trò để tiện dùng, nhưng **quyết định thật luôn nằm ở Rules và Functions**.
- Mọi thao tác quản trị ghi `auditLogs`.

---

## 5. Kiểm tra dữ liệu đầu vào

Mọi dữ liệu được kiểm tra **ba lớp**; lớp sau không tin lớp trước:

1. **Frontend**: để báo lỗi ngay dưới ô nhập, rõ ràng, bằng tiếng Việt. Dùng một schema dùng chung (ví dụ Zod) cho cả form và wrapper callable.
2. **Cloud Functions**: kiểm tra lại toàn bộ tham số bằng cùng schema; sai thì trả `invalid-argument`.
3. **Security Rules**: kiểm tra kiểu, độ dài, khoảng giá trị và danh sách trường được phép ghi (`request.resource.data.keys().hasOnly([...])`).

Luật cụ thể:

| Dữ liệu | Luật |
|---|---|
| Ảnh tải lên | JPEG/PNG/WebP; ≤ 10 MB trước khi nén; Storage Rules chặn `> 5 MB` sau nén và kiểm tra `contentType` |
| Tin nhắn trợ lý | 1–2000 ký tự, bỏ khoảng trắng đầu cuối |
| Tên hiển thị | 2–50 ký tự |
| Văn bản tự do | Không render như HTML; React tự escape, cấm `dangerouslySetInnerHTML` với dữ liệu người dùng hoặc AI |
| Kết quả Gemini | Luôn coi là dữ liệu không tin cậy: parse JSON theo schema, sai thì thử lại 1 lần rồi báo lỗi |

---

## 6. Trạng thái giao diện chuẩn

Mỗi khối dữ liệu trên mọi trang phải xử lý đủ 4 trạng thái:

| Trạng thái | Hiển thị |
|---|---|
| Đang tải | Skeleton đúng hình dạng nội dung (không dùng spinner toàn trang, trừ lúc kiểm tra đăng nhập) |
| Trống | Câu giải thích + nút hành động, ví dụ tủ đồ trống → "Thêm món đồ đầu tiên" |
| Lỗi | Thông báo dễ hiểu + nút "Thử lại"; không hiện mã lỗi thô |
| Có dữ liệu | Nội dung |

Thao tác người dùng:

- Nút đang xử lý thì khoá và hiện trạng thái ("Đang lưu…").
- Kết quả thao tác báo bằng **toast**: thành công tự ẩn sau 3 giây, lỗi giữ đến khi người dùng đóng.
- Thao tác xoá (món đồ, bộ đồ, hội thoại) hỏi xác nhận, hoặc cho **Hoàn tác** trong 5 giây trước khi xoá thật.
- Tác vụ AI chạy lâu (nhận diện, tạo ảnh) hiện tiến trình theo `status` trong Firestore, người dùng có thể rời trang và quay lại vẫn thấy đúng trạng thái.

---

## 7. Xử lý lỗi

### 7.1 Mã lỗi thống nhất

Functions chỉ ném `HttpsError` với các mã sau; frontend có một bảng dịch mã → câu tiếng Việt:

| Mã | Khi nào | Câu hiển thị |
|---|---|---|
| `unauthenticated` | Không có hoặc hết phiên | Phiên đăng nhập đã hết hạn |
| `permission-denied` | Truy cập dữ liệu không phải của mình, tài khoản bị khoá | Bạn không có quyền thực hiện thao tác này |
| `invalid-argument` | Tham số sai | Dữ liệu không hợp lệ (kèm chi tiết trường) |
| `not-found` | Món đồ / bộ đồ không còn | Không tìm thấy dữ liệu |
| `resource-exhausted` | Vượt hạn mức ngày | Bạn đã dùng hết lượt hôm nay, thử lại sau 00:00 |
| `failed-precondition` | Hồ sơ chưa hoàn tất, tủ đồ chưa đủ món | Câu nêu rõ cần làm gì |
| `unavailable` | Gemini lỗi tạm thời / quá tải | Hệ thống AI đang bận, thử lại sau |
| `internal` | Lỗi không lường trước | Đã có lỗi xảy ra (kèm mã tra cứu) |

### 7.2 Thử lại

- Functions gọi Gemini: thử lại tối đa 2 lần với backoff (1 s, 3 s) cho lỗi mạng/429/5xx; **không** thử lại lỗi 4xx khác.
- Frontend không tự thử lại thao tác ghi; chỉ hiện nút "Thử lại".
- Mọi tác vụ AI có `requestId` do frontend sinh; function bỏ qua request trùng `requestId` (idempotent) để bấm hai lần không tốn hai lượt.

### 7.3 Error Boundary

- Mỗi trang bọc trong React Error Boundary: lỗi một trang không làm trắng cả ứng dụng, thanh bên trái vẫn dùng được.
- Viewer 3D có boundary riêng: lỗi WebGL hoặc tải model → hiện ảnh tĩnh / thông báo "Thiết bị không hỗ trợ 3D", vẫn cho dùng lớp ảnh chân thực.

---

## 8. Hạn mức và chống lạm dụng

| Tác vụ | Hạn mức mặc định / người / ngày |
|---|---|
| `analyzeGarment` | 50 |
| `chatAssistant` | 100 tin nhắn |
| `suggestOutfits` | 30 |
| `renderRealistic` | 10 |
| Tổng số món trong tủ đồ | 500 |

Hạn mức mặc định nằm ở `config/quotas`. Sysadmin chỉnh được hạn mức chung hoặc hạn mức riêng cho từng người (`users/{uid}.quotaOverride`). Thao tác của admin trong kho chung không tính vào hạn mức.

- Đếm trong `users/{uid}.usage` bằng **transaction**: đọc → kiểm tra → tăng → rồi mới gọi Gemini. Gọi Gemini thất bại thì hoàn lại lượt.
- Ngày tính theo múi giờ `Asia/Ho_Chi_Minh`; lưu `usage.date`, sang ngày mới thì reset.
- Bật **Firebase App Check** (reCAPTCHA Enterprise) cho Functions, Firestore, Storage để chặn gọi API ngoài website.
- Đặt `maxInstances` cho từng function và cảnh báo ngân sách (Budget Alert) trên Google Cloud.

---

## 9. Đồng bộ dữ liệu và ngoại tuyến

- Dữ liệu sống (tủ đồ, trạng thái tác vụ AI, hội thoại đang mở) dùng `onSnapshot`. Listener được huỷ khi rời trang.
- Bật Firestore offline persistence (`persistentLocalCache` + `persistentMultipleTabManager`): xem được dữ liệu đã tải khi mất mạng; ghi được xếp hàng và tự gửi khi có mạng lại.
- Tác vụ AI **không** chạy được khi ngoại tuyến: các nút AI bị khoá và có ghi chú.
- Thanh báo "Bạn đang ngoại tuyến" dựa trên sự kiện `online`/`offline` của trình duyệt.
- Backend chỉ dùng Firebase (xem [quyet-dinh.md](quyet-dinh.md) ADR-002), nên `onSnapshot` và offline persistence thay cho WebSocket server và BroadcastChannel. [ho-so-nguoi-dung.md](../vanhanh/ho-so-nguoi-dung.md) đã được viết lại theo hướng này.

---

## 10. Hiệu năng

- Chia code theo route (`React.lazy`); trang Ma-nơ-canh và Three.js chỉ tải khi mở.
- Ảnh: nén ở trình duyệt trước khi tải lên; danh sách dùng ảnh thu nhỏ (thumbnail 256px do function tạo), `loading="lazy"`, có `width`/`height` để tránh nhảy layout.
- Danh sách dài (tủ đồ, lịch sử) phân trang 24 mục/lần bằng `limit` + `startAfter`, tải thêm khi cuộn.
- Ô tìm kiếm/lọc tủ đồ: debounce 300 ms, lọc ở client trên dữ liệu đã tải.
- Mục tiêu Core Web Vitals: LCP < 2,5 s, INP < 200 ms, CLS < 0,1 trên 4G.

---

## 11. Giao diện chung, khả năng truy cập, ngôn ngữ

- **Responsive**: mobile-first. Dưới 768px thanh bên trái thành menu ngăn kéo (nút hamburger) hoặc thanh điều hướng dưới đáy.
- **Giao diện sáng/tối**: theo hệ thống mặc định, người dùng đổi được trong Cài đặt, lưu ở `users/{uid}.preferences.theme` và `localStorage` (để không nhấp nháy khi tải trang).
- **Khả năng truy cập (WCAG 2.1 AA)**:
  - Mọi ô nhập có `<label>`; lỗi gắn bằng `aria-describedby`.
  - Dùng được hoàn toàn bằng bàn phím; focus nhìn thấy rõ; hộp thoại giữ focus bên trong và đóng bằng `Esc`.
  - Ảnh món đồ có `alt` lấy từ kết quả nhận diện ("Áo sơ mi trắng kẻ sọc").
  - Tương phản chữ ≥ 4.5:1; tôn trọng `prefers-reduced-motion` (tắt tự xoay 3D).
- **Ngôn ngữ**: tiếng Việt mặc định, chuỗi giao diện đặt trong file dịch (i18n) để thêm tiếng Anh sau. Ngày giờ dùng `Intl` với `vi-VN`. Gemini được yêu cầu trả lời bằng ngôn ngữ giao diện.
- **SEO và chia sẻ**: chỉ các trang công khai (`/`, `/terms`, `/privacy`) cần `<title>`, meta description, Open Graph, `sitemap.xml`. Mọi trang `/app/*` đặt `noindex`. `robots.txt` chặn `/app` và `/admin`.
- Mỗi route đặt `document.title` riêng ("Tủ đồ · Smart-wardrobe").

---

## 12. Bảo mật web

Bổ sung cho mục 6 của [kien-truc.md](kien-truc.md):

- HTTPS bắt buộc (Firebase Hosting mặc định), thêm header HSTS.
- Header trong `firebase.json`: `Content-Security-Policy` (chỉ cho phép script từ chính site và domain Firebase/Google cần thiết), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (tắt camera/micro nếu không dùng), `X-Frame-Options: DENY`.
- Không lưu dữ liệu nhạy cảm trong `localStorage` ngoài thứ Firebase SDK tự quản lý.
- Ảnh trong Storage không public; chỉ truy cập qua SDK theo Rules hoặc URL có token.
- Prompt injection: nội dung người dùng gửi cho Gemini được đặt trong phần dữ liệu, tách khỏi system prompt; kết quả AI không bao giờ được dùng để quyết định quyền hay đường dẫn file mà không kiểm tra lại.
- Đánh giá phụ thuộc định kỳ (`npm audit`, Dependabot).

---

## 13. Quyền riêng tư

- Ảnh cơ thể và số đo là dữ liệu nhạy cảm: chỉ dùng cho tính năng của chính người dùng, không dùng huấn luyện, nêu rõ trong `/privacy`.
- Trước lần đầu tải ảnh toàn thân, hiện hộp đồng ý riêng; người dùng có thể xoá ảnh này bất cứ lúc nào.
- Cookie/analytics: chỉ bật Google Analytics sau khi người dùng đồng ý (banner đồng ý); không gửi số đo, ảnh hay nội dung chat vào analytics.
- Xoá tài khoản xoá hết dữ liệu (mục 2.5). Bản sao lưu (nếu bật) tự hết hạn sau 30 ngày.

---

## 14. Nhật ký, giám sát, thống kê

- **Functions**: log có cấu trúc (`logger.info/warn/error`) gồm `uid`, tên function, `requestId`, thời gian xử lý, mã lỗi. **Không** log nội dung ảnh, số đo, tin nhắn hay API key.
- **Frontend**: bắt lỗi chưa xử lý (`window.onerror`, `unhandledrejection`, Error Boundary) và gửi về một dịch vụ theo dõi lỗi (ví dụ Sentry) kèm mã tra cứu hiện cho người dùng.
- **Cảnh báo**: tỉ lệ lỗi function > 5% trong 10 phút, chi phí vượt ngân sách, Gemini trả `429` liên tục.
- **Thống kê sản phẩm** (đã đồng ý): sự kiện ở mức hành động — `item_uploaded`, `outfit_suggested`, `render_requested`, `assistant_message_sent` — không kèm nội dung.

---

## 15. Kiểm thử và triển khai

- **Unit test**: hàm kiểm tra schema, hàm tính morph từ hồ sơ, hàm kiểm tra bộ đồ hợp lệ, bảng dịch lỗi.
- **Test Security Rules** bằng `@firebase/rules-unit-testing` trên Emulator: chủ sở hữu đọc/ghi được, người khác bị chặn, trường do AI ghi không sửa được từ client.
- **Test Functions** trên Emulator với Gemini được giả lập (mock) để không tốn tiền và kết quả ổn định.
- **E2E** (Playwright): đăng ký → hồ sơ → tải món đồ → gợi ý → mở ma-nơ-canh → đăng xuất.
- **CI** (GitHub Actions) mỗi pull request: lint, type-check, unit test, rules test, build. Merge vào `main` thì deploy lên kênh preview; deploy production làm thủ công hoặc khi gắn tag.
- Môi trường tách biệt: hai project Firebase `dev` và `prod`, mỗi bên một `GEMINI_API_KEY`.

---

## 16. Danh sách kiểm tra cho mỗi trang mới

- [ ] Route đã khai báo đúng quyền trong guard (mục 1)
- [ ] Đủ 4 trạng thái: tải / trống / lỗi / có dữ liệu (mục 6)
- [ ] Form có kiểm tra 3 lớp (mục 5) và chặn rời trang khi chưa lưu
- [ ] Lỗi đi qua bảng dịch mã lỗi (mục 7)
- [ ] Listener được huỷ khi rời trang
- [ ] Dùng được bằng bàn phím, có label, alt, tương phản đủ (mục 11)
- [ ] Hiển thị đúng ở 375px, 768px, 1280px
- [ ] Đặt `document.title`
- [ ] Có test cho logic mới và cho Rules nếu thêm collection

---

## 17. Các điểm còn mở

- Có thêm đăng nhập Google hay chỉ email + mật khẩu.
- Con số hạn mức cụ thể ở mục 8 (đang là đề xuất).
- Dịch vụ theo dõi lỗi frontend (Sentry hay Firebase Crashlytics cho web hay chỉ log).
