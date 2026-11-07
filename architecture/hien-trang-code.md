# Hiện trạng code và lộ trình chuyển sang kiến trúc đích

> So sánh code đang có trong repo với kiến trúc đích ở [kien-truc.md](kien-truc.md). Cập nhật file này mỗi khi một phần được chuyển xong.
>
> Cập nhật lần cuối: 2026-11-07. Mục 1–4 viết theo code ở commit `c4d1645`; code hiện tại trên `main` (bản AI Studio `c70e906`, `7683ab7`) chưa được đối chiếu lại từng phần. Mục 5 đã cập nhật theo `7683ab7`.

## 1. Code hiện có

Code là một app sinh từ Google AI Studio, gồm hai phần chạy chung một tiến trình Node:

| Phần | File | Vai trò |
|---|---|---|
| Máy chủ | `server.ts` (Express) | Phục vụ SPA (dev: Vite middleware; prod: `dist/`) và 5 API gọi Gemini |
| Giao diện | `src/App.tsx`, `src/components/*` | Một trang "studio" duy nhất, dock điều khiển ở dưới đáy với 5 tab: `body`, `wardrobe`, `accessories`, `pose`, `ai_stylist` |
| 3D | `src/three/*` | Three.js thuần (không dùng React Three Fiber). Dựng người theo số đo, tóc, mặt, chất liệu vải PBR, điều khiển từng khớp xương |
| Mô hình | `public/models/*.glb` | Mô hình người dạng Ready Player Me và các animation đứng/đi cho nam và nữ |
| Dữ liệu mẫu và lời gọi API | `src/data/presets.ts` | Preset quần áo, xu hướng, và các hàm `fetch('/api/...')` |
| Kiểu dữ liệu | `src/types/studio.ts` | `BodyMeasurements`, `ActiveDockTab`, `FitZoneReport`… |

Các API trong `server.ts`:

| API | Việc | Model |
|---|---|---|
| `POST /api/extract-garments` | Nhận ảnh base64, tách ra các món đồ có trong ảnh | `gemini-3-flash-preview` (+ `gemini-2.5-flash`) |
| `POST /api/ai-stylist` | Gợi ý phối đồ theo xu hướng và mô tả của người dùng | `gemini-3-flash-preview` |
| `POST /api/color-palette` | Gợi ý bảng màu phối từ màu chính, loại đồ, chất liệu | `gemini-3-flash-preview` |
| `POST /api/weather-forecast` | Lấy thời tiết thật bằng Gemini + Google Search, để gợi ý đồ theo thời tiết | `gemini-3-flash-preview` |
| `POST /api/pose-ai` | Chuyển mô tả tư thế bằng lời thành góc khớp cho ma-nơ-canh | `gemini-3-flash-preview` |

Các tính năng chỉ chạy trên trình duyệt:
- Camera AR (`getUserMedia`) đặt ma-nơ-canh vào khung cảnh thật.
- Quay video xoay 360°.
- Xuất mô hình ra `.glb`.

Về API key: key nằm trong `GEMINI_API_KEY` của **tiến trình server**, không bị đóng gói vào frontend. Việc này đã đúng nguyên tắc ADR-003.

## 2. Khoảng cách so với kiến trúc đích

| Hạng mục | Hiện tại | Đích |
|---|---|---|
| Backend | Express trong `server.ts` | Cloud Functions (ADR-002) |
| Đăng nhập | Không có | Firebase Auth email + mật khẩu |
| Lưu dữ liệu | Không có. Mọi thứ nằm trong state React, tải lại trang là mất | Firestore + Storage |
| Điều hướng | Một trang, dock dưới đáy | Router, thanh bên trái, `/app/*` và `/admin/*` |
| Phân quyền | Không có | 3 vai trò ([phan-quyen.md](phan-quyen.md)) |
| Hạn mức, App Check | Không có. Ai gọi được `/api/*` cũng tiêu tốn key | Có (logic-he-thong mục 8) |
| 3D | Three.js thuần | **Giữ Three.js thuần** (ADR-007) |
| Ảnh chân thực do AI tạo | Chưa có | `renderRealistic` |
| Kho đồ chung | Preset cứng trong `presets.ts` | `catalog` trong Firestore do admin quản lý |

## 3. Bảng chuyển đổi API sang Cloud Functions

| Hiện tại | Callable function đích | Ghi chú |
|---|---|---|
| `/api/extract-garments` | `analyzeGarment` | Đổi đầu vào từ base64 trong body sang ảnh đã upload Storage; ghi kết quả vào `wardrobe` |
| `/api/ai-stylist` | `suggestOutfits` | Thêm dữ liệu tủ đồ thật + catalog; kiểm tra ref như kien-truc 4.5 |
| `/api/color-palette` | `colorPalette` | Function mới, chỉ đọc, tính hạn mức chung với `suggestOutfits` |
| `/api/weather-forecast` | `weatherForecast` | Function mới; cache kết quả theo khu vực 30 phút trong `cache/weather_{geohash}` |
| `/api/pose-ai` | `poseFromText` | Function mới, chỉ đọc |
| (chưa có) | `chatAssistant`, `renderRealistic`, `admin*` | Viết mới |

## 4. Thứ tự chuyển đề xuất

Mỗi bước giữ cho app chạy được:

1. Thêm Firebase (Auth, Firestore, Storage, Emulator), trang đăng nhập và route guard. Studio hiện tại trở thành trang `/app/studio`.
2. Lưu hồ sơ cơ thể (`BodyMeasurements`) vào `users/{uid}` thay cho state tạm.
3. Chuyển từng API sang Cloud Functions theo bảng ở mục 3, kèm hạn mức và App Check. Gỡ endpoint Express tương ứng sau khi function chạy ổn.
4. Tủ đồ cá nhân (`wardrobe`) và Lịch sử.
5. Khu quản trị và kho đồ chung. Chuyển preset trong `presets.ts` thành dữ liệu `catalog` ban đầu.
6. Xoá `server.ts` và `express`. Hosting chuyển sang Firebase Hosting.

## 5. Lệnh với code hiện tại

| Việc | Lệnh |
|---|---|
| Cài | `npm install` (repo có cả `bun.lock`, nên `bun install` cũng dùng được) |
| Chạy dev | `npm run dev`: chạy `server.ts` bằng `tsx` (Express, Vite chạy dạng middleware) ở cổng 3000 |
| Kiểm tra kiểu | `npm run lint` (`tsc --noEmit`) |
| Build | `npm run build` (ra `dist/`) |
| Chạy bản build | `npm start` |
| Biến môi trường | `GEMINI_API_KEY` trong `.env.local` (hoặc `.env`). `server/studioApi.ts` được import đầu tiên trong `server.ts` và nạp `.env.local` trước, nên cả API Aura lẫn API Studio đều đọc được key. Cả hai file đã nằm trong `.gitignore` |
| Yêu cầu | Node.js 22 trở lên. `esbuild` phải ở bản `^0.27` để khớp Vite 8, nếu không `npm install` báo lỗi ERESOLVE |

Repo chưa có test.

## 6. Ma-nơ-canh 3D trong app AI Studio

Từ commit `23f82d6`, `App.tsx` là app của AI Studio: đăng nhập (`WardrobeDoorAuth`) → onboarding (`OnboardingModal`) → không gian làm việc có thanh bên trái gồm 4 mục: Gợi ý phối đồ, **Ma-nơ-canh 3D**, Tủ đồ, Lịch sử phối đồ. App chỉ có **một** ma-nơ-canh: Studio 3D người thật (mô hình GLB). Bản khối hình học `MannequinTryOnStudio` đã bị xoá.

| Thành phần | File | Ghi chú |
|---|---|---|
| Lõi 3D (không sửa) | `src/components/MannequinViewport.tsx`, `src/three/*` | Như cũ |
| Lớp vỏ studio | `src/MannequinStudioApp.tsx` | Gốc là `src/App.tsx` ở commit `9b49a67`. Thêm prop `embedded`, `initialBody`, `wardrobeGarments`, `tryOnGarments`, `onSaveOutfit`. Khi `embedded`: co theo khung chứa, ẩn tên thương hiệu, dòng lưu ý điện thoại, và các nút đã có trên khung 3D (So sánh, AR, Video 360°, Xuất GLB/USDZ, Phối ngẫu nhiên, Lịch sử nội bộ) |
| Cầu nối dữ liệu | `src/studio/wardrobeBridge.ts` | Hồ sơ → số đo studio (dùng chung `calculateRecommendedSize` với đầu trang); món trong Tủ đồ / bộ đồ Gợi ý → `ExtractedGarmentItem` qua `analyzeAndTransformUploadedGarment` (tách nền, dựng 3D trên trình duyệt, có cache) |
| Khung nhúng | `src/studio/StudioSection.tsx`, `src/studio/studio.css` | Tải lười bằng `React.lazy`. `transform` trên `.studio-embed` làm các phần tử `position: fixed` của studio (dock, toast) bám theo khung thay vì cả màn hình |
| API | `server/studioApi.ts` | 5 API của studio (`pose-ai`, `color-palette`, `weather-forecast`, `ai-stylist`, `extract-garments`) dạng Router, gắn trước `express.json` 10mb. Model: `STUDIO_GEMINI_MODEL` (mặc định `gemini-3.8-flash`) |
| Chia chunk | `vite.config.ts` | `three`, `firebase`, `react` thành chunk riêng; `StudioSection` là chunk tải lười (~156 KB gzip) |

Luồng dữ liệu:

- **Số đo:** đổi số đo trong hồ sơ → ma-nơ-canh dựng lại theo cùng số đo hiện ở đầu trang.
- **Tủ đồ:** 16 món mới nhất (trừ Phụ kiện) vào kho đồ của studio, chọn được trong tab "Tủ đồ & Phối màu AI".
- **Ướm thử:** nút "Ướm thử" ở Tủ đồ và ở chi tiết bộ đồ Gợi ý → mở Ma-nơ-canh 3D và mặc ngay các món đó.
- **Lưu:** nút "Lưu phối đồ" của studio ghi vào Lịch sử phối đồ chung (`handleSaveOutfit`), kèm tên từng món và điểm phối đồ. Lịch sử nội bộ của studio vẫn giữ để dùng cho So sánh A|B.

Giới hạn đã biết (nằm ở lõi 3D, chưa sửa): mô hình nam (`PreviewMesh.glb`, 3,8 MB) chỉ được tải sau mô hình nữ nên mất khoảng 20 giây mới hiện; ở màn hình cao 900 px, khung camera cắt một phần đầu và bàn chân. Kế hoạch xử lý: `docs/plans/2026-11-07-build-ma-no-canh.md` trên nhánh `ma-no-canh/build` (nén Draco), cần soạn lại theo code hiện tại.
