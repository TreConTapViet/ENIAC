# Sơ đồ kiến trúc Smart-wardrobe

> Sơ đồ được vẽ theo **C4 Model** (Context, Container, Component) cho các tầng kiến trúc, và theo **UML 2.5** (Sequence, State Machine, Activity, Deployment) cho hành vi. Mỗi sơ đồ kèm chú thích cách hệ thống chạy.
> Nội dung bám theo [kien-truc.md](kien-truc.md), [phan-quyen.md](phan-quyen.md), [du-lieu.md](du-lieu.md) và [logic-he-thong.md](logic-he-thong.md). Khi các file đó đổi, sơ đồ phải đổi theo.
>
> Sơ đồ viết bằng Mermaid: GitHub và VS Code (cài extension Markdown Preview Mermaid Support) hiển thị trực tiếp.
>
> Cập nhật lần cuối: 2026-11-07. Mô tả kiến trúc đích; hiện trạng code xem [hien-trang-code.md](hien-trang-code.md).

## Mục lục

1. [Quy ước ký hiệu](#1-quy-ước-ký-hiệu)
2. [C4 mức 1: Ngữ cảnh hệ thống](#2-c4-mức-1-ngữ-cảnh-hệ-thống)
3. [C4 mức 2: Container](#3-c4-mức-2-container)
4. [C4 mức 3: Thành phần Cloud Functions](#4-c4-mức-3-thành-phần-cloud-functions)
5. [Phân quyền: luồng kiểm tra quyền](#5-phân-quyền-luồng-kiểm-tra-quyền)
6. [Trình tự: Đăng nhập và route guard](#6-trình-tự-đăng-nhập-và-route-guard)
7. [Trình tự: Nhận diện ảnh quần áo](#7-trình-tự-nhận-diện-ảnh-quần-áo)
8. [Trình tự: Gợi ý phối đồ và ma-nơ-canh](#8-trình-tự-gợi-ý-phối-đồ-và-ma-nơ-canh)
9. [Trình tự: Quản trị viên thêm quần áo vào kho chung](#9-trình-tự-quản-trị-viên-thêm-quần-áo-vào-kho-chung)
10. [Trình tự: Người quản trị hệ thống đổi vai trò](#10-trình-tự-người-quản-trị-hệ-thống-đổi-vai-trò)
11. [Máy trạng thái của dữ liệu](#11-máy-trạng-thái-của-dữ-liệu)
12. [Triển khai (Deployment)](#12-triển-khai-deployment)

---

## 1. Quy ước ký hiệu

| Ký hiệu | Ý nghĩa |
|---|---|
| Hình chữ nhật | Hệ thống, container hoặc thành phần (C4). Dòng thứ hai ghi `[loại: công nghệ]` |
| Hình chữ nhật bo tròn | Người dùng theo vai trò (C4 Person) |
| Hình trụ | Kho dữ liệu |
| Khung nét đứt | Ranh giới hệ thống (system boundary) |
| `──►` mũi tên liền | Lời gọi đồng bộ, nhãn ghi *mục đích* và *giao thức* |
| `- -►` mũi tên đứt | Phản hồi, sự kiện hoặc luồng bất đồng bộ (trigger, `onSnapshot`) |
| `alt` / `opt` / `loop` | Khối điều kiện, tuỳ chọn và lặp theo UML Sequence |
| **[Rn]** | Số chú thích, giải thích ngay dưới sơ đồ |

Tất cả các sơ đồ dùng theme `neutral` và chỉ phân biệt bằng hình dạng và nét vẽ, không dùng màu.

---

## 2. C4 mức 1: Ngữ cảnh hệ thống

```mermaid
%%{init: {"theme": "neutral"}}%%
flowchart TB
    U(["Người dùng<br/>[Person]<br/>Quản lý tủ đồ, phối đồ"])
    A(["Quản trị viên<br/>[Person]<br/>Quản lý kho đồ chung"])
    S(["Người quản trị hệ thống<br/>[Person]<br/>Tài khoản, vai trò, hạn mức"])

    SW["Smart-wardrobe<br/>[Software System]<br/>Website phối đồ có trợ lý AI"]

    G["Gemini API<br/>[External System]<br/>Google AI Studio"]
    E["Dịch vụ email của Firebase Auth<br/>[External System]"]

    U -- "Dùng website<br/>HTTPS" --> SW
    A -- "Quản lý kho đồ<br/>HTTPS" --> SW
    S -- "Quản trị hệ thống<br/>HTTPS" --> SW
    SW -- "Nhận diện ảnh, hội thoại,<br/>gợi ý, tạo ảnh [R1]<br/>HTTPS + API key" --> G
    SW -. "Gửi email xác thực,<br/>đặt lại mật khẩu [R2]" .-> E
    E -. "Email" .-> U
```

**Chú thích**

- **[R1]** Smart-wardrobe chỉ phụ thuộc một hệ thống AI bên ngoài là Gemini. Lời gọi luôn xuất phát từ phía server (Cloud Functions) và không bao giờ đi từ trình duyệt.
- **[R2]** Email do chính Firebase Authentication gửi, nên hệ thống không cần dịch vụ email riêng.
- Cả ba vai trò dùng chung một website. Điểm khác nhau chỉ là vai trò trong token đăng nhập (xem mục 5).

---

## 3. C4 mức 2: Container

```mermaid
%%{init: {"theme": "neutral"}}%%
flowchart TB
    U(["Người dùng"])
    AD(["Quản trị viên /<br/>Người quản trị hệ thống"])

    subgraph SW["Smart-wardrobe · Firebase project"]
        direction TB
        SPA["Web App<br/>[Container: React, Vite, Tailwind, Three.js]<br/>Giao diện /app/* và /admin/*,<br/>dựng ma-nơ-canh 3D"]
        HOST["Firebase Hosting<br/>[Container: CDN]<br/>Phân phối file tĩnh, header bảo mật"]
        AUTH["Firebase Authentication<br/>[Container]<br/>Tài khoản, phiên, Custom Claims role"]
        FS[("Cloud Firestore<br/>[Container: NoSQL]<br/>users, catalog, config, auditLogs")]
        ST[("Cloud Storage<br/>[Container: Object store]<br/>Ảnh, ảnh render, mô hình .glb")]
        FN["Cloud Functions<br/>[Container: Node.js 2nd gen]<br/>AI, quản trị, tác vụ nền"]
        RULES["Security Rules<br/>[Policy]<br/>Firestore + Storage"]
        AC["App Check<br/>[Policy: reCAPTCHA Enterprise]"]
        SEC["Secret Manager<br/>[Container]<br/>GEMINI_API_KEY"]
    end

    G["Gemini API<br/>[External System]"]

    U -- "HTTPS" --> HOST
    AD -- "HTTPS" --> HOST
    HOST -- "Tải SPA [R1]" --> SPA
    SPA -- "Đăng nhập, lấy ID token<br/>Firebase SDK" --> AUTH
    SPA -- "Đọc/ghi trực tiếp [R2]<br/>Firebase SDK" --> RULES
    RULES --> FS
    RULES --> ST
    FS -. "onSnapshot [R3]" .-> SPA
    SPA -- "httpsCallable + ID token<br/>+ App Check token [R4]" --> AC
    AC --> FN
    FN -- "Admin SDK, bỏ qua Rules [R5]" --> FS
    FN -- "Admin SDK" --> ST
    FN -- "Đặt claims, khoá tài khoản" --> AUTH
    AUTH -. "Trigger onUserCreate" .-> FN
    FS -. "Trigger onWardrobeDelete" .-> FN
    SEC -- "Nạp key lúc khởi động" --> FN
    FN -- "REST/HTTPS [R6]" --> G
```

**Chú thích**

- **[R1]** Website là SPA tĩnh, không có server render. Hosting chỉ phân phối file và gắn các header bảo mật (CSP, HSTS…) theo [logic-he-thong.md](logic-he-thong.md) mục 12.
- **[R2]** Trình duyệt đọc/ghi Firestore và Storage **trực tiếp** qua SDK. Mỗi request phải qua Security Rules. Rules kiểm tra `uid` và `role` trong token, cùng danh sách trường được phép ghi.
- **[R3]** Đồng bộ thời gian thực giữa các tab và thiết bị dùng listener `onSnapshot` của Firestore. Không có WebSocket server riêng (ADR-002).
- **[R4]** Mọi lời gọi function đều mang hai token: ID token (ai đang gọi, vai trò gì) và App Check token (có đúng là website thật đang gọi không).
- **[R5]** Functions dùng Admin SDK nên **không** bị Rules chặn. Vì vậy mỗi function phải tự kiểm tra quyền (xem mục 5). Đây là nơi duy nhất ghi các trường nhạy cảm: kết quả AI, `role`, `status`, `usage`, `auditLogs`.
- **[R6]** API key chỉ tồn tại trong bộ nhớ của function đang chạy.

---

## 4. C4 mức 3: Thành phần Cloud Functions

```mermaid
%%{init: {"theme": "neutral"}}%%
flowchart LR
    SPA["Web App"]

    subgraph FN["Cloud Functions · Node.js"]
        direction TB
        subgraph AI["Nhóm AI · callable"]
            AG["analyzeGarment"]
            CH["chatAssistant"]
            SU["suggestOutfits"]
            RR["renderRealistic"]
            AX["colorPalette, weatherForecast,<br/>poseFromText"]
        end
        subgraph ADM["Nhóm quản trị · callable"]
            AC1["adminCatalogCreate / Update /<br/>Publish / Archive"]
            AU["adminListUsers"]
            AR["adminSetRole"]
            AS["adminSetUserStatus"]
            AT["adminStats"]
        end
        subgraph BG["Nhóm nền · trigger, lịch"]
            T1["onUserCreate"]
            T2["onWardrobeDelete"]
            T3["cleanupDaily"]
            T4["deleteAccount"]
        end
        subgraph SH["shared"]
            GUARD["requireRole()<br/>[R1]"]
            QUOTA["quota.consume() / refund()<br/>[R2]"]
            GEM["geminiClient<br/>[R3]"]
            SCHEMA["schemas<br/>[R4]"]
            AUDIT["audit.write()<br/>[R5]"]
            IMG["image: cutout, thumb"]
        end
    end

    FS[("Firestore")]
    ST[("Storage")]
    G["Gemini API"]

    SPA --> AI
    SPA --> ADM
    AI --> GUARD
    ADM --> GUARD
    AI --> QUOTA
    AI --> SCHEMA
    ADM --> SCHEMA
    ADM --> AUDIT
    AG --> IMG
    AC1 --> IMG
    AI --> GEM
    AC1 --> GEM
    GEM --> G
    QUOTA --> FS
    AUDIT --> FS
    IMG --> ST
```

**Chú thích**

- **[R1]** `requireRole(minRole)` chạy đầu tiên trong mọi callable. Hàm kiểm tra theo thứ tự: có `auth` → tài khoản `active` → `role` đủ cấp. Nhóm AI yêu cầu `user`, `adminCatalog*` yêu cầu `admin`, `adminSetRole`/`adminSetUserStatus` yêu cầu `sysadmin`.
- **[R2]** Hạn mức được trừ trong một Firestore transaction **trước** khi gọi Gemini, và được hoàn lại nếu Gemini lỗi. Kèm theo là khoá `aiRequests/{requestId}`, nên bấm hai lần không bị tính hai lượt.
- **[R3]** `geminiClient` là nơi duy nhất biết API key. Nó đọc tên model từ `config/models`, thử lại tối đa 2 lần với lỗi tạm thời, và ép đầu ra theo JSON schema.
- **[R4]** Frontend và functions dùng cùng một bộ schema (`shared/schemas`), để kiểm tra dữ liệu đầu vào ở cả hai phía.
- **[R5]** `audit.write()` được gọi trong cùng transaction với thay đổi. Nếu không ghi được log thì thay đổi cũng không xảy ra.

---

## 5. Phân quyền: luồng kiểm tra quyền

Sơ đồ hoạt động (UML Activity) cho **mọi** request vào hệ thống:

```mermaid
%%{init: {"theme": "neutral"}}%%
flowchart TD
    START((" ")) --> Q0{"Request đi qua đâu?"}

    Q0 -- "SDK trực tiếp<br/>Firestore / Storage" --> R1{"Security Rules:<br/>request.auth != null?"}
    R1 -- "không" --> DENY1["Từ chối<br/>permission-denied"]
    R1 -- "có" --> R2{"Tài nguyên thuộc<br/>users/{uid} của chính mình?"}
    R2 -- "có" --> R3{"Chỉ ghi các trường<br/>được phép? [P1]"}
    R3 -- "có" --> OK1["Cho phép"]
    R3 -- "không" --> DENY1
    R2 -- "không" --> R4{"Là catalog?"}
    R4 -- "có, đọc, status = published" --> OK1
    R4 -- "có, đọc draft/archived" --> R5{"token.role ∈<br/>admin, sysadmin?"}
    R5 -- "có" --> OK1
    R5 -- "không" --> DENY1
    R4 -- "có, ghi" --> DENY1
    R4 -- "không" --> DENY1

    Q0 -- "Callable function" --> F0{"App Check hợp lệ?"}
    F0 -- "không" --> DENY2["Từ chối<br/>unauthenticated"]
    F0 -- "có" --> F1{"Có ID token?"}
    F1 -- "không" --> DENY2
    F1 -- "có" --> F2{"users/{uid}.status = active?"}
    F2 -- "không" --> DENY3["Từ chối<br/>permission-denied"]
    F2 -- "có" --> F3{"token.role ≥ vai trò<br/>function yêu cầu? [P2]"}
    F3 -- "không" --> DENY3
    F3 -- "có" --> F4{"Tham số hợp lệ và<br/>thuộc phạm vi được phép? [P3]"}
    F4 -- "không" --> DENY4["Từ chối<br/>invalid-argument"]
    F4 -- "có" --> OK2["Thực thi + ghi audit<br/>nếu là thao tác quản trị"]
```

**Chú thích**

- **[P1]** Rules dùng `diff().affectedKeys().hasOnly([...])`. Ví dụ người dùng chỉ được sửa các trường hồ sơ, không bao giờ được sửa `role`, `status` hay `usage`.
- **[P2]** Thứ tự vai trò: `user` < `admin` < `sysadmin`. Vai trò nằm trong Custom Claims của token, nên kiểm tra không tốn thêm lần đọc database.
- **[P3]** Function kiểm tra cả phạm vi dữ liệu. Ví dụ `itemId` phải thuộc tủ đồ của người gọi, `storagePath` phải nằm dưới `users/{uid}/`, sysadmin không được hạ vai trò của sysadmin cuối cùng.
- Bảng quyền đầy đủ: [phan-quyen.md](phan-quyen.md) mục 2.

---

## 6. Trình tự: Đăng nhập và route guard

```mermaid
%%{init: {"theme": "neutral"}}%%
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant W as Web App
    participant A as Firebase Auth
    participant F as Cloud Functions
    participant D as Firestore

    U->>W: Nhập email, mật khẩu
    W->>A: signInWithEmailAndPassword
    A-->>W: User + ID token (claims.role)
    W->>W: AuthContext lưu user, role [S1]
    W->>D: onSnapshot users/{uid}
    D-->>W: status, profileCompleted
    alt email chưa xác thực
        W-->>U: Chuyển /verify-email
    else status = locked
        W->>A: signOut
        W-->>U: Thông báo tài khoản bị khoá
    else hồ sơ chưa hoàn tất
        W-->>U: Chuyển /app/profile [S2]
    else route /admin/* và role = user
        W-->>U: Trang 403 [S3]
    else hợp lệ
        W-->>U: Hiện trang, thanh bên trái theo vai trò
    end

    Note over A,F: Chỉ khi đăng ký tài khoản mới
    A--)F: Trigger onUserCreate
    F->>A: setCustomUserClaims role = user
    F->>D: Tạo users/{uid} mặc định
```

**Chú thích**

- **[S1]** `role` được đọc từ `getIdTokenResult().claims` và chỉ dùng để quyết định hiển thị. Quyết định quyền thật nằm ở Rules và Functions.
- **[S2]** Hồ sơ là trang đầu tiên sau khi đăng nhập, cho đến khi đủ trường bắt buộc (giới tính, chiều cao, cân nặng, dáng người).
- **[S3]** Frontend chặn để người dùng thấy thông báo rõ ràng. Nếu bỏ qua được frontend thì Rules và Functions vẫn từ chối.

---

## 7. Trình tự: Nhận diện ảnh quần áo

```mermaid
%%{init: {"theme": "neutral"}}%%
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant W as Web App
    participant D as Firestore
    participant S as Storage
    participant F as analyzeGarment
    participant G as Gemini API

    U->>W: Chọn ảnh
    W->>W: Kiểm tra định dạng, nén về 1024px
    W->>D: Tạo wardrobe/{itemId} status = uploading
    W->>S: Upload original.jpg [K1]
    W->>F: analyzeGarment(itemId, requestId)
    F->>F: requireRole(user), kiểm tra itemId thuộc uid
    F->>D: Transaction: kiểm tra và trừ hạn mức [K2]
    F->>D: status = analyzing
    D--)W: onSnapshot: đang phân tích
    F->>S: Đọc ảnh (Admin SDK)
    F->>G: Ảnh + yêu cầu JSON theo schema
    G-->>F: attributes
    alt JSON hợp lệ
        F->>S: Ghi cutout.png, thumb.webp
        F->>D: attributes, status = ready
        D--)W: onSnapshot: món đồ sẵn sàng [K3]
    else sai schema sau 1 lần thử lại, hoặc Gemini lỗi
        F->>D: Hoàn lượt, status = error, errorCode
        D--)W: onSnapshot: hiện lỗi + nút Thử lại
    end
    F-->>W: Kết quả callable
```

**Chú thích**

- **[K1]** Storage Rules chỉ cho ghi vào `users/{uid}/…` của chính mình, với `contentType` là ảnh và kích thước ≤ 5 MB.
- **[K2]** Transaction đọc `usage`, so với `config/quotas` hoặc `quotaOverride`, rồi tăng bộ đếm. Vượt hạn mức thì trả `resource-exhausted` và không gọi Gemini.
- **[K3]** Giao diện cập nhật nhờ `onSnapshot`, không phụ thuộc kết quả callable. Người dùng có thể rời trang trong lúc AI đang xử lý, quay lại vẫn thấy đúng trạng thái.

---

## 8. Trình tự: Gợi ý phối đồ và ma-nơ-canh

```mermaid
%%{init: {"theme": "neutral"}}%%
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant W as Web App
    participant D as Firestore
    participant F as Cloud Functions
    participant G as Gemini API
    participant S as Storage

    U->>W: Chọn dịp, thời tiết, có dùng kho chung
    W->>F: suggestOutfits(context, includeCatalog, requestId)
    F->>D: Đọc hồ sơ, wardrobe ready, catalog published
    F->>G: Danh sách món dạng văn bản + yêu cầu JSON
    G-->>F: Các bộ đồ (items theo vị trí mặc, lý do)
    F->>F: Kiểm tra ref tồn tại, đủ vị trí bắt buộc [M1]
    F->>D: Ghi outfits (source = ai, saved = false)
    F-->>W: Danh sách bộ đồ hợp lệ

    U->>W: Mở bộ đồ trên ma-nơ-canh
    W->>S: Tải model cơ thể, mẫu quần áo, model.glb của catalog
    W->>W: Áp morph theo số đo, áp texture [M2]
    W-->>U: Lớp 3D xoay được ngay

    opt Người dùng bấm "Xem thật"
        W->>F: renderRealistic(outfitId, requestId)
        alt Đã có ảnh với cùng itemsHash
            F-->>W: Trả ảnh cũ, không tính lượt [M3]
        else Chưa có
            F->>D: Trừ hạn mức
            F->>S: Đọc ảnh các món + ảnh toàn thân (nếu có)
            F->>G: Model tạo ảnh
            G-->>F: Ảnh chân thực
            F->>S: Lưu renders/{outfitId}/{renderId}.png
            F->>D: Thêm vào renders[]
            D--)W: onSnapshot: hiện ảnh
        end
    end
```

**Chú thích**

- **[M1]** Kết quả của Gemini luôn bị coi là dữ liệu không tin cậy. Bộ nào tham chiếu món không tồn tại, hoặc thiếu áo + quần / váy liền, đều bị loại.
- **[M2]** Lớp 3D chạy hoàn toàn trên trình duyệt và không tốn lượt AI. Món trong kho chung có `model.glb` riêng nên hiển thị giống thật hơn. Món còn lại dùng mẫu dựng sẵn phủ texture từ `cutout.png`.
- **[M3]** `itemsHash` là hash của danh sách món trong bộ đồ. Bộ đồ không đổi thì không tạo lại ảnh, giúp tiết kiệm chi phí.

---

## 9. Trình tự: Quản trị viên thêm quần áo vào kho chung

```mermaid
%%{init: {"theme": "neutral"}}%%
sequenceDiagram
    autonumber
    actor A as Quản trị viên
    participant W as Web App /admin/catalog
    participant S as Storage
    participant F as adminCatalog*
    participant G as Gemini API
    participant D as Firestore

    A->>S: Upload catalog/{id}/original.jpg (+ model.glb) [Q1]
    A->>W: Nhập tên, thương hiệu
    W->>F: adminCatalogCreate(id, name, brand)
    F->>F: requireRole(admin)
    F->>G: Nhận diện ảnh (không tính hạn mức)
    G-->>F: attributes gợi ý
    F->>S: Ghi cutout.png, thumb.webp
    F->>D: Transaction: catalog/{id} status = draft + auditLogs [Q2]
    F-->>W: Bản nháp với thuộc tính AI điền sẵn
    A->>W: Xem lại, sửa thuộc tính
    W->>F: adminCatalogUpdate
    F->>D: Cập nhật + auditLogs
    A->>W: Bấm Đăng
    W->>F: adminCatalogPublish
    F->>D: status = published + auditLogs
    D--)W: Người dùng thấy món mới qua onSnapshot [Q3]

    opt Xoá món đồ
        A->>W: Bấm Xoá
        W->>F: adminCatalogArchive
        F->>D: status = archived, archivedAt + auditLogs [Q4]
    end
```

**Chú thích**

- **[Q1]** Storage Rules chỉ cho token có `role` là `admin` hoặc `sysadmin` ghi vào `catalog/**`.
- **[Q2]** Mọi thay đổi trong kho chung và bản ghi audit được ghi chung một transaction.
- **[Q3]** Người dùng chỉ đọc được bản `published`. Bản `draft` không bao giờ lộ ra ngoài.
- **[Q4]** Xoá là ẩn trong 30 ngày (ADR-006). `cleanupDaily` xoá hẳn sau thời hạn đó. Trong 30 ngày, sysadmin có thể khôi phục.

---

## 10. Trình tự: Người quản trị hệ thống đổi vai trò

```mermaid
%%{init: {"theme": "neutral"}}%%
sequenceDiagram
    autonumber
    actor S as Người quản trị hệ thống
    participant W as Web App /admin/users
    participant F as adminSetRole
    participant A as Firebase Auth
    participant D as Firestore
    actor T as Tài khoản được đổi

    S->>W: Chọn tài khoản, vai trò mới
    W->>F: adminSetRole(targetUid, role)
    F->>F: requireRole(sysadmin)
    alt Hạ cấp sysadmin cuối cùng
        F-->>W: failed-precondition [V1]
    else Hợp lệ
        F->>A: setCustomUserClaims(targetUid, role)
        F->>A: revokeRefreshTokens(targetUid) [V2]
        F->>D: Transaction: users/{uid}.role + auditLogs
        F-->>W: Thành công
        D--)T: onSnapshot users/{uid}: role đổi
        T->>A: getIdToken(true) để làm mới claims
    end
```

**Chú thích**

- **[V1]** Hệ thống luôn còn ít nhất một sysadmin. Sysadmin đầu tiên được tạo bằng script `scripts/grant-role.mjs`, không qua giao diện.
- **[V2]** Thu hồi token để quyền mới có hiệu lực ngay, không phải chờ token cũ hết hạn sau 1 giờ. Khoá tài khoản (`adminSetUserStatus`) đi theo trình tự tương tự, thêm bước `disabled: true`.

---

## 11. Máy trạng thái của dữ liệu

### 11.1 Món đồ trong tủ đồ cá nhân

```mermaid
%%{init: {"theme": "neutral"}}%%
stateDiagram-v2
    [*] --> uploading: Client tạo document
    uploading --> analyzing: analyzeGarment bắt đầu
    uploading --> error: Upload thất bại
    analyzing --> ready: JSON hợp lệ
    analyzing --> error: Sai schema / Gemini lỗi
    error --> analyzing: Người dùng bấm Thử lại
    ready --> ready: Người dùng sửa userEdits
    ready --> [*]: Xoá (onWardrobeDelete dọn Storage)
    error --> [*]: Xoá
```

### 11.2 Món đồ trong kho chung

```mermaid
%%{init: {"theme": "neutral"}}%%
stateDiagram-v2
    [*] --> draft: adminCatalogCreate
    draft --> draft: adminCatalogUpdate
    draft --> published: adminCatalogPublish
    published --> draft: Gỡ đăng để sửa
    published --> archived: adminCatalogArchive
    draft --> archived: adminCatalogArchive
    archived --> draft: Khôi phục (sysadmin)
    archived --> [*]: Sau 30 ngày hoặc sysadmin xoá hẳn
```

**Chú thích:** chỉ trạng thái `ready` (tủ đồ) và `published` (kho chung) được đưa vào gợi ý phối đồ và trợ lý AI.

---

## 12. Triển khai (Deployment)

```mermaid
%%{init: {"theme": "neutral"}}%%
flowchart LR
    subgraph DEV["Máy lập trình viên"]
        CODE["Mã nguồn"]
        EMU["Firebase Emulator Suite<br/>Auth, Firestore, Storage, Functions<br/>Gemini giả lập [D1]"]
    end
    subgraph GH["GitHub"]
        REPO["TreConTapViet/ENIAC"]
        CI["GitHub Actions<br/>lint, type-check, test, rules test, build"]
    end
    subgraph GCP_DEV["Firebase project: dev"]
        PREV["Hosting preview channel<br/>Functions, Firestore, Storage"]
    end
    subgraph GCP_PROD["Firebase project: prod"]
        PROD["Hosting live<br/>Functions, Firestore, Storage<br/>Secret Manager, App Check"]
    end

    CODE --> EMU
    CODE -- "git push / PR" --> REPO
    REPO --> CI
    CI -- "Merge vào main [D2]" --> PREV
    CI -- "Gắn tag release [D3]" --> PROD
```

**Chú thích**

- **[D1]** Khi chạy test, Gemini được giả lập để kết quả ổn định và không tốn chi phí. Chỉ khi chạy thử thủ công mới gọi Gemini thật bằng key trong `functions/.secret.local`.
- **[D2]** Mỗi lần merge vào `main`, hệ thống tự triển khai lên project `dev` để kiểm thử.
- **[D3]** Production chỉ triển khai khi gắn tag. `dev` và `prod` dùng API key và dữ liệu riêng biệt.
