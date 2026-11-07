# Hồ Sơ Người Dùng & Đồng Bộ Dữ Liệu Thời Gian Thực (`hosonguoidung.md`)

> **Dự án liên kết**: [https://github.com/TreConTapViet/ENIAC](https://github.com/TreConTapViet/ENIAC)  
> **Phiên bản kiến trúc**: AuraProfile / ENIAC User Profile & Real-Time Sync Module  
> **Cập nhật lần cuối**: 2026-11-06

---

## 1. Tổng Quan Hệ Thống Hồ Sơ Người Dùng

Tài liệu `hosonguoidung.md` định nghĩa cấu trúc dữ liệu, quy trình nghiệp vụ và kiến trúc kỹ thuật cho phân hệ **Hồ Sơ Người Dùng Thông Minh & Đồng Bộ Hóa Thời Gian Thực** thuộc dự án **ENIAC** (`TreConTapViet/ENIAC`). Hệ thống được thiết kế để quản lý toàn diện định danh người dùng, theo dõi hành vi tương tác trực tiếp và tự động tối ưu hóa giao diện trải nghiệm dựa trên sở thích cá nhân.

### Các thành phần cốt lõi trong Hồ sơ người dùng:
1. **Thông tin định danh cơ bản**: Họ và tên (`fullName`), Tên hiển thị (`displayName`), Ngày sinh (`birthDate` kèm tính tuổi tự động), Giới tính (`gender`: Nam, Nữ, Phi nhị nguyên, Bảo mật), Nghề nghiệp (`occupation`), Tổ chức (`organization`) và Tiểu sử (`bio`).
2. **Ảnh đại diện người dùng (`avatarUrl` & Avatar Studio)**: Hỗ trợ tải ảnh từ thiết bị cá nhân, cắt ảnh trực tiếp trên HTML5 Canvas (kéo thả tâm khung hình, thu phóng `100%–250%`, xoay góc nghiêng `-45°` đến `+45°`, tinh chỉnh độ sáng/tương phản) hoặc chọn từ bộ sưu tập chân dung studio mẫu.
3. **Thông tin liên lạc (`ContactInfo`)**: Địa chỉ Email chính & phụ (kèm trạng thái xác thực), Số điện thoại, Địa chỉ cư trú chi tiết (Số nhà/Đường, Thành phố, Quốc gia, Mã bưu chính), Kênh liên hệ ưu tiên (`email`, `phone`, `messaging`, `video_call`), Khung giờ làm việc, Liên hệ khẩn cấp và Liên kết mạng xã hội (`GitHub`, `LinkedIn`, `Website`, `Twitter/X`).
4. **Sở thích cá nhân (`UserPreferences`)**:
   - *Chủ đề quan tâm*: Công nghệ & Hệ thống AI, Thiết kế Giao diện & Kiến trúc, Đầu tư & Kinh tế Số, Sức khỏe & Cân bằng Nhịp sống, Du lịch Khám phá & Ẩm thực, Nghệ thuật & Nhiếp ảnh (mỗi chủ đề có trọng số ưu tiên từ `1` đến `5`).
   - *Tùy biến giao diện tối ưu trải nghiệm*: Chế độ màu (`Sáng` / `Tối`), Tông màu chủ đạo (`Indigo`, `Emerald`, `Rose`, `Amber`, `Cyan`), Mật độ bố cục (`Cô đọng`, `Tiêu chuẩn`, `Thoáng đãng`), Tỷ lệ cỡ chữ (`Nhỏ`, `Vừa`, `Lớn`) và Chế độ giảm chuyển động.
5. **Hành vi người dùng (`UserBehaviorMetrics` & `BehaviorEvent[]`)**:
   - Ghi nhận trực tiếp các sự kiện tương tác (`click`, `view_section`, `profile_update`, `preference_change`, `content_engage`, `avatar_change`, `search_filter`).
   - Đo lường thời gian dừng tại từng phân khu (`sectionDwellMs`), số lượt nhấp chuột, số lần chỉnh sửa hồ sơ, chuỗi ngày hoạt động liên tiếp và biểu đồ mật độ tương tác theo khung giờ.
   - Tính toán **Điểm Tương Thích Danh Mục (`categoryAffinity`)** theo thời gian thực để tự động sắp xếp lại nội dung hiển thị.
6. **Đồng bộ hóa dữ liệu thời gian thực (Real-Time Synchronization)**:
   - Kết hợp **WebSocket Server (`/ws`)** quản lý trạng thái chuẩn trên máy chủ (Server-Authoritative State) và **BroadcastChannel API** để đồng bộ tức thời dưới `50ms` giữa mọi tab trình duyệt và thiết bị đang mở.
   - Hỗ trợ **Cập nhật lạc quan (Optimistic UI)** và **Hàng đợi ngoại tuyến (Offline Queue Reconciliation)** khi mất kết nối mạng tạm thời.

---

## 2. Cấu Trúc Dữ Liệu Chuẩn (Data Schema)

```typescript
export interface UserProfileState {
  id: string;
  fullName: string;           // Họ và tên đầy đủ
  displayName: string;        // Tên hiển thị ngắn gọn
  birthDate: string;          // Ngày sinh (Định dạng ISO YYYY-MM-DD)
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  avatarUrl: string;          // Đường dẫn ảnh hoặc chuỗi DataURL đã cắt từ Canvas
  avatarPresetId: string;     // Mã định danh mẫu ảnh đại diện
  headline: string;           // Tiêu đề giới thiệu chuyên môn
  bio: string;                // Mô tả bản thân
  occupation: string;         // Nghề nghiệp / Vị trí
  organization: string;       // Cơ quan / Tổ chức / Dự án (VD: ENIAC)

  contact: {
    email: string;            // Địa chỉ email chính
    secondaryEmail: string;   // Email dự phòng
    emailVerified: boolean;
    phone: string;            // Số điện thoại liên lạc
    phoneVerified: boolean;
    addressLine: string;      // Địa chỉ chi tiết
    city: string;             // Tỉnh / Thành phố
    country: string;          // Quốc gia
    postalCode: string;       // Mã bưu chính
    preferredChannel: 'email' | 'phone' | 'messaging' | 'video_call';
    availableHours: string;   // Khung giờ nhận liên hệ
    emergencyContact: string; // Liên hệ khẩn cấp
    socialLinks: {
      website: string;
      linkedin: string;
      github: string;         // VD: github.com/TreConTapViet/ENIAC
      twitter: string;
    };
  };

  preferences: {
    themeMode: 'light' | 'dark';
    accentColor: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan';
    layoutDensity: 'compact' | 'comfortable' | 'spacious';
    fontScale: 'sm' | 'md' | 'lg';
    reducedMotion: boolean;
    language: 'vi-VN' | 'en-US';
    timezone: string;
    contentMaturity: 'standard' | 'curated' | 'deep_technical';
    interests: Array<{
      id: 'technology' | 'design' | 'finance' | 'wellness' | 'travel' | 'culture';
      label: string;
      selected: boolean;
      priorityWeight: number; // Trọng số ưu tiên 1 - 5
    }>;
    notifications: {
      securityAlerts: boolean;
      realtimeSyncToast: boolean;
      weeklyDigest: boolean;
      personalizedRecommendations: boolean;
    };
  };

  behaviorMetrics: {
    totalClicks: number;
    totalProfileEdits: number;
    sessionDwellSeconds: number;
    activeStreakDays: number;
    lastActiveSection: string;
    categoryAffinity: Record<string, number>; // Điểm gắn kết 0 - 100 theo danh mục
    sectionDwellMs: Record<string, number>;   // Thời gian dừng (ms) ở từng phân khu
    hourlyActivity: Array<{
      hourLabel: string;
      interactions: number;
      dwellSeconds: number;
    }>;
  };

  behaviorLog: Array<{
    id: string;
    type: string;
    actionLabel: string;
    targetElement: string;
    category?: string;
    durationMs?: number;
    timestamp: string;
    sessionId: string;
    deviceLabel: string;
  }>;

  version: number;
  updatedAt: string;
  lastUpdatedBySession: string;
  lastUpdatedField?: string;
}
```

---

## 3. Thuật Toán Tối Ưu Hóa Trải Nghiệm Theo Sở Thích & Hành Vi

Hệ thống tính toán **Điểm Xếp Hạng Cá Nhân Hóa (`Personalization Rank Score`)** cho từng đơn vị nội dung và bố cục giao diện theo công thức kết hợp giữa **Sở thích khai báo chủ động** và **Hành vi tương tác thực tế**:

$$\text{Score}(c) = \left( \text{Selected}(c) \times 30 \right) + \left( \text{PriorityWeight}(c) \times 8 \right) + \left( \text{CategoryAffinity}(c) \times 0.45 \right)$$

Trong đó:
- $\text{Selected}(c) \in \{0, 1\}$: Trạng thái người dùng bật/tắt chủ đề $c$ trong mục Sở thích cá nhân.
- $\text{PriorityWeight}(c) \in [1, 5]$: Mức độ ưu tiên do người dùng thiết lập.
- $\text{CategoryAffinity}(c) \in [0, 100]$: Điểm hành vi tự động tăng lên mỗi khi người dùng nhấp đọc bài viết (`+4 điểm`), điều chỉnh sở thích (`+5 điểm`) hoặc tương tác bộ lọc thuộc danh mục $c$.

### Cơ chế biến đổi giao diện tức thời:
- **Bố cục (Layout Density)**: Tự động co giãn khoảng cách đệm (`compact`: `p-3.5 gap-3`, `comfortable`: `p-5 gap-5`, `spacious`: `p-7 gap-6`).
- **Tỷ lệ chữ (Font Scale)**: Thay đổi kích thước hiển thị nội dung (`sm`, `md`, `lg`) giúp tối ưu khả năng đọc.
- **Độ sâu nội dung (`contentMaturity`)**: Khi người dùng chọn chế độ *Chuyên sâu kỹ thuật (`deep_technical`)*, các thẻ nội dung tự động mở rộng hộp ghi chú kiến trúc kỹ thuật chi tiết.

---

## 4. Kiến Trúc Đồng Bộ Hóa Thời Gian Thực (Real-Time Sync Flow)

```
┌───────────────────────────┐         WebSocket (/ws)          ┌───────────────────────────┐
│   Phiên Trình Duyệt A     │ ───────────────────────────────► │  Máy Chủ Node.js/Express  │
│ (Chỉnh sửa Tên / Sở thích)│   1. Gửi bản vá `profile:patch`  │ (Server-Authoritative)    │
└─────────────┬─────────────┘      hoặc `behavior:event`       └─────────────┬─────────────┘
              │                                                              │
              │ BroadcastChannel (0ms cùng trình duyệt)                      │ 2. Hợp nhất & Tăng version
              ▼                                                              ▼
┌───────────────────────────┐                                  ┌───────────────────────────┐
│   Phiên Trình Duyệt B     │ ◄─────────────────────────────── │ Phát sóng Delta tới tất   │
│ (Tự động cập nhật UI)     │   3. Đồng bộ trạng thái chuẩn    │ cả các kết nối đang mở    │
└───────────────────────────┘                                  └───────────────────────────┘
```

### Quy tắc đảm bảo toàn vẹn dữ liệu:
- **Idempotency (Chống trùng lặp sự kiện)**: Mỗi sự kiện hành vi có mã định danh duy nhất (`evt_<timestamp>_<hash>`). Máy chủ và trình duyệt kiểm tra tập hợp `processedEventIds` để không bao giờ cộng lặp số liệu khi kết nối lại.
- **Offline Queue & Auto-Reconnection**: Khi mất kết nối mạng (hoặc bật chế độ *Mô phỏng Offline*), các thay đổi được lưu vào hàng đợi `pendingMessagesRef` và tự động đồng bộ tuần tự ngay khi kết nối WebSocket khôi phục.

---

## 5. Hướng Dẫn Tích Hợp Vào Kho Lưu Trữ `TreConTapViet/ENIAC`

Để cập nhật trực tiếp tệp `hosonguoidung.md` và mã nguồn vào kho lưu trữ GitHub `https://github.com/TreConTapViet/ENIAC`:

```bash
# 1. Sao chép kho lưu trữ ENIAC về máy
git clone https://github.com/TreConTapViet/ENIAC.git
cd ENIAC

# 2. Sao chép tệp hosonguoidung.md vào thư mục gốc của dự án
# (Hoặc nhấn nút "Tải xuống hosonguoidung.md" trực tiếp trên giao diện ứng dụng)

# 3. Kiểm tra trạng thái, tạo commit và đẩy lên nhánh chính
git add hosonguoidung.md
git commit -m "docs: thêm đặc tả hồ sơ người dùng và đồng bộ thời gian thực (hosonguoidung.md)"
git push origin main
```
