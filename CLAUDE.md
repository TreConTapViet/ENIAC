# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Smart Wardrobe là website phối đồ tiếng Việt: React 19 + Vite + Tailwind v4 ở client, một tiến trình Express (`server.ts`) gọi Gemini, Firebase Auth/Firestore (project `smart-wardrobe-79480`), và studio ma-nơ-canh 3D viết bằng Three.js thuần. Mọi chữ hiển thị cho người dùng, chú thích code và tài liệu đều bằng tiếng Việt.

## Lệnh

```bash
npm run dev          # tsx server.ts: Express + Vite middleware, cổng 3000 (bận thì tự lùi sang 3001…)
npm run build        # vite build ra dist/ (server.ts phục vụ dist/ khi NODE_ENV=production)
npm run build:vercel # lệnh build của Vercel: vite build + scripts/build-vercel.mjs → .vercel/output (giao diện + function /api)
npm run lint         # tsc --noEmit — bước kiểm tra kiểu duy nhất, repo không có ESLint
npm run check:logic  # test logic: Node test runner qua tsx, chạy scripts/*.test.ts

npx tsx --test scripts/sizing.test.ts                         # một file test
npx tsx --test --test-name-pattern="bảng nữ" scripts/*.test.ts  # một test theo tên
```

- Client đổi thì Vite HMR tự cập nhật. **`server.ts`, `server/` hoặc `shared/` đổi thì phải khởi động lại `npm run dev`.**
- Biến môi trường nằm trong `.env.local`: `GEMINI_API_KEY` và `VITE_FIREBASE_*`. Thiếu `VITE_FIREBASE_*` thì `src/firebase.ts` dùng `firebase-applet-config.json` (project AI Studio cũ).
- Test chỉ import được module không phụ thuộc trình duyệt hay Firebase, tức `shared/*`, `src/services/localStore.ts`, `src/utils/*`, `src/theme/themePrefs.ts`. Test cần `localStorage` thì tự gán một bản giả vào `globalThis`; xem `scripts/localStore.test.ts`.

## Kiến trúc tổng thể

**Ba tầng code**
- `src/`: client.
- `server/app.ts` (+ `server/studioApi.ts`, `server/weatherApi.ts`): Express app chứa mọi API, không listen.
  - `/api/aura/*` dùng cho trợ lý Aura và gợi ý phối đồ.
  - `/api/pose-ai`, `/api/color-palette`, `/api/weather-forecast`, `/api/ai-stylist`, `/api/extract-garments` dùng cho studio.
  - `/api/weather/*` lấy thời tiết thật (Open-Meteo).
  - `server.ts` dùng app này khi chạy trên máy: thêm Vite (dev) hoặc `dist/` (production) rồi listen.
  - Trên Vercel, app này chạy thành **một** Vercel Function `/api` (`server/vercelEntry.ts`), được esbuild gói thành một file trong `scripts/build-vercel.mjs` (Build Output API). Không tạo thư mục `api/` ở gốc: Vercel sẽ tự dựng thêm function. API mới chỉ cần thêm vào `server/app.ts`.
- `shared/`: code mà cả client lẫn server cùng import, gồm `gender`, `sizing`, `styles`, `text`. **`shared/` không được import từ `src/`.**

**Các bước của app (`src/App.tsx`)**

Chưa có thư viện router; app đổi màn hình bằng state, và `useAppRoute` (`src/hooks/useAppRoute.ts`, bảng đường dẫn ở `src/utils/routes.ts`) đồng bộ state đó với địa chỉ trang (`/dang-nhap`, `/bat-dau`, `/goi-y`, `/ma-no-canh`, `/tu-do`, `/lich-su`). Đổi mục thì gọi `setActiveSection`, không tự `pushState`. Thứ tự màn hình:
1. Màn tải.
2. `WardrobeDoorAuth`: đăng nhập email/Google/khách.
3. `OnboardingModal`.
4. `ProfileMigrationGate`: hồ sơ cũ có giới tính "Khác" hoặc phong cách không hợp lệ.
5. Không gian chính.

Các mục của không gian chính nằm trong `src/sections/`. Mỗi mục phải có `key` riêng vì chúng nằm trong `AnimatePresence`.

**Dữ liệu: máy trước, mây sau (`src/hooks/useUserSession.ts`)**
- Mọi thay đổi được ghi vào state và localStorage ngay, với các khoá `sw_profile_{uid}`, `sw_wardrobe_{uid}`, `sw_outfits_{uid}` (xem `src/services/localStore.ts`).
- `src/services/userData.ts` chỉ gọi Firestore khi `canSync`, tức không phải khách **và** email đã xác thực. Khách và tài khoản chưa xác thực không được phát sinh request Firestore nào.
- Lần đầu một máy được phép đồng bộ, `syncLocalToCloud` tải dữ liệu trên máy lên. Sau đó app nghe `onSnapshot`.
- Tài liệu Firestore dùng id cố định bằng id trên máy (`item_…`, `outfit_…`), ghi bằng `setDoc`, không dùng `addDoc`.
- Đồ mẫu `starter_…` chỉ nằm trên máy.
- Hook nghe `onIdTokenChanged`, không dùng `onAuthStateChanged`, để biết cả khi khách nâng cấp (link giữ nguyên uid) và khi email vừa được xác thực.

**Tài khoản khách (`src/services/auth.ts`)**
- Khách dùng Firebase Anonymous. App không thu thập IP.
- Nâng cấp bằng `linkWithPopup` hoặc `linkWithCredential` vào chính uid khách.
- Nếu tài khoản Google/email đã tồn tại: app đặt dấu `sw_pending_guest_merge`, đăng nhập vào tài khoản đó, rồi gộp dữ liệu khách sang.
- Khách đăng xuất: xoá dữ liệu trên máy và xoá luôn tài khoản ẩn danh.

**`firestore.rules` là hợp đồng dữ liệu**
- Mọi quyền yêu cầu `email_verified`.
- Hồ sơ chỉ nhận các trường trong danh sách `hasOnly`.
- Lệnh update bị kiểm tra trên **toàn bộ tài liệu sau khi gộp**. Vì vậy hồ sơ cũ không hợp lệ phải được sửa trong một lần ghi; đó là lý do có `ProfileMigrationGate`.
- Khi đổi luật, sửa đồng thời `firebase-blueprint.json` và `toFirestoreProfile` (`userData.ts`).
- Luật được đăng thủ công trên Firebase Console, thường sau khi code mới đã chạy. Vì thế client phải ghi được dưới **cả luật cũ lẫn luật mới**.

**Giới tính, size, phong cách (`shared/`)**
- Chỉ có `'Nữ' | 'Nam'`. Giá trị "Khác" của hồ sơ cũ được `normalizeGender` trả về `null`.
- `calculateRecommendedSize` có bảng size riêng cho nam và nữ, dùng chung cho đầu trang, khung Hồ sơ, studio và lời nhắc (prompt) của Aura.
- Phong cách lưu bằng id (`minimalist`, `city_boy`…) hoặc `custom:<chữ>`, tối đa 8 cái. `resolveStyleId` và `matchesStyles` so khớp chính xác sau khi bỏ dấu (`normalizeVi`), không so chuỗi con.

**Giao diện: chế độ sáng/tối và màu nhấn**
- Có một nguồn duy nhất: `src/theme/themePrefs.ts` + `src/hooks/useThemePrefs.ts`, lưu ở localStorage `sw_theme_mode`, `sw_accent`, `sw_accent_hex`, `sw_accent_vars`.
- Script nội tuyến trong `index.html` đặt lớp `.dark` và biến màu nhấn trước khi React chạy, để trang không nháy màu khi tải.
- Màu lấy từ token trong `src/index.css`. Dùng `bg-canvas`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-fg-muted`, `bg-accent`, `text-accent-fg`, `text-accent-text`, `bg-accent-soft`, `rounded-control/card/panel`, thay vì mã hex hay `stone-*` cố định.
- `ACCENT_COLORS` trong `src/constants.ts` cũng trỏ vào các token này.

**Studio ma-nơ-canh 3D**
- **Không sửa lõi 3D**: `src/three/*` và `src/components/MannequinViewport.tsx`. Hạn chế sửa `src/MannequinStudioApp.tsx` và `src/components/BottomControlDock.tsx`.
- App nối với studio qua `src/studio/StudioSection.tsx` (tải lười) và `src/studio/wardrobeBridge.ts` (chuyển hồ sơ và tủ đồ sang dữ liệu studio).
- `three` và `firebase` được tách thành chunk riêng trong `vite.config.ts`.

## Quy ước làm việc

- **`main` hay bị ghi đè** bởi AI Studio hoặc người trong nhóm bằng bản cũ: commit làm mất `firestore.rules`, `src/studio/`, `clearLegacySession`…
  - Làm việc trên nhánh riêng.
  - Trước khi dựa vào `main`, chạy `git fetch` rồi so sánh.
  - Khôi phục bằng commit mới. Không force-push.
- **Giữ tài liệu khớp code.** `architecture/` mô tả kiến trúc (`kien-truc.md`, `du-lieu.md`, `logic-he-thong.md`, `phan-quyen.md`, `quyet-dinh.md`, `hien-trang-code.md`). `vanhanh/` là hướng dẫn vận hành. Đổi kiến trúc thì cập nhật `architecture/kien-truc.md` trong cùng thay đổi. Phần lớn `architecture/` vẫn mô tả bản thiết kế đích (Cloud Functions, router) chứ không phải code hiện tại; `hien-trang-code.md` ghi khoảng cách giữa hai bên.
- Một số việc chỉ làm được trên Firebase Console và cần người có quyền: bật nhà cung cấp đăng nhập (Anonymous, Google), đăng `firestore.rules`, thêm Authorized domains.
