# Build ma-nơ-canh: sửa lỗi và tối ưu (kế hoạch thực hiện)

> Làm lần lượt từng task. Mỗi bước có ô `- [ ]` để đánh dấu.
> File này thay cho `2026-11-07-sua-loi-ma-no-canh.md`: toàn bộ nội dung sửa lỗi của file đó nằm ở Giai đoạn 1 dưới đây.

**Mục tiêu:** Giữ nguyên bản chất của website và ma-nơ-canh hiện có. Chỉ sửa lỗi, làm cho tải nhanh hơn và chạy mượt hơn.

**Kiến trúc:**
- Giữ nguyên Three.js thuần, `buildHumanMannequinRig` và toàn bộ giao diện studio.
- Logic thuần (tỉ lệ chiều cao, giải phóng tài nguyên, trạng thái tải, gộp cập nhật theo khung hình) được tách ra các file nhỏ trong `src/three/` để test được trên Node.
- Builder 9.800 dòng chỉ được sửa tại các điểm gọi, không viết lại.
- Tài nguyên 3D được nén ở bước build bằng glTF-Transform + Draco, không đổi cấu trúc mô hình.

**Công nghệ:** Xem mục "Công nghệ sử dụng".

**Spec:** [architecture/hien-trang-code.md](../../architecture/hien-trang-code.md), [vanhanh/studio-3d.md](../../vanhanh/studio-3d.md), ADR-004 và ADR-007 trong [architecture/quyet-dinh.md](../../architecture/quyet-dinh.md).

## Ràng buộc chung

- Node.js ≥ 22. Không thêm thư viện **runtime** nào ngoài những gì có sẵn trong `three` (DRACOLoader, Timer).
- Chỉ thêm 4 devDependency: `@gltf-transform/core@4.2.1`, `@gltf-transform/extensions@4.2.1`, `@gltf-transform/functions@4.2.1`, `draco3dgltf@1.5.7`.
- Test viết bằng `node:test` + `node:assert/strict`, chạy bằng `tsx --test`.
- Import file `.ts` phải ghi rõ đuôi `.ts`.
- Mỗi task kết thúc khi: `npm run lint` không lỗi, `npm test` qua, `npm run build` thành công, và ảnh so sánh ở Task 0 không khác biệt (trừ task cố ý đổi hình là Task 1).
- Số dòng ghi trong kế hoạch tính theo commit `64d49f0`. Commit `69623d5` (đổi sang `THREE.Timer`) đã làm các dòng sau `:1686` của `MannequinViewport.tsx` lệch +1. Task trước làm lệch số dòng thì tìm theo đoạn code được trích, không theo số.
- Chuỗi hiển thị cho người dùng và comment viết bằng tiếng Việt, theo phong cách code hiện có.
- Task nào thay đổi kiến trúc thì cập nhật `architecture/hien-trang-code.md` (theo quy định của repo).

## Những thứ KHÔNG được thay đổi

Đây là "bản chất" của ma-nơ-canh. Mọi task phải giữ nguyên:

| Hạng mục | Giữ nguyên |
|---|---|
| Thư viện 3D | Three.js thuần trong `src/three/`. Không chuyển sang React Three Fiber, WebGPU hay engine khác |
| API của rig | `root`, `joints`, `jointIndicators`, `skinMaterial`, `garmentGroups`, `measurementRingsGroup`, `updateBodyMorph`, `updateGarments`, `updateAnimation`, `highlightJoint`, `buildExportablePosedScene`. Chỉ được **thêm** (`dispose`, `loadState`), không đổi hay xoá |
| Kiểu dữ liệu | `BodyMeasurements`, `OutfitConfiguration`, `ActiveDockTab` trong `src/types/studio.ts` |
| Mô hình | Cùng các file người nữ (`rpm_female_1/2`), nam (`PreviewMesh`) và 4 animation. Cùng tên node, mesh, xương, morph target, material |
| Tính năng studio | 5 tab dock, chọn khớp xương, tư thế AI, tóc/trang điểm/da, phụ kiện, thời tiết gió/mưa, So sánh A/B, AR camera, video 360°, xuất `.glb`/`.usdz`, chấm điểm outfit |
| Giao diện | Bố cục, màu, chữ, vị trí nút. Chỉ thêm một lớp thông báo trạng thái tải (Task 3) |
| Backend | `server.ts` và các API `/api/*` |

## Công nghệ sử dụng

| Công nghệ | Đã có / mới | Dùng để |
|---|---|---|
| React 19, TailwindCSS 4, Vite 8 (Rolldown) | Đã có | Giữ nguyên |
| Three.js r186 | Đã có | Giữ nguyên |
| `THREE.Timer` (core r186) | Mới dùng, có sẵn trong `three` | Thay `THREE.Clock` đã lỗi thời, tự bỏ qua thời gian tab bị ẩn |
| `DRACOLoader` + decoder WASM (`three/examples/jsm/libs/draco/gltf/`) | Mới dùng, có sẵn trong `three` | Giải nén hình học GLB đã nén Draco |
| glTF-Transform 4.2.1 + `draco3dgltf` | Mới (devDependency) | Script build lược texture không dùng và nén Draco |
| Rolldown `codeSplitting` (trong Vite 8) | Mới dùng, có sẵn | Tách `three` và `react` thành chunk riêng để trình duyệt cache lâu dài |
| Dynamic `import()` | Có sẵn | Chỉ tải `GLTFExporter`/`USDZExporter` khi người dùng bấm xuất |
| `node:test` + `tsx` | Có sẵn | Unit test cho logic thuần |

**Đã cân nhắc nhưng không dùng:**
- **Meshopt + `KHR_mesh_quantization`:** đã thử, file nhỏ hơn, nhưng cách này đổi toạ độ đỉnh sang số nguyên và đưa tỉ lệ vào node, trong khi `deinterleaveSkinnedGeometry` và `applyAnatomicalBodyMorphToVertex` đọc toạ độ theo mét. Nó cũng tách 1 skin dùng chung thành 9 skin.
- **KTX2/Basis:** cần cài thêm `toktx` bên ngoài Node.
- **React Three Fiber, WebGPU:** sẽ làm đổi bản chất ma-nơ-canh.

## Hiện trạng: lỗi và điểm nghẽn đã xác nhận

Đo ngày 2026-11-07, commit `64d49f0`. `tsc` không báo lỗi.

### Lỗi

| # | Mức | Vị trí | Lỗi | Hậu quả |
|---|---|---|---|---|
| L1 | Cao | `humanMannequinBuilder.ts:8345-8348`, `:8876-8880` | `heightScale = 0.64 + 0.36 * (cm / chuẩn)`: chiều cao chỉ ảnh hưởng 36% lên hình, và công thức bị chép ở hai chỗ | Nhập 150 cm (nữ) thì hình ra khoảng 161 cm; nhập 190 cm thì ra khoảng 176 cm |
| L2 | Cao | `MannequinViewport.tsx:2071-2105` | Cleanup không giải phóng rig: GLB, SkinnedMesh, material, `AnimationMixer`. Rig không có `dispose` | Mỗi lần effect chạy lại (mất WebGL context, HMR) là rò thêm cả bộ mô hình và bộ nhớ GPU |
| L3 | Cao | `MannequinViewport.tsx:1474` | Rig So sánh A/B tải lại 4 GLB và không bao giờ được giải phóng | Gấp đôi bộ nhớ, rò như L2 |
| L4 | Trung bình | `humanMannequinBuilder.ts:7801`, `:8414` | Mô hình tải xong sau khi rig đã bị huỷ vẫn được `root.add` | Đối tượng mồ côi |
| L5 | Trung bình | `humanMannequinBuilder.ts:8754-8756`, `:7823` | Tải GLB lỗi thì chỉ `console.error`, không có trạng thái hay nút thử lại. Bản nữ lỗi thì bản nam cũng không bao giờ tải được | Sân khấu trống mãi |
| L6 | Thấp | `MannequinViewport.tsx:1686` | `THREE.Clock` đã lỗi thời | Cảnh báo trong Console; sẽ hỏng khi nâng Three.js |
| L7 | Thấp | `src/three/skinnedHumanGenerator.ts`, `src/three/humanHairAndFaceBuilder.ts`, `public/models/readyplayer.glb` | Không được import hay tham chiếu ở đâu | Khoảng 1.800 dòng code chết và 1,8 MB file thừa |
| L8 | Thấp | `package.json` | Không có test | Sửa lỗi không có lưới an toàn |

### Điểm nghẽn hiệu năng

| # | Đo được | Nguyên nhân | Hướng xử lý (task) |
|---|---|---|---|
| H1 | JS 1,57 MB trong **một** file (411 KB gzip) | Không tách chunk; exporter GLB/USDZ được tải ngay khi mở trang | Tách `three`/`react`, dynamic import exporter (Task 8). Đã thử: còn `index` 618 KB, `three` 733 KB, `react` 219 KB |
| H2 | Mở trang tải 2,63 MB mô hình nữ; chuyển sang nam tải thêm 3,79 MB | Texture normal/roughness/metalness/AO trong GLB **bị code gán `null` ngay sau khi tải** (`classifyAndPrepareSkinnedMeshes`, `:5845-5848`), nhưng vẫn được tải và giải mã. Hình học chưa nén | Lược texture không dùng + Draco (Task 9). Đã thử: nữ 1 từ 944 thành 331 KB, nữ 2 từ 1.176 thành 432 KB, nam từ 3.789 thành 960 KB (−71%). Cấu trúc node/mesh/xương/material giữ nguyên |
| H3 | Mỗi lần kéo thanh số đo, `updateBodyMorph` chạy đồng bộ cho cả 2 rig | Effect `MannequinViewport.tsx:1080-1091` gọi thẳng; trong đó là các vòng lặp duyệt đỉnh `update*Silhouette` | Gộp về tối đa một lần mỗi khung hình (Task 6). Phải đo trước để xác nhận |
| H4 | Mỗi khung hình tạo khoảng 15 `Vector3`/`Matrix4`/`Quaternion`/`Color` mới | `updateAnimation` (`:8924`, `:9047`, `:9100-9134`, `:9284-9315`, `:9374-9375`, `:9671`) | Dùng biến tạm tái sử dụng, theo đúng kiểu `_qDeltaRoot` sẵn có ở `:8758` (Task 7) |

## Cấu trúc file

| File | Việc | Trách nhiệm |
|---|---|---|
| `src/three/bodyScale.ts` | Tạo | Quy đổi cm ra tỉ lệ theo chiều cao gốc của mô hình |
| `src/three/dispose.ts` | Tạo | Giải phóng geometry, material, texture của một cây Object3D |
| `src/three/loadState.ts` | Tạo | Trạng thái tải mô hình (`loading`/`ready`/`error`) có subscribe |
| `src/three/frameCoalescer.ts` | Tạo | Gộp nhiều yêu cầu trong cùng một khung hình thành một lần chạy |
| `src/three/proceduralTextures.ts` | Sửa | Thêm `isProceduralCachedTexture` |
| `src/three/humanMannequinBuilder.ts` | Sửa | Gọi các file trên; `dispose`, `loadState`, Draco, biến tạm |
| `src/components/MannequinViewport.tsx` | Sửa | `rig.dispose`, lớp trạng thái tải, `Timer`, gộp cập nhật, exporter động |
| `vite.config.ts` | Sửa | `build.rolldownOptions.output.codeSplitting` |
| `scripts/optimize-models.mjs` | Tạo | Lược texture không dùng, nén Draco, kiểm tra cấu trúc không đổi |
| `assets-src/models/` | Tạo | Bản gốc GLB chưa nén (nguồn để build lại) |
| `public/draco/` | Tạo | Decoder Draco chép từ `three` |
| `tests/*.test.ts` | Tạo | Unit test |

---

## Giai đoạn 0: Chuẩn bị

### Task 0: Ghi lại mốc so sánh trước khi sửa

**Files:**
- Tạo: `docs/plans/baseline/` (ảnh chụp và số đo)

**Interfaces:**
- Tạo ra: bộ ảnh `docs/plans/baseline/*.png` và file `docs/plans/baseline/so-do.md`. Mọi task sau dùng để so sánh.

- [ ] **Bước 1: Chạy app**

```
npm install
npm run dev
```

Mở http://localhost:3000 bằng Chrome, cửa sổ 1280×800.

- [ ] **Bước 2: Chụp 6 ảnh chuẩn**

Dùng Chrome DevTools: Ctrl+Shift+P → "Capture screenshot". Chụp các trường hợp sau, lưu vào `docs/plans/baseline/`:

| File | Thiết lập |
|---|---|
| `nu-mac-dinh.png` | Mở trang, không chỉnh gì |
| `nu-150.png` | Chiều cao 150 cm |
| `nu-190.png` | Chiều cao 190 cm |
| `nam-mac-dinh.png` | Chọn "Mẫu Nam" |
| `so-sanh-ab.png` | Bấm "So Sánh (A\|B)" |
| `phu-kien-mua.png` | Bật một phụ kiện (đồng hồ hoặc túi) và hiệu ứng Mưa |

- [ ] **Bước 3: Ghi số đo vào `docs/plans/baseline/so-do.md`**

| Chỉ số | Cách đo | Giá trị |
|---|---|---|
| Dung lượng JS (gzip) | `npm run build`, đọc dòng `dist/assets/*.js` | |
| Dung lượng mô hình tải khi mở trang | DevTools → Network → lọc `.glb` → tổng "transferred" | |
| Thời gian đến khi ma-nơ-canh hiện | Network: thời điểm request `.glb` cuối cùng xong | |
| Long task khi kéo thanh chiều cao 3 giây | DevTools → Performance → Record → kéo → Stop. Đếm task đỏ > 50 ms và ghi task dài nhất | |
| Số lần GC trong 5 giây đứng yên có phụ kiện | Performance → bật "Memory" → đếm "Minor GC" | |
| GPU memory sau 5 lần HMR | Shift+Esc (Task Manager), cột GPU memory, trước và sau khi lưu file `MannequinViewport.tsx` 5 lần | |

- [ ] **Bước 4: Commit**

```
git add docs/plans/baseline
git commit -m "docs(ma-no-canh): mốc so sánh trước khi sửa"
```

---

## Giai đoạn 1: Sửa lỗi

### Task 1: Tỉ lệ chiều cao đúng với số đo (L1, L8)

**Files:**
- Tạo: `src/three/bodyScale.ts`, `tests/bodyScale.test.ts`
- Sửa: `package.json` (scripts)
- Sửa: `src/three/humanMannequinBuilder.ts`: `interface CharacterRigSlot` (`:267`), dựng slot (trước `const mixer = new THREE.AnimationMixer(scene);` ở `:8699`), `:8344-8348`, `:8876-8880`

**Interfaces:**
- Tạo ra: `MIN_HEIGHT_CM = 100`, `MAX_HEIGHT_CM = 300`, `clampHeightCm(heightCm: number): number`, `computeStatureScale(heightCm: number, nativeHeightM: number): number`
- Tạo ra: trường `nativeHeightM: number` trong `CharacterRigSlot`

- [ ] **Bước 1: Thêm script test và viết test thất bại**

Trong `package.json`, thêm vào `"scripts"`:

```json
    "test": "tsx --test tests/*.test.ts",
```

Tạo `tests/bodyScale.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampHeightCm,
  computeStatureScale,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
} from '../src/three/bodyScale.ts';

test('tỉ lệ tỉ lệ thuận với chiều cao: 150 cm trên mô hình gốc 1,68 m', () => {
  assert.equal(computeStatureScale(150, 1.68).toFixed(4), (150 / 168).toFixed(4));
});

test('chiều cao bằng mô hình gốc thì tỉ lệ = 1', () => {
  assert.equal(computeStatureScale(178, 1.78), 1);
});

test('kẹp chiều cao trong khoảng cho phép', () => {
  assert.equal(clampHeightCm(50), MIN_HEIGHT_CM);
  assert.equal(clampHeightCm(999), MAX_HEIGHT_CM);
  assert.equal(computeStatureScale(999, 1.5), MAX_HEIGHT_CM / 150);
});

test('mô hình gốc không hợp lệ thì trả 1 thay vì Infinity/NaN', () => {
  assert.equal(computeStatureScale(170, 0), 1);
  assert.equal(computeStatureScale(170, Number.NaN), 1);
});
```

- [ ] **Bước 2: Chạy, xác nhận thất bại**

```
npm test
```

Kết quả mong đợi: FAIL với lỗi `Cannot find module '.../src/three/bodyScale.ts'`.

- [ ] **Bước 3: Viết `src/three/bodyScale.ts`**

```ts
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 300;

export function clampHeightCm(heightCm: number): number {
  return Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, heightCm));
}

/**
 * Tỉ lệ trục Y để mô hình cao đúng `heightCm`.
 * `nativeHeightM` là chiều cao thật của GLB khi scale = 1 (đo bằng Box3 lúc tải).
 */
export function computeStatureScale(heightCm: number, nativeHeightM: number): number {
  if (!Number.isFinite(nativeHeightM) || nativeHeightM <= 0) return 1;
  return clampHeightCm(heightCm) / 100 / nativeHeightM;
}
```

- [ ] **Bước 4: Chạy test, xác nhận qua**

```
npm test
```

Kết quả mong đợi: `# pass 4`, `# fail 0`.

- [ ] **Bước 5: Dùng trong builder**

Trong `src/three/humanMannequinBuilder.ts`:

1. Sau dòng `import { GLTFLoader } ...` (dòng 2), thêm:

```ts
import { clampHeightCm, computeStatureScale } from './bodyScale.ts';
```

2. Trong `interface CharacterRigSlot`, thêm sau `scene: THREE.Group;`:

```ts
  /** Chiều cao (m) của GLB ở tư thế gốc, scale = 1. Dùng để quy đổi cm → tỉ lệ. */
  nativeHeightM: number;
```

3. Trong `buildSlotFromParts`, ngay trước `const mixer = new THREE.AnimationMixer(scene);`, thêm:

```ts
        scene.updateMatrixWorld(true);
        const nativeHeightM = new THREE.Box3()
          .setFromObject(scene)
          .getSize(new THREE.Vector3()).y;
```

Trong object `return {` ngay bên dưới, thêm `nativeHeightM,` sau `scene,`.

4. Thay đoạn sau (khoảng `:8345`):

```ts
    const baseStatureCm = isMale ? 178 : 168;
    const clampedHeightCm = Math.min(300, Math.max(100, currentBody.heightCm));
    const rawHeightRatio = clampedHeightCm / baseStatureCm;
    const heightScale = 0.64 + 0.36 * rawHeightRatio;
```

bằng:

```ts
    const baseStatureCm = isMale ? 178 : 168;
    const clampedHeightCm = clampHeightCm(currentBody.heightCm);
    const heightScale = computeStatureScale(
      clampedHeightCm,
      activeSlot.nativeHeightM || baseStatureCm / 100
    );
```

5. Thay đoạn sau (khoảng `:8876`):

```ts
    const baseStatureCm = isMale ? 178 : 168;
    const clampedHeightCm = currentBody
      ? Math.min(300, Math.max(100, currentBody.heightCm))
      : baseStatureCm;
    const heightScale = 0.64 + 0.36 * (clampedHeightCm / baseStatureCm);
```

bằng:

```ts
    const baseStatureCm = isMale ? 178 : 168;
    const clampedHeightCm = currentBody
      ? clampHeightCm(currentBody.heightCm)
      : baseStatureCm;
    const heightScale = computeStatureScale(
      clampedHeightCm,
      activeSlot.nativeHeightM || baseStatureCm / 100
    );
```

`activeSlot` ở đây là slot mà `updateAnimation` đang dùng; nó cũng chính là biến được truyền vào `activeSlot.mixer.update(dt)`.

Chạy `npm run lint`. Nếu `rawHeightRatio` còn được dùng ở dòng nào phía dưới, khai báo lại `const rawHeightRatio = clampedHeightCm / baseStatureCm;` ngay sau `heightScale`.

- [ ] **Bước 6: Kiểm tra bằng mắt**

```
npm run lint && npm test && npm run dev
```

So với `baseline/nu-150.png` và `nu-190.png`:
- Đỉnh đầu ở 150 cm phải thấp hơn rõ rệt, ở 190 cm phải cao hơn rõ rệt. Tỉ lệ chiều cao giữa hai ảnh khoảng 150/190 ≈ 0,79.
- Vòng đo ngực/eo/hông vẫn bám đúng cơ thể.
- Ảnh `nu-mac-dinh.png` (168 cm) phải gần như không đổi.

Nếu mặt bị kéo méo, ghi lại trong PR. Khi đó cần tách tỉ lệ đầu khỏi tỉ lệ thân, việc này ngoài phạm vi task.

- [ ] **Bước 7: Commit**

```
git add package.json src/three/bodyScale.ts tests/bodyScale.test.ts src/three/humanMannequinBuilder.ts
git commit -m "fix(ma-no-canh): chiều cao hiển thị tỉ lệ thuận với số đo"
```

---

### Task 2: Giải phóng rig khi tắt viewport (L2, L3, L4)

**Files:**
- Tạo: `src/three/dispose.ts`, `tests/dispose.test.ts`
- Sửa: `src/three/proceduralTextures.ts` (cuối file)
- Sửa: `src/three/humanMannequinBuilder.ts`: `interface HumanMannequinRig` (`:33-65`), sau `let cachedSourceCleanHair` (`:7779`), `.then` tải nam (`:7801`), `.then` tải nữ (`:8414`), trước `return {` cuối (`:9839`)
- Sửa: `src/components/MannequinViewport.tsx`: cleanup (`:2071`)

**Interfaces:**
- Tạo ra: `disposeObject3D(root: THREE.Object3D, options?: { keepTexture?: (tex: THREE.Texture) => boolean }): void`
- Tạo ra: `isProceduralCachedTexture(tex: THREE.Texture): boolean` (export từ `proceduralTextures.ts`)
- Tạo ra: `isSharedCachedTexture(tex: THREE.Texture): boolean` (export từ `humanMannequinBuilder.ts`)
- Tạo ra: `HumanMannequinRig.dispose(): void`

- [ ] **Bước 1: Viết test thất bại**

Tạo `tests/dispose.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { disposeObject3D } from '../src/three/dispose.ts';

function countDispose(target: { addEventListener(type: 'dispose', cb: () => void): void }) {
  let n = 0;
  target.addEventListener('dispose', () => n++);
  return () => n;
}

test('giải phóng geometry, material và texture riêng; mỗi thứ đúng một lần', () => {
  const geo = new THREE.BoxGeometry();
  const ownTex = new THREE.Texture();
  const sharedTex = new THREE.Texture();
  const mat = new THREE.MeshStandardMaterial({ map: ownTex, normalMap: sharedTex });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, mat));

  const g = countDispose(geo);
  const m = countDispose(mat);
  const own = countDispose(ownTex);
  const shared = countDispose(sharedTex);

  disposeObject3D(group, { keepTexture: (t) => t === sharedTex });

  assert.equal(g(), 1);
  assert.equal(m(), 1);
  assert.equal(own(), 1);
  assert.equal(shared(), 0, 'texture dùng chung không được giải phóng');
});

test('xử lý mảng material', () => {
  const a = new THREE.MeshBasicMaterial();
  const b = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [a, b]);
  const ca = countDispose(a);
  const cb = countDispose(b);
  disposeObject3D(mesh);
  assert.equal(ca(), 1);
  assert.equal(cb(), 1);
});
```

- [ ] **Bước 2: Chạy, xác nhận thất bại**

```
npm test
```

Kết quả mong đợi: FAIL với lỗi `Cannot find module '.../src/three/dispose.ts'`.

- [ ] **Bước 3: Viết `src/three/dispose.ts`**

```ts
import * as THREE from 'three';

export interface DisposeOptions {
  /** Trả true cho texture dùng chung (cache cấp module) để không giải phóng nhầm. */
  keepTexture?: (tex: THREE.Texture) => boolean;
}

export function disposeObject3D(root: THREE.Object3D, options: DisposeOptions = {}): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => materials.add(m));
    else if (mat) materials.add(mat);
    const skinned = obj as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skinned.skeleton?.dispose();
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    for (const value of Object.values(m)) {
      if (value instanceof THREE.Texture && !options.keepTexture?.(value)) {
        value.dispose();
      }
    }
    m.dispose();
  });
}
```

- [ ] **Bước 4: Chạy test, xác nhận qua**

```
npm test
```

Kết quả mong đợi: `# pass 6`, `# fail 0`.

- [ ] **Bước 5: Nhận diện texture dùng chung**

Cuối `src/three/proceduralTextures.ts`, thêm:

```ts
export function isProceduralCachedTexture(tex: THREE.Texture): boolean {
  return [normalMapCache, garmentDiffuseCache, skinTextureCache].some((cache) => {
    for (const t of cache.values()) if (t === tex) return true;
    return false;
  });
}
```

Trong `src/three/humanMannequinBuilder.ts`:

1. Thêm import sau dòng import `bodyScale.ts`:

```ts
import { disposeObject3D } from './dispose.ts';
import { isProceduralCachedTexture } from './proceduralTextures.ts';
```

2. Ngay trước `function buildSculptedHairRibbonGeometry(` (khoảng `:1002`), thêm:

```ts
export function isSharedCachedTexture(tex: THREE.Texture): boolean {
  if (tex === sharedHairBumpTex || tex === sharedDummyWhiteTex) return true;
  const caches: Map<unknown, THREE.Texture>[] = [
    compositeTextureCache,
    hairStrandTextureCache,
    fabricBumpTextureCache,
    uploadedPhotoTextureCache,
    eyeIrisTextureCache,
  ];
  for (const cache of caches) {
    for (const t of cache.values()) if (t === tex) return true;
  }
  return isProceduralCachedTexture(tex);
}
```

- [ ] **Bước 6: Thêm `dispose()` vào rig và chặn mô hình tải muộn**

1. `interface HumanMannequinRig`: thêm sau `buildExportablePosedScene: () => THREE.Group;`:

```ts
  /** Dừng animation, gỡ khỏi scene và giải phóng GPU. Gọi được nhiều lần. */
  dispose: () => void;
```

2. Ngay sau `let cachedSourceCleanHair: THREE.SkinnedMesh | null = null;`, thêm:

```ts
  let disposed = false;
```

3. Ngay đầu `.then(([maleGltf, mIdleGltf, mWalkGltf]) => {`, thêm:

```ts
        if (disposed) {
          disposeObject3D(maleGltf.scene);
          return;
        }
```

4. Ngay đầu `.then(([female1Gltf, female2Gltf, fIdleGltf, fWalkGltf]) => {`, thêm:

```ts
      if (disposed) {
        disposeObject3D(female1Gltf.scene);
        disposeObject3D(female2Gltf.scene);
        return;
      }
```

5. Ngay trước `return {` cuối hàm `buildHumanMannequinRig`, thêm:

```ts
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const slot of [femaleSlot, maleSlot]) {
      if (!slot) continue;
      slot.mixer.stopAllAction();
      slot.mixer.uncacheRoot(slot.scene);
    }
    root.removeFromParent();
    disposeObject3D(root, { keepTexture: isSharedCachedTexture });
  };
```

Rồi thêm `dispose,` vào object được return, sau `buildExportablePosedScene,`.

- [ ] **Bước 7: Gọi trong viewport**

Trong cleanup của `MannequinViewport.tsx` (`return () => {` ở `:2071`), ngay trước `controls.dispose();`, thêm:

```ts
      rig.dispose();
      compareRig?.dispose();
      rigRef.current = null;
      compareRigRef.current = null;
```

- [ ] **Bước 8: Kiểm tra**

```
npm run lint && npm test && npm run build && npm run dev
```

- Mở So sánh A/B, rồi lưu `MannequinViewport.tsx` 5 lần (HMR). GPU memory trong Shift+Esc phải trở về gần mức mốc, không tăng dần như số đo ở Task 0.
- Chụp lại 6 ảnh: không khác gì baseline (trừ thay đổi chiều cao của Task 1).
- Đổi nữ ↔ nam, chọn khớp xương, xuất `.glb`: chạy bình thường và Console không có lỗi mới.

- [ ] **Bước 9: Commit**

```
git add src/three/dispose.ts tests/dispose.test.ts src/three/proceduralTextures.ts src/three/humanMannequinBuilder.ts src/components/MannequinViewport.tsx
git commit -m "fix(ma-no-canh): giải phóng rig, rig so sánh và mô hình tải muộn"
```

---

### Task 3: Trạng thái tải mô hình và nút Thử lại (L5)

**Files:**
- Tạo: `src/three/loadState.ts`, `tests/loadState.test.ts`
- Sửa: `src/three/humanMannequinBuilder.ts` (interface, nhánh tải nam/nữ, return)
- Sửa: `src/components/MannequinViewport.tsx` (state ở `:343`, sau `scene.add(rig.root);` ở `:1428`, cleanup, JSX sau `:2360`)

**Interfaces:**
- Dùng: `HumanMannequinRig.dispose()` (Task 2). Nút Thử lại dựng lại rig, nên rig cũ phải được giải phóng.
- Tạo ra: `type ModelLoadState = 'loading' | 'ready' | 'error'`, `interface LoadStateStore { get(): ModelLoadState; set(s: ModelLoadState): void; subscribe(l: (s: ModelLoadState) => void): () => void }`, `createLoadState(initial?: ModelLoadState): LoadStateStore`
- Tạo ra: `HumanMannequinRig.loadState: LoadStateStore`

- [ ] **Bước 1: Viết test thất bại**

Tạo `tests/loadState.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoadState } from '../src/three/loadState.ts';

test('mặc định là loading và subscribe nhận ngay giá trị hiện tại', () => {
  const store = createLoadState();
  const seen: string[] = [];
  store.subscribe((s) => seen.push(s));
  assert.deepEqual(seen, ['loading']);
});

test('chỉ báo khi trạng thái thật sự đổi', () => {
  const store = createLoadState();
  const seen: string[] = [];
  store.subscribe((s) => seen.push(s));
  store.set('ready');
  store.set('ready');
  store.set('error');
  assert.deepEqual(seen, ['loading', 'ready', 'error']);
  assert.equal(store.get(), 'error');
});

test('huỷ đăng ký thì không nhận nữa', () => {
  const store = createLoadState();
  const seen: string[] = [];
  const off = store.subscribe((s) => seen.push(s));
  off();
  store.set('ready');
  assert.deepEqual(seen, ['loading']);
});
```

- [ ] **Bước 2: Chạy, xác nhận thất bại**

```
npm test
```

Kết quả mong đợi: FAIL với lỗi `Cannot find module '.../src/three/loadState.ts'`.

- [ ] **Bước 3: Viết `src/three/loadState.ts`**

```ts
export type ModelLoadState = 'loading' | 'ready' | 'error';

export interface LoadStateStore {
  get(): ModelLoadState;
  set(state: ModelLoadState): void;
  subscribe(listener: (state: ModelLoadState) => void): () => void;
}

export function createLoadState(initial: ModelLoadState = 'loading'): LoadStateStore {
  let state = initial;
  const listeners = new Set<(state: ModelLoadState) => void>();
  return {
    get: () => state,
    set(next) {
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
```

- [ ] **Bước 4: Chạy test, xác nhận qua**

```
npm test
```

Kết quả mong đợi: `# pass 9`, `# fail 0`.

- [ ] **Bước 5: Rig báo trạng thái**

Trong `src/three/humanMannequinBuilder.ts`:

1. Import: `import { createLoadState, type LoadStateStore } from './loadState.ts';`
2. `interface HumanMannequinRig`: thêm `loadState: LoadStateStore;`
3. Ngay sau `let disposed = false;` (Task 2), thêm `const loadState = createLoadState();`
4. Nhánh nữ:
   - Trong `.then`, ngay sau `root.add(femaleSlot.scene);` và `syncAllAppearance();`, thêm `loadState.set('ready');`
   - Trong `.catch((err) => {` của dòng `Failed to load human GLB models`, thêm `if (!disposed) loadState.set('error');`
5. Nhánh nam (trong `ensureMaleSlotLoaded`):
   - Ngay sau `isMaleLoading = true;`, thêm `loadState.set('loading');`
   - Trong `.then`, sau `syncAllAppearance();`, thêm `loadState.set('ready');`
   - Trong `.catch`, sau `isMaleLoading = false;`, thêm `if (!disposed) loadState.set('error');`
6. Thêm `loadState,` vào object được return.

- [ ] **Bước 6: Viewport hiện trạng thái và nút Thử lại**

Trong `src/components/MannequinViewport.tsx`:

1. Import: `import type { ModelLoadState } from '../three/loadState';`
2. Sau `const [webglFallback, setWebglFallback] = useState(false);`, thêm:

```ts
  const [modelLoad, setModelLoad] = useState<ModelLoadState>('loading');
```

3. Sau `scene.add(rig.root);` (rig chính, khoảng `:1428`), thêm:

```ts
    const unsubscribeModelLoad = rig.loadState.subscribe(setModelLoad);
```

4. Trong cleanup, ngay trước `rig.dispose();` (Task 2), thêm `unsubscribeModelLoad();`
5. Ngay sau `<div ref={canvasMountRef} className="relative z-[1] w-full h-full" />`, thêm:

```tsx
      {!webglFallback && modelLoad !== 'ready' && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3"
        >
          {modelLoad === 'loading' ? (
            <p className="text-sm text-slate-500">Đang tải ma-nơ-canh…</p>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Không tải được mô hình ma-nơ-canh. Kiểm tra kết nối mạng rồi thử lại.
              </p>
              <button
                type="button"
                className="pointer-events-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
                onClick={() => setRetryCount((c) => c + 1)}
              >
                Thử lại
              </button>
            </>
          )}
        </div>
      )}
```

- [ ] **Bước 7: Kiểm tra**

```
npm run lint && npm test && npm run dev
```

1. Tải trang: thấy "Đang tải ma-nơ-canh…" trong chốc lát, sau đó ma-nơ-canh hiện ra và dòng chữ biến mất.
2. DevTools → Network → chuột phải `rpm_female_1.glb` → Block request URL → tải lại trang. Phải hiện thông báo lỗi và nút "Thử lại".
3. Bỏ chặn, bấm "Thử lại": ma-nơ-canh hiện ra mà không cần tải lại trang.
4. Chuyển sang "Mẫu Nam" lần đầu: thấy "Đang tải…", sau đó hiện ma-nơ-canh nam.

- [ ] **Bước 8: Commit**

```
git add src/three/loadState.ts tests/loadState.test.ts src/three/humanMannequinBuilder.ts src/components/MannequinViewport.tsx
git commit -m "feat(ma-no-canh): báo trạng thái tải mô hình và nút Thử lại"
```

---

### Task 4: Hoàn tất chuyển sang `THREE.Timer` (L6)

> Commit `69623d5` đã đổi `THREE.Clock` sang `THREE.Timer`: có `timer.update()`, đổi `clock.elapsedTime` thành `timer.getElapsed()`. Task này chỉ còn hai việc: nối Page Visibility và giải phóng timer.

**Files:**
- Sửa: `src/components/MannequinViewport.tsx`: `const timer = new THREE.Timer();` (khoảng `:1686`), cleanup

**Interfaces:**
- Không thay đổi interface nào.

- [ ] **Bước 1: Xác nhận hiện trạng**

```
grep -n "THREE.Clock\|clock\.\|new THREE.Timer\|timer.connect\|timer.dispose" src/components/MannequinViewport.tsx
```

Kết quả mong đợi: có `new THREE.Timer()`, không có `THREE.Clock` hay `clock.`, và **chưa có** `timer.connect` hay `timer.dispose`.

- [ ] **Bước 2: Sửa**

Ngay sau `const timer = new THREE.Timer();`, thêm:

```ts
    timer.connect(document);
```

Trong cleanup, ngay sau `cancelAnimationFrame(frameId);`, thêm `timer.dispose();`.

- [ ] **Bước 3: Kiểm tra**

```
npm run lint && npm test && npm run dev
```

- Console không còn cảnh báo `THREE.Clock`.
- Gió, mưa, vòng sáng và animation đứng/đi chạy với tốc độ như trước.
- Chuyển sang tab khác 10 giây rồi quay lại: ma-nơ-canh không "nhảy cóc".

- [ ] **Bước 4: Commit**

```
git add src/components/MannequinViewport.tsx
git commit -m "fix(ma-no-canh): dùng THREE.Timer thay THREE.Clock đã lỗi thời"
```

---

### Task 5: Xoá code và mô hình không dùng (L7)

**Files:**
- Xoá: `src/three/skinnedHumanGenerator.ts`, `src/three/humanHairAndFaceBuilder.ts`, `public/models/readyplayer.glb`

**Interfaces:**
- Không thay đổi.

- [ ] **Bước 1: Xác nhận lại là không còn chỗ nào dùng**

```
grep -rn "skinnedHumanGenerator\|humanHairAndFaceBuilder\|readyplayer" src index.html server.ts vite.config.ts
```

Kết quả mong đợi: không có dòng nào. Nếu có thì dừng lại, không xoá file đó.

- [ ] **Bước 2: Xoá và kiểm tra**

```
git rm src/three/skinnedHumanGenerator.ts src/three/humanHairAndFaceBuilder.ts public/models/readyplayer.glb
npm run lint && npm test && npm run build
```

Cả ba lệnh phải chạy qua. Sau đó mở app: ma-nơ-canh nữ và nam vẫn tải được.

- [ ] **Bước 3: Commit**

```
git commit -m "chore(ma-no-canh): xoá code và mô hình không dùng"
```

---

## Giai đoạn 2: Tối ưu

### Task 6: Gộp cập nhật số đo theo khung hình (H3)

**Files:**
- Tạo: `src/three/frameCoalescer.ts`, `tests/frameCoalescer.test.ts`
- Sửa: `src/components/MannequinViewport.tsx:1080-1091`

**Interfaces:**
- Tạo ra: `createFrameCoalescer(schedule?: (cb: () => void) => number, cancel?: (id: number) => void): { run(job: () => void): void; cancel(): void }`

- [ ] **Bước 0: Đo trước khi sửa**

Đọc số "Long task khi kéo thanh chiều cao" ở `baseline/so-do.md`. Nếu không có task nào > 16 ms, **bỏ qua task này** và ghi "H3 không tái hiện" vào `so-do.md`. Nếu có thì làm tiếp.

- [ ] **Bước 1: Viết test thất bại**

Tạo `tests/frameCoalescer.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFrameCoalescer } from '../src/three/frameCoalescer.ts';

function fakeFrames() {
  const queue = new Map<number, () => void>();
  let nextId = 1;
  return {
    schedule: (cb: () => void) => {
      const id = nextId++;
      queue.set(id, cb);
      return id;
    },
    cancel: (id: number) => {
      queue.delete(id);
    },
    flush: () => {
      const jobs = [...queue.values()];
      queue.clear();
      jobs.forEach((j) => j());
    },
    size: () => queue.size,
  };
}

test('nhiều yêu cầu trong một khung hình chỉ chạy một lần, với yêu cầu mới nhất', () => {
  const frames = fakeFrames();
  const c = createFrameCoalescer(frames.schedule, frames.cancel);
  const ran: number[] = [];
  c.run(() => ran.push(1));
  c.run(() => ran.push(2));
  c.run(() => ran.push(3));
  assert.equal(frames.size(), 1);
  frames.flush();
  assert.deepEqual(ran, [3]);
});

test('khung hình sau lại nhận yêu cầu mới', () => {
  const frames = fakeFrames();
  const c = createFrameCoalescer(frames.schedule, frames.cancel);
  const ran: number[] = [];
  c.run(() => ran.push(1));
  frames.flush();
  c.run(() => ran.push(2));
  frames.flush();
  assert.deepEqual(ran, [1, 2]);
});

test('cancel bỏ yêu cầu đang chờ', () => {
  const frames = fakeFrames();
  const c = createFrameCoalescer(frames.schedule, frames.cancel);
  const ran: number[] = [];
  c.run(() => ran.push(1));
  c.cancel();
  frames.flush();
  assert.deepEqual(ran, []);
});
```

- [ ] **Bước 2: Chạy, xác nhận thất bại**

```
npm test
```

Kết quả mong đợi: FAIL với lỗi `Cannot find module '.../src/three/frameCoalescer.ts'`.

- [ ] **Bước 3: Viết `src/three/frameCoalescer.ts`**

```ts
type Schedule = (cb: () => void) => number;
type Cancel = (id: number) => void;

/** Gộp các yêu cầu trong cùng một khung hình: chỉ chạy yêu cầu cuối cùng, tối đa một lần/khung hình. */
export function createFrameCoalescer(
  schedule: Schedule = (cb) => requestAnimationFrame(cb),
  cancel: Cancel = (id) => cancelAnimationFrame(id)
) {
  let pending: (() => void) | null = null;
  let frameId: number | null = null;
  return {
    run(job: () => void) {
      pending = job;
      if (frameId !== null) return;
      frameId = schedule(() => {
        frameId = null;
        const next = pending;
        pending = null;
        next?.();
      });
    },
    cancel() {
      if (frameId !== null) cancel(frameId);
      frameId = null;
      pending = null;
    },
  };
}
```

- [ ] **Bước 4: Chạy test, xác nhận qua**

```
npm test
```

Kết quả mong đợi: tất cả qua, `# fail 0`.

- [ ] **Bước 5: Dùng trong viewport**

1. Import: `import { createFrameCoalescer } from '../three/frameCoalescer';`
2. Cạnh các `useRef` khác (sau `const canvasMountRef = useRef...` ở `:331`), thêm:

```ts
  const morphCoalescerRef = useRef(createFrameCoalescer());
```

3. Thay effect ở `:1080-1091`:

```ts
  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.updateBodyMorph(body, outfit, showMeasurementTape);
    }
    if (compareRigRef.current) {
      compareRigRef.current.updateBodyMorph(
        body,
        effectiveOutfitB,
        showMeasurementTape
      );
    }
  }, [body, outfit, effectiveOutfitB, showMeasurementTape, isSplitCompareMode]);
```

bằng:

```ts
  useEffect(() => {
    // Kéo thanh số đo bắn nhiều lần/khung hình: chỉ dựng lại hình dáng một lần mỗi khung hình
    morphCoalescerRef.current.run(() => {
      rigRef.current?.updateBodyMorph(body, outfit, showMeasurementTape);
      compareRigRef.current?.updateBodyMorph(
        body,
        effectiveOutfitB,
        showMeasurementTape
      );
    });
  }, [body, outfit, effectiveOutfitB, showMeasurementTape, isSplitCompareMode]);

  useEffect(() => () => morphCoalescerRef.current.cancel(), []);
```

- [ ] **Bước 6: Kiểm tra**

```
npm run lint && npm test && npm run dev
```

- Đo lại như Task 0 (kéo thanh chiều cao 3 giây). Task dài nhất phải giảm, và không còn chuỗi task liền nhau trong cùng một khung hình.
- Thả tay khỏi thanh kéo: hình cuối cùng phải khớp đúng giá trị cuối của thanh.

- [ ] **Bước 7: Commit**

```
git add src/three/frameCoalescer.ts tests/frameCoalescer.test.ts src/components/MannequinViewport.tsx
git commit -m "perf(ma-no-canh): gộp cập nhật số đo về một lần mỗi khung hình"
```

---

### Task 7: Bỏ cấp phát đối tượng mỗi khung hình (H4)

**Files:**
- Sửa: `src/three/humanMannequinBuilder.ts`: khối biến tạm (`:8758-8764`) và các dòng trong `updateAnimation` liệt kê ở bước 2

**Interfaces:**
- Không thay đổi interface. Chỉ đổi biến cục bộ.

Task này không có unit test vì `updateAnimation` cần mô hình GLB và WebGL. Bước kiểm tra là so ảnh và đo GC.

- [ ] **Bước 1: Thêm biến tạm**

Ngay sau `const _eTemp = new THREE.Euler();` (`:8764`), thêm:

```ts
  // Biến tạm dùng lại mỗi khung hình (tránh tạo đối tượng mới → giảm GC)
  const _qRoot = new THREE.Quaternion();
  const _qRootInv = new THREE.Quaternion();
  const _mSceneInv = new THREE.Matrix4();
  const _vArm = new THREE.Vector3();
  const _vFore = new THREE.Vector3();
  const _vHand = new THREE.Vector3();
  const _vArmDir = new THREE.Vector3();
  const _vDorsalGuess = new THREE.Vector3();
  const _vSideAxis = new THREE.Vector3();
  const _vTrueDorsal = new THREE.Vector3();
  const _vForeVec = new THREE.Vector3();
  const _mRot = new THREE.Matrix4();
  const _cDry = new THREE.Color();
```

- [ ] **Bước 2: Thay từng chỗ cấp phát**

Mỗi dòng dưới đây đổi đúng như trong bảng. Code còn lại giữ nguyên, vì các biến cục bộ vẫn giữ tên cũ.

| Code cũ | Code mới |
|---|---|
| `const rootQuat = new THREE.Quaternion();` | `const rootQuat = _qRoot;` |
| `const rootQuatInv = rootQuat.clone().invert();` | `const rootQuatInv = _qRootInv.copy(rootQuat).invert();` |
| `const mSceneInv = new THREE.Matrix4()` + `.copy(activeSlot.scene.matrixWorld)` + `.invert();` | `const mSceneInv = _mSceneInv` + `.copy(activeSlot.scene.matrixWorld)` + `.invert();` |
| `const pArm = new THREE.Vector3();` | `const pArm = _vArm;` |
| `const pFore = new THREE.Vector3();` (cả 3 chỗ) | `const pFore = _vFore;` |
| `const pHand = new THREE.Vector3();` (cả 3 chỗ) | `const pHand = _vHand;` |
| `const armDir = new THREE.Vector3()` + `.subVectors(pHand, pFore)` | `const armDir = _vArmDir` + `.subVectors(pHand, pFore)` |
| `const dorsalGuess = new THREE.Vector3(` *(3 đối số)* `).normalize();` | `const dorsalGuess = _vDorsalGuess.set(` *(cùng 3 đối số)* `).normalize();` |
| `const sideAxis = new THREE.Vector3()` | `const sideAxis = _vSideAxis` |
| `const trueDorsal = new THREE.Vector3()` | `const trueDorsal = _vTrueDorsal` |
| `const rotMat = new THREE.Matrix4().makeBasis(` | `const rotMat = _mRot.makeBasis(` |
| `const foreVec = new THREE.Vector3().subVectors(pHand, pFore);` | `const foreVec = _vForeVec.subVectors(pHand, pFore);` |
| `const dryCol = new THREE.Color(dryColorHex);` | `const dryCol = _cDry.set(dryColorHex);` |

Ba khối `pFore`/`pHand` nằm ở ba nhánh `if` riêng (đồng hồ, túi, ô/dù) và chạy nối tiếp nhau, nên dùng chung biến tạm là an toàn.

Kiểm tra không có biến nào bị lưu giữ ra ngoài khung hình:

```
awk '/const updateAnimation = \(/,/const updateBodyMorph = \(/' src/three/humanMannequinBuilder.ts | grep -nE "= (rootQuat|rootQuatInv|mSceneInv|pArm|pFore|pHand|armDir|sideAxis|trueDorsal|rotMat|foreVec|dryCol);"
```

Kết quả mong đợi: không có dòng nào. Nếu có, chỗ đó phải đổi thành `.clone()`.

```
awk '/const updateAnimation = \(/,/const updateBodyMorph = \(/' src/three/humanMannequinBuilder.ts | grep -c "new THREE\."
```

Kết quả mong đợi: `0`. Trước khi sửa, lệnh này ra `16`.

- [ ] **Bước 3: Kiểm tra**

```
npm run lint && npm test && npm run dev
```

- Chụp lại `phu-kien-mua.png`: đồng hồ hoặc túi vẫn nằm đúng ở cổ tay/bàn tay, màu áo ướt khi mưa vẫn như cũ.
- Đo GC như Task 0 (đứng yên 5 giây, có phụ kiện): số lần Minor GC phải giảm.

- [ ] **Bước 4: Commit**

```
git add src/three/humanMannequinBuilder.ts
git commit -m "perf(ma-no-canh): dùng lại biến tạm trong vòng animation"
```

---

### Task 8: Tách bundle và chỉ tải exporter khi cần (H1)

**Files:**
- Sửa: `vite.config.ts`
- Sửa: `src/components/MannequinViewport.tsx`: import dòng 5–6, `:868`, `:902`

**Interfaces:**
- Không thay đổi.

- [ ] **Bước 1: Ghi mốc**

```
npm run build 2>&1 | grep "dist/assets"
```

Mốc hiện tại: một file `index-*.js` khoảng 1.570 KB (gzip 411 KB).

- [ ] **Bước 2: Tách vendor chunk**

Trong `vite.config.ts`, trong object trả về của `defineConfig`, thêm ngay trước `server: {`:

```ts
    build: {
      rolldownOptions: {
        output: {
          // Thư viện ít đổi → chunk riêng, trình duyệt cache lâu dài
          codeSplitting: {
            groups: [
              { name: 'three', test: /node_modules[\\/]three/ },
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)/ },
            ],
          },
        },
      },
    },
```

Cấu hình này đã được thử trên commit `64d49f0` và build ra 3 file: `index` 618 KB, `three` 733 KB, `react` 219 KB.

- [ ] **Bước 3: Chỉ tải exporter khi bấm Xuất**

1. Xoá hai dòng import:

```ts
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
```

2. Trong `handleExport3DModel` (đã là hàm `async`), thay `const exporter = new GLTFExporter();` bằng:

```ts
          const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
          const exporter = new GLTFExporter();
```

3. Thay `const usdzExporter = new USDZExporter();` bằng:

```ts
          const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
          const usdzExporter = new USDZExporter();
```

- [ ] **Bước 4: Kiểm tra**

```
npm run lint && npm test && npm run build 2>&1 | grep "dist/assets"
```

Kết quả mong đợi: có các file `three-*.js`, `react-*.js`, `index-*.js`, và thêm `GLTFExporter-*.js`, `USDZExporter-*.js` riêng.

Chạy `npm run dev`:
- Bấm Xuất `.GLB`: Network thấy tải `GLTFExporter` đúng lúc bấm, và file `.glb` vẫn tải về được.
- Làm tương tự với `.USDZ`.

- [ ] **Bước 5: Commit**

```
git add vite.config.ts src/components/MannequinViewport.tsx
git commit -m "perf: tách chunk three/react và tải exporter khi cần"
```

---

### Task 9: Nén mô hình GLB (H2)

**Files:**
- Tạo: `scripts/optimize-models.mjs`, `tests/models.test.ts`
- Di chuyển: `public/models/{rpm_female_1,rpm_female_2,PreviewMesh}.glb` → `assets-src/models/`
- Tạo: `public/draco/` (decoder)
- Sửa: `package.json` (devDependencies, script `models:optimize`)
- Sửa: `src/three/humanMannequinBuilder.ts`: import, `const loader = new GLTFLoader();` (`:7795`)

**Interfaces:**
- Tạo ra: lệnh `npm run models:optimize` đọc `assets-src/models/*.glb` và ghi bản đã tối ưu vào `public/models/`

Cơ sở của task: `classifyAndPrepareSkinnedMeshes` (`:5842-5848`) clone material của **mọi** skinned mesh rồi gán `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap` = `null`. Chỉ `map` (baseColor) được giữ, làm `origMap` cho `getStyledGarmentTexture`. Vì vậy bỏ 4 loại texture đó khỏi file sẽ **không làm đổi hình hiển thị**.

- [ ] **Bước 1: Viết test thất bại**

Tạo `tests/models.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BODY_MODELS = ['rpm_female_1', 'rpm_female_2', 'PreviewMesh'];

function readGlbJson(path: string) {
  const buf = fs.readFileSync(path);
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
}

function structure(json: any) {
  return {
    nodes: (json.nodes ?? []).map((n: any) => n.name),
    meshes: (json.meshes ?? []).map((m: any) => [
      m.name,
      m.primitives.map(
        (p: any) => Object.keys(p.attributes).sort().join('|') + ':' + (p.targets?.length ?? 0)
      ),
    ]),
    skins: (json.skins ?? []).map((s: any) => s.joints.length),
    materials: (json.materials ?? []).map((m: any) => m.name),
  };
}

for (const name of BODY_MODELS) {
  test(`${name}: đã nén Draco và bỏ texture không dùng`, () => {
    const out = readGlbJson(`public/models/${name}.glb`);
    assert.ok(out.extensionsUsed?.includes('KHR_draco_mesh_compression'));
    for (const mat of out.materials ?? []) {
      assert.equal(mat.normalTexture, undefined, `${mat.name}: normalTexture`);
      assert.equal(mat.occlusionTexture, undefined, `${mat.name}: occlusionTexture`);
      assert.equal(
        mat.pbrMetallicRoughness?.metallicRoughnessTexture,
        undefined,
        `${mat.name}: metallicRoughnessTexture`
      );
    }
  });

  test(`${name}: cấu trúc giữ nguyên so với bản gốc`, () => {
    const src = readGlbJson(`assets-src/models/${name}.glb`);
    const out = readGlbJson(`public/models/${name}.glb`);
    assert.deepEqual(structure(out), structure(src));
  });
}
```

- [ ] **Bước 2: Chuyển bản gốc và chạy test, xác nhận thất bại**

```
mkdir -p assets-src/models
git mv public/models/rpm_female_1.glb public/models/rpm_female_2.glb public/models/PreviewMesh.glb assets-src/models/
npm test
```

Kết quả mong đợi: FAIL với lỗi `ENOENT: no such file or directory, open 'public/models/rpm_female_1.glb'`.

- [ ] **Bước 3: Cài công cụ và viết script**

```
npm install --save-dev @gltf-transform/core@4.2.1 @gltf-transform/extensions@4.2.1 @gltf-transform/functions@4.2.1 draco3dgltf@1.5.7
```

Trong `package.json` → `"scripts"`, thêm:

```json
    "models:optimize": "node scripts/optimize-models.mjs",
```

Tạo `scripts/optimize-models.mjs`:

```js
// Tối ưu mô hình người: bỏ texture mà code đã gán null lúc tải
// (normal/roughness/metalness/AO, xem classifyAndPrepareSkinnedMeshes) rồi nén hình học bằng Draco.
// Nguồn: assets-src/models/*.glb → đích: public/models/*.glb. Không đổi tên node/mesh/xương/material.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const SRC_DIR = 'assets-src/models';
const OUT_DIR = 'public/models';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
});

for (const file of fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.glb'))) {
  const src = path.join(SRC_DIR, file);
  const out = path.join(OUT_DIR, file);
  const doc = await io.read(src);
  for (const mat of doc.getRoot().listMaterials()) {
    mat
      .setNormalTexture(null)
      .setOcclusionTexture(null)
      .setMetallicRoughnessTexture(null);
  }
  await doc.transform(prune({ propertyTypes: ['Texture', 'TextureInfo'] }), draco());
  await io.write(out, doc);
  const before = fs.statSync(src).size;
  const after = fs.statSync(out).size;
  console.log(`${file}: ${(before / 1024) | 0} KB → ${(after / 1024) | 0} KB`);
}
```

- [ ] **Bước 4: Chạy script và test**

```
npm run models:optimize
npm test
```

Kết quả mong đợi:
- Script in ra khoảng `rpm_female_1.glb: 921 KB → 323 KB`, `rpm_female_2.glb: 1148 KB → 421 KB`, `PreviewMesh.glb: 3699 KB → 937 KB`.
- Tất cả test qua.

- [ ] **Bước 5: Thêm decoder Draco và cấu hình loader**

```
mkdir -p public/draco
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js public/draco/
```

Trong `src/three/humanMannequinBuilder.ts`:

1. Sau `import { GLTFLoader } ...`, thêm:

```ts
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
```

2. Ngay trước `export function buildHumanMannequinRig(`, thêm:

```ts
// Một DRACOLoader dùng chung cho mọi rig (rig chính + rig So sánh) để không sinh thêm worker
let sharedDracoLoader: DRACOLoader | null = null;
function getDracoLoader(): DRACOLoader {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader().setDecoderPath('/draco/');
  }
  return sharedDracoLoader;
}
```

3. Thay `const loader = new GLTFLoader();` bằng:

```ts
  const loader = new GLTFLoader().setDRACOLoader(getDracoLoader());
```

- [ ] **Bước 6: Kiểm tra**

```
npm run lint && npm test && npm run build && npm run dev
```

- Chụp lại đủ 6 ảnh và so với baseline: **không được khác** về hình dáng, màu da, màu quần áo, tóc, mắt, trang điểm.
- Network: tổng `.glb` khi mở trang khoảng 1,25 MB (2 file nữ khoảng 744 KB + 4 animation khoảng 500 KB), so với 2,63 MB lúc trước. Có thêm request `draco_decoder.wasm`.
- Đổi chiều cao, cân nặng, vòng 3 và mặc thử từng loại đồ: biến dạng cơ thể giống hệt trước khi nén.
- Xuất `.glb`: mở file xuất ra bằng https://gltf-viewer.donmccurdy.com, phải thấy ma-nơ-canh đúng tư thế.

Nếu có khác biệt về hình, **không commit**. Khôi phục mô hình gốc bằng lệnh `git restore --source=HEAD --staged --worktree public/models && rm -rf assets-src`, rồi ghi lại chỗ khác biệt.

- [ ] **Bước 7: Commit**

```
git add package.json package-lock.json scripts/optimize-models.mjs tests/models.test.ts assets-src/models public/models public/draco src/three/humanMannequinBuilder.ts
git commit -m "perf(ma-no-canh): nén GLB bằng Draco và bỏ texture không dùng"
```

---

### Task 10: Đo lại và cập nhật tài liệu

**Files:**
- Sửa: `docs/plans/baseline/so-do.md`
- Sửa: `architecture/hien-trang-code.md`, `vanhanh/studio-3d.md`, `architecture/quyet-dinh.md`

**Interfaces:**
- Không thay đổi.

- [ ] **Bước 1: Đo lại**

Đo lại toàn bộ chỉ số ở Task 0 và ghi thêm cột "Sau" vào `so-do.md`. Mục tiêu:

| Chỉ số | Mục tiêu |
|---|---|
| JS tải khi mở trang (gzip) | Không tăng; có chunk `three`/`react` riêng; exporter không nằm trong chunk đầu |
| File `.glb` tải khi mở trang | ≤ 1,3 MB (trước 2,63 MB), chưa tính khoảng 300 KB decoder Draco tải một lần |
| Long task khi kéo thanh số đo | Không có chuỗi task liền nhau trong cùng một khung hình |
| GPU memory sau 5 lần HMR | Không tăng dần |
| Ảnh so sánh | Giống baseline, trừ chiều cao ở 150/190 cm (Task 1) |

- [ ] **Bước 2: Cập nhật tài liệu**

- `architecture/hien-trang-code.md`:
  - Mục 1, dòng "Mô hình": bản gốc nằm trong `assets-src/models/`, chạy `npm run models:optimize` để tạo bản nén Draco vào `public/models/`.
  - Mục 5 "Lệnh": thêm `npm test` và `npm run models:optimize`.
- `vanhanh/studio-3d.md`, mục "Khi thiết bị yếu hoặc lỗi 3D": thêm "Tải mô hình lỗi → thông báo + nút Thử lại".
- `architecture/quyet-dinh.md`: thêm ADR-008 "Nén mô hình bằng Draco, không dùng meshopt". Lý do: `KHR_mesh_quantization` đổi toạ độ đỉnh mà code co giãn cơ thể đọc theo mét, và tách skin dùng chung.

- [ ] **Bước 3: Commit**

```
git add docs/plans/baseline architecture vanhanh
git commit -m "docs(ma-no-canh): số đo sau tối ưu và cập nhật tài liệu"
```

---

## Đối chiếu

| Vấn đề | Task |
|---|---|
| L1 Tỉ lệ chiều cao | 1 |
| L2 Rò rig chính | 2 |
| L3 Rò rig so sánh | 2 (bước 7) |
| L4 Mô hình tải muộn | 2 (bước 6) |
| L5 Lỗi tải không báo | 3 |
| L6 `THREE.Clock` | 4 |
| L7 Code chết | 5 |
| L8 Không có test | 1 (script), 1–3, 6, 9 (test) |
| H1 Bundle một khối | 8 |
| H2 GLB nặng | 9 |
| H3 Cập nhật số đo dồn dập | 6 |
| H4 Cấp phát mỗi khung hình | 7 |
| Giữ nguyên bản chất | Task 0 (ảnh mốc) + bước so ảnh trong mọi task |
