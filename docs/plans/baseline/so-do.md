# Mốc so sánh ma-nơ-canh (Task 0)

- **Commit được đo:** `49e684c` (nhánh `ma-no-canh/build`, đã gồm `69623d5` đổi sang `THREE.Timer`).
- **Ngày đo:** 2026-11-07.
- **Môi trường:** macOS (Darwin 25.6.0), GPU Apple A18 Pro (ANGLE Metal), Chrome 156.0.8078.80 do Playwright MCP (`@playwright/mcp`) điều khiển, Node 22.23.4, Vite 8.3.6 (dev server).
- **Khung nhìn:** 1280×800, `devicePixelRatio` = 1, canvas WebGL 1280×752.

Kế hoạch: [../2026-11-07-build-ma-no-canh.md](../2026-11-07-build-ma-no-canh.md), Task 0.

## Ảnh mốc

| File | Thiết lập | Ảnh có gì | Chụp lại có giống không |
|---|---|---|---|
| `nu-mac-dinh.png` | Mở trang, không chỉnh gì | Mẫu nữ 168 cm / 52 kg, áo phông trắng, quần jean xanh đậm, tư thế chữ A. Thanh trên che đỉnh tóc, thanh dưới che bàn chân | Giống từng pixel (0 pixel khác) |
| `nu-150.png` | Chiều cao 150 cm | Mẫu nữ thấp và đầy đặn hơn (Ngực/Eo/Hông tự đổi thành 89/69/95). Thấy hết đầu, không thấy bàn chân | Giống từng pixel |
| `nu-190.png` | Chiều cao 190 cm | Mẫu nữ cao và mảnh hơn (76/52/82). Thanh trên che trán và tóc, không thấy bàn chân | Giống từng pixel |
| `nam-mac-dinh.png` | Bấm "Mẫu Nam (BMI)" | Mẫu nam 178 cm / 72 kg, áo phông trắng, quần đen, giày nâu. Thanh trên che đỉnh tóc, giày bị thanh dưới che một phần | Giống từng pixel |
| `so-sanh-ab.png` | Bấm "So Sánh (A\|B)" | Hai ma-nơ-canh nữ: Khung A (áo trắng, quần jean, thấy giày), Khung B (váy hồng). Bảng chọn đồ A/B che vai phía ngoài | Giống từng pixel |
| `phu-kien-mua.png` | Túi "Túi Yên Ngựa (Paris Saddle Bag)" + Mưa | Mẫu nữ mặc định cầm túi màu nâu cam ở tay bên trái ảnh, có vệt mưa, vải bóng ướt, bảng thông tin Mưa mở sau bảng chấm điểm | **Không** giống từng pixel: vệt mưa ngẫu nhiên. Lần chụp lại khác 12.379 pixel (1,21 %) |

Ghi chú:
- Tư thế mặc định là `stand_still` (`App.tsx`, `posePreset`), nên ma-nơ-canh **đứng yên hoàn toàn**. Không có chuyển động idle. Vì thế ảnh chụp lại ra giống hệt từng pixel.
- Ở 1280×800, camera mặc định không cho thấy trọn ma-nơ-canh: thanh trên che đỉnh đầu, thanh dưới che bàn chân. Đây là hiện trạng, không phải lỗi chụp.
- Task 1 cố ý đổi `nu-150.png` và `nu-190.png`. Các ảnh còn lại phải giữ nguyên ở mọi task.

## Số đo

Tất cả đo trên dev server Vite chạy ở localhost (không có mạng thật, không nén gzip). Số thời gian chỉ dùng để so trước/sau trên cùng máy, không phản ánh tốc độ mạng thật.

| Chỉ số | Cách đo | Giá trị |
|---|---|---|
| Dung lượng JS (gzip) | `npm run build`, đọc dòng `dist/assets/*.js` | **416,00 kB gzip**. Chỉ có 1 file JS: `index-DMKTkjwF.js` 1.570,78 kB (chưa gzip). CSS: 74,04 kB, gzip 11,93 kB. Có cảnh báo chunk > 500 kB |
| Dung lượng mô hình tải khi mở trang | Script F, đã xoá cache | **4 file `.glb`, tổng `transferSize` 2.634.184 B** (`encodedBodySize` 2.632.984 B, khoảng 2,63 MB): `rpm_female_1.glb` 943.704 B, `rpm_female_2.glb` 1.176.116 B, `F_Standing_Idle_001.glb` 401.884 B, `F_Walk_002.glb` 111.280 B. Cả 3 lần đo đều ra cùng số |
| Thời gian đến khi ma-nơ-canh hiện | Script F: `responseEnd` lớn nhất của các `.glb` (tính từ lúc bắt đầu điều hướng) | **645 / 394 / 226 ms** (Script F, 3 lần, cache trống). Một loạt đo trước đó, chạy từng bước rời, được 693 / 253 / 283 ms. Số dao động nhiều vì là dev server localhost. Không tính thời gian phân tích GLB và dựng rig sau khi tải |
| Long task khi kéo thanh chiều cao | Script G: 60 bước, mỗi bước cách 50 ms, 150 → 190 → 150 cm, đo bằng `PerformanceObserver('longtask')` | **0 long task (> 50 ms) trong cả 3 lần.** Mỗi sự kiện `input` tốn **trung bình 16,5 / 17,5 / 17,4 ms**, lâu nhất 22,2 / 24,2 / 23,7 ms. Vì vậy 60 bước mất 4.059 / 4.122 / 4.113 ms thay vì 3.000 ms. Tốc độ khung hình vẫn khoảng 60 fps |
| `usedJSHeapSize` trước và sau khi kéo | Script G | 95,0 → 66,2 MB; 92,5 → 80,3 MB; 88,1 → 69,1 MB. GC chạy giữa chừng nên số "sau" thấp hơn. Chỉ dùng để tham khảo, không đủ để kết luận có rò rỉ hay không |
| Số lần GC trong 5 giây đứng yên có phụ kiện | Script H: CDP tracing, đếm sự kiện `MinorGC`/`MajorGC` của tiến trình trang (giống mục "Minor GC" trong DevTools Performance) | **MinorGC 1 / 4 / 3 lần** (lâu nhất 4,95 / 0,73 / 0,71 ms), **MajorGC 0**. 300 khung hình trong 5 giây |
| GPU memory sau 5 lần HMR | **Cần đo tay**, xem mục "Đo tay: GPU memory sau HMR" | Chưa đo |

Ghi chú về số đo:
- Kế hoạch ghi 411 KB gzip, đo ở commit `64d49f0`. Số mới là 416,00 kB, đo ở `49e684c`.
- Sự kiện `input` được tạo bằng script, mỗi bước cách nhau 50 ms. Kéo chuột thật sinh khoảng 1 sự kiện mỗi khung hình (khoảng 16 ms). Với 17 ms mỗi sự kiện, kéo thật có thể làm rớt khung hình dù không sinh long task. Task 6 nên so cả số "ms mỗi sự kiện `input`", không chỉ số long task.
- Ở chế độ So Sánh A|B, ô chứa thanh chiều cao bị ẩn (không có `input[type=range][min=100][max=300]` nào), nên Script G không đo được trường hợp 2 rig.
- Trong lúc đo, trình duyệt Playwright 2 lần bị tác động từ bên ngoài: một lần trang bị đóng và khung nhìn trở về 1200×630, một lần khung nhìn đổi thành 1408×793 @2x. Ảnh mốc và số đo ở trên được làm khi khung nhìn đúng 1280×800 @1x: sau đó đã chụp lại 5 ảnh tĩnh và đo lại Script G một lần (16,8 ms mỗi sự kiện, 0 long task), kết quả khớp. Vì vậy Script A kiểm tra khung nhìn trước khi chờ.

## Cách chụp lại

Làm đúng thứ tự dưới đây. Mỗi ảnh bắt đầu từ một lần tải trang mới. Chỉ dùng `browser_evaluate` để bấm hoặc đặt giá trị. **Không dùng `browser_click`/`browser_hover`**: chuột Playwright sẽ dừng trên nút, nút đổi màu khi hover và ảnh khác pixel.

### Bước 0: Chạy server riêng

```
cd /Users/trannhatminh/ENIAC && npx vite --port 3107 --strictPort
```

Chạy nền. Không tắt server của người dùng ở cổng 3000. Xong việc chỉ tắt tiến trình ở cổng 3107. Trong lúc chụp, không sửa file trong `src/`, vì HMR sẽ tải lại trang.

### Bước 1: Đặt khung nhìn rồi mở trang

1. `browser_resize` với `width: 1280`, `height: 800`. Làm **trước** khi mở trang. Nếu trình duyệt bị khởi động lại giữa chừng, khung nhìn trở về mặc định (đã gặp 1200×630, `devicePixelRatio` 2), nên phải resize lại.
2. `browser_navigate` tới `http://localhost:3107/`.
3. `browser_evaluate` với **Script A** (`MIN_GLB = 4`). Script báo lỗi nếu khung nhìn không phải 1280×800 với `devicePixelRatio` 1.

### Bước 2: Thiết lập từng ảnh

| Ảnh | Sau Bước 1, làm tiếp |
|---|---|
| `nu-mac-dinh.png` | Không làm gì |
| `nu-150.png` | Script B với `TARGET_CM = 150`. Kết quả phải có `"150 cm"` |
| `nu-190.png` | Script B với `TARGET_CM = 190`. Kết quả phải có `"190 cm"` |
| `nam-mac-dinh.png` | Script C với `LABEL = 'Mẫu Nam (BMI)'`, rồi Script A với `MIN_GLB = 7`. Kết quả phải có `"178 cm"`, `"72 kg"` và thêm `PreviewMesh.glb`, `M_Standing_Idle_001.glb`, `M_Walk_001.glb` |
| `so-sanh-ab.png` | Script C với `LABEL = 'So Sánh (A\|B)'`, rồi Script A với `MIN_GLB = 8` (rig B tải lại 4 file `.glb` của mẫu nữ) |
| `phu-kien-mua.png` | Script D. Kết quả phải là `bagValue: "paris_saddle_bag"`, `rainOn: true`, `dockCollapsed: true` |

### Bước 3: Chụp

`browser_take_screenshot` với `scale: "css"`, `type: "png"`, `filename` là đường dẫn tuyệt đối trong repo.
- Chụp mốc: `/Users/trannhatminh/ENIAC/docs/plans/baseline/<tên>.png`.
- Chụp để so (task sau): `/Users/trannhatminh/ENIAC/.playwright-mcp/<tên>.png`. Không commit file này. Xoá thư mục `.playwright-mcp/` khi xong.

Ảnh ra 1280×800 pixel.

**Thời gian chờ đã dùng:**
- Script A chờ đến khi có ít nhất `MIN_GLB` mục `.glb` trong `performance.getEntriesByType('resource')` và số mục không đổi trong 2 giây, rồi chờ thêm 5 giây.
- Script B và D chờ 5 giây sau thao tác cuối.
- Script C không chờ: luôn chạy Script A ngay sau nó.

### Bước 4: So với mốc

`browser_evaluate` với **Script E**, đổi `BASELINE` và `CANDIDATE`. Vite phục vụ cả thư mục repo, nên ảnh mốc có ở `/docs/plans/baseline/<tên>.png` và ảnh vừa chụp có ở `/.playwright-mcp/<tên>.png`.

Ngưỡng đạt:
- `nu-mac-dinh`, `nu-150`, `nu-190`, `nam-mac-dinh`, `so-sanh-ab`: mong đợi `diffPixels: 0`. Nếu khác, xem `bbox` để biết vùng khác, rồi mở hai ảnh ra nhìn.
- `phu-kien-mua`: mưa ngẫu nhiên nên luôn khác khoảng 1,2 % pixel, rải khắp khung 3D. Đạt khi `diffPct` ≤ khoảng 2 % **và** nhìn bằng mắt thấy dáng người, túi, quần áo không đổi.

### Script A: chờ mô hình tải xong

```js
async () => {
  const MIN_GLB = 4, EXTRA_MS = 5000;
  if (innerWidth !== 1280 || innerHeight !== 800 || devicePixelRatio !== 1) {
    throw new Error(`Khung nhìn ${innerWidth}x${innerHeight} @${devicePixelRatio}x, cần 1280x800 @1x: chạy browser_resize rồi tải lại trang`);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const glb = () => performance.getEntriesByType('resource').filter((e) => e.name.includes('.glb'));
  const t0 = performance.now();
  let last = -1, stableSince = t0;
  while (performance.now() - t0 < 60000) {
    const n = glb().length;
    if (n !== last) { last = n; stableSince = performance.now(); }
    if (n >= MIN_GLB && performance.now() - stableSince >= 2000) break;
    await sleep(100);
  }
  await sleep(EXTRA_MS);
  return {
    viewport: `${innerWidth}x${innerHeight}`,
    glb: glb().map((e) => e.name.split('/').pop()),
    info: [...document.querySelectorAll('main span, main strong')].map((s) => s.textContent.trim()).filter((t) => /cm$|kg$/.test(t)).slice(0, 2),
  };
}
```

### Script B: đặt chiều cao bằng thanh trượt (React điều khiển)

Thanh chiều cao nằm trong ô bên trái ("Chiều cao", min 100, max 300). Script đặt giá trị bằng native setter rồi phát sự kiện `input`, để `onChange` của React nhận được.

```js
async () => {
  const TARGET_CM = 150;
  const sliders = [...document.querySelectorAll('input[type="range"][min="100"][max="300"]')].filter((el) => el.offsetParent !== null);
  if (sliders.length !== 1) throw new Error('Tìm thấy ' + sliders.length + ' thanh chiều cao đang hiển thị, cần đúng 1');
  const el = sliders[0];
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setValue.call(el, String(TARGET_CM));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 5000));
  return {
    sliderValue: el.value,
    info: [...document.querySelectorAll('main span, main strong')].map((s) => s.textContent.trim()).filter((t) => /cm$|kg$/.test(t)).slice(0, 2),
  };
}
```

### Script C: bấm một nút theo chữ

```js
async () => {
  const LABEL = 'Mẫu Nam (BMI)';
  const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === LABEL && b.offsetParent !== null);
  if (btns.length !== 1) throw new Error('Tìm thấy ' + btns.length + ' nút "' + LABEL + '" đang hiển thị, cần đúng 1');
  btns[0].click();
  return 'đã bấm ' + LABEL;
}
```

Ở 1280×800 phải dùng nút "Mẫu Nam (BMI)" trong ô bên trái. Nút "Mẫu Nam" (không có "(BMI)") có trong DOM nhưng bị ẩn ở độ rộng này. Nút "So Sánh (A|B)" nằm trên thanh trên cùng. Đừng nhầm với nút "So sánh" trong khung 3D hay "So sánh đôi A|B" ở thanh dưới.

### Script D: bật túi xách và mưa

```js
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clickButton = (label) => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === label && b.offsetParent !== null);
    if (btns.length !== 1) throw new Error('Tìm thấy ' + btns.length + ' nút "' + label + '" đang hiển thị, cần đúng 1');
    btns[0].click();
  };
  // 1. Mở tab Phụ kiện 3D
  clickButton('Phụ kiện 3D');
  await sleep(1000);
  // 2. Chọn túi "Túi Yên Ngựa (Paris Saddle Bag)"
  const sels = [...document.querySelectorAll('select')].filter((s) => s.querySelector('option[value="paris_saddle_bag"]'));
  if (sels.length !== 1) throw new Error('Tìm thấy ' + sels.length + ' ô chọn túi xách, cần đúng 1');
  const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setSelect.call(sels[0], 'paris_saddle_bag');
  sels[0].dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1000);
  const bagValue = sels[0].value;
  // 3. Thu gọn bảng dưới để trả bố cục về như lúc mở trang
  clickButton('Thu gọn Bảng');
  await sleep(1000);
  // 4. Bật Mưa trong khung 3D
  clickButton('Mưa');
  await sleep(5000);
  const rain = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Mưa');
  return { bagValue, rainOn: !!rain && rain.className.includes('bg-blue-600'), dockCollapsed: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Mở Tủ Đồ & Chi Tiết') };
}
```

### Script E: so ảnh chụp với ảnh mốc

Đếm pixel có kênh màu lệch quá `THRESHOLD`.

```js
async () => {
  const BASELINE = '/docs/plans/baseline/nu-mac-dinh.png';
  const CANDIDATE = '/.playwright-mcp/nu-mac-dinh.png';
  const THRESHOLD = 16;
  const load = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
    const bmp = await createImageBitmap(await res.blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, bmp.width, bmp.height);
  };
  const a = await load(BASELINE), b = await load(CANDIDATE);
  if (a.width !== b.width || a.height !== b.height) return { error: 'Khác kích thước', a: [a.width, a.height], b: [b.width, b.height] };
  let diff = 0, maxD = 0, minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    maxD = Math.max(maxD, d);
    if (d > THRESHOLD) {
      diff++;
      const p = i / 4, x = p % a.width, y = (p - x) / a.width;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { size: [a.width, a.height], diffPixels: diff, diffPct: +(100 * diff / (a.width * a.height)).toFixed(3), maxChannelDelta: maxD, bbox: diff ? [minX, minY, maxX, maxY] : null };
}
```

## Cách đo lại

Đo trên cùng server ở cổng 3107, khung nhìn 1280×800.

### JS gzip

```
npm run build
```

Đọc các dòng `dist/assets/*.js │ gzip: …`. Khi đã tách chunk (Task 8), ghi từng chunk và tổng các chunk tải khi mở trang.

### Script F: dung lượng và thời điểm tải `.glb` (cache trống)

Chạy bằng `browser_run_code_unsafe`. Script xoá cache trình duyệt qua CDP, mở trang, rồi đọc Resource Timing. Lặp 3 lần.

```js
async (page) => {
  const RUNS = 3, MIN_GLB = 4;
  const results = [];
  for (let run = 0; run < RUNS; run++) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.clearBrowserCache');
    await cdp.detach();
    await page.goto('http://localhost:3107/');
    results.push(await page.evaluate(async (minGlb) => {
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      const glb = () => performance.getEntriesByType('resource').filter((e) => e.name.includes('.glb'));
      const t0 = performance.now();
      let last = -1, stableSince = t0;
      while (performance.now() - t0 < 60000) {
        const n = glb().length;
        if (n !== last) { last = n; stableSince = performance.now(); }
        if (n >= minGlb && performance.now() - stableSince >= 2000) break;
        await sleep(100);
      }
      const list = glb();
      return {
        files: list.map((e) => [e.name.split('/').pop(), e.transferSize, e.encodedBodySize]),
        totalTransferSize: list.reduce((s, e) => s + e.transferSize, 0),
        totalEncodedBodySize: list.reduce((s, e) => s + e.encodedBodySize, 0),
        firstGlbStart: Math.round(Math.min(...list.map((e) => e.startTime))),
        lastGlbResponseEnd: Math.round(Math.max(...list.map((e) => e.responseEnd))),
      };
    }, MIN_GLB));
  }
  return results;
}
```

Sau Task 9 (Draco), decoder Draco được tải riêng (không phải `.glb`). Khi đó ghi thêm tổng byte của các file trong `/draco/`.

### Script G: long task khi kéo thanh chiều cao

Làm Bước 1 (resize, mở trang, Script A với `MIN_GLB = 4`), rồi chạy bằng `browser_evaluate`. Lặp 3 lần, mỗi lần tải lại trang.

```js
async () => {
  const STEPS = 60, INTERVAL_MS = 50, MIN_CM = 150, MAX_CM = 190;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sliders = [...document.querySelectorAll('input[type="range"][min="100"][max="300"]')].filter((el) => el.offsetParent !== null);
  if (sliders.length !== 1) throw new Error('Tìm thấy ' + sliders.length + ' thanh chiều cao đang hiển thị, cần đúng 1');
  const el = sliders[0];
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const mb = (b) => (b == null ? null : +(b / 1048576).toFixed(1));
  const heapBefore = performance.memory ? performance.memory.usedJSHeapSize : null;
  const longTasks = [];
  const obs = new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push({ start: Math.round(e.startTime), duration: Math.round(e.duration) }); });
  obs.observe({ type: 'longtask' });
  let frames = 0, counting = true;
  const tick = () => { if (!counting) return; frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const half = STEPS / 2;
  const dispatchMs = [];
  const t0 = performance.now();
  for (let i = 0; i < STEPS; i++) {
    const k = i < half ? i / (half - 1) : (STEPS - 1 - i) / (half - 1); // 150 → 190 → 150
    setValue.call(el, String(MIN_CM + Math.round((MAX_CM - MIN_CM) * k)));
    const d0 = performance.now();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    dispatchMs.push(performance.now() - d0);
    await sleep(INTERVAL_MS);
  }
  const sweepMs = performance.now() - t0;
  counting = false;
  const framesDuringSweep = frames;
  await sleep(1000);
  obs.disconnect();
  const heapAfter = performance.memory ? performance.memory.usedJSHeapSize : null;
  const durations = longTasks.map((t) => t.duration);
  const sorted = [...dispatchMs].sort((a, b) => a - b);
  return {
    sweepMs: Math.round(sweepMs),
    framesDuringSweep,
    fps: +(framesDuringSweep / (sweepMs / 1000)).toFixed(1),
    longTaskCount: longTasks.length,
    longTaskMaxMs: durations.length ? Math.max(...durations) : 0,
    longTaskTotalMs: durations.reduce((s, d) => s + d, 0),
    longTasks,
    dispatchAvgMs: +(dispatchMs.reduce((s, d) => s + d, 0) / dispatchMs.length).toFixed(1),
    dispatchMedianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1),
    dispatchMaxMs: +sorted[sorted.length - 1].toFixed(1),
    heapBeforeMB: mb(heapBefore),
    heapAfterMB: mb(heapAfter),
    finalSlider: el.value,
    shownHeight: [...document.querySelectorAll('main span')].map((s) => s.textContent.trim()).find((t) => /cm$/.test(t)),
  };
}
```

`dispatchMs` là thời gian chạy đồng bộ của một sự kiện `input` (React render và các effect chạy ngay trong sự kiện đó). Sau Task 6, phần cập nhật hình được dời sang khung hình kế tiếp, nên số này sẽ giảm. Khi đó, đọc thêm `fps` và `longTaskCount` để chắc rằng việc nặng không chỉ bị dời sang chỗ khác.

### Script H: số lần GC khi đứng yên có phụ kiện

1. Làm Bước 1 (resize, mở trang, Script A với `MIN_GLB = 4`).
2. Bật túi, không bật mưa, bằng `browser_evaluate`:

```js
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clickButton = (label) => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === label && b.offsetParent !== null);
    if (btns.length !== 1) throw new Error('Tìm thấy ' + btns.length + ' nút "' + label + '" đang hiển thị, cần đúng 1');
    btns[0].click();
  };
  clickButton('Phụ kiện 3D');
  await sleep(1000);
  const sels = [...document.querySelectorAll('select')].filter((s) => s.querySelector('option[value="paris_saddle_bag"]'));
  if (sels.length !== 1) throw new Error('Tìm thấy ' + sels.length + ' ô chọn túi xách, cần đúng 1');
  const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setSelect.call(sels[0], 'paris_saddle_bag');
  sels[0].dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1000);
  const bagValue = sels[0].value;
  clickButton('Thu gọn Bảng');
  await sleep(5000);
  return { bagValue, dockCollapsed: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Mở Tủ Đồ & Chi Tiết') };
}
```

3. Chạy đoạn dưới bằng `browser_run_code_unsafe`. Script ghi trace 5 giây qua CDP, lặp 3 lần trên cùng trang.

```js
async (page) => {
  const TRACE_MS = 5000, RUNS = 3;
  const runs = [];
  for (let r = 0; r < RUNS; r++) {
    const cdp = await page.context().newCDPSession(page);
    const events = [];
    cdp.on('Tracing.dataCollected', (p) => { for (const e of p.value) events.push(e); });
    const done = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.start', {
      transferMode: 'ReportEvents',
      traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8', 'disabled-by-default-v8.gc'] },
    });
    await page.waitForTimeout(TRACE_MS);
    await cdp.send('Tracing.end');
    await done;
    await cdp.detach();
    // Tiến trình renderer của trang = tiến trình có nhiều sự kiện FireAnimationFrame nhất
    const rafByPid = {};
    for (const e of events) if (e.name === 'FireAnimationFrame') rafByPid[e.pid] = (rafByPid[e.pid] || 0) + 1;
    const pagePid = Number(Object.entries(rafByPid).sort((a, b) => b[1] - a[1])[0]?.[0]);
    const mine = events.filter((e) => e.pid === pagePid);
    const pick = (name) => mine.filter((e) => e.name === name && (e.ph === 'X' || e.ph === 'B'));
    const summarize = (list) => ({ count: list.length, totalMs: +(list.reduce((s, e) => s + (e.dur || 0), 0) / 1000).toFixed(1), maxMs: +(Math.max(0, ...list.map((e) => e.dur || 0)) / 1000).toFixed(2) });
    runs.push({ animationFrames: rafByPid[pagePid] || 0, minorGC: summarize(pick('MinorGC')), majorGC: summarize(pick('MajorGC')) });
  }
  return runs;
}
```

Số MinorGC dao động nhiều giữa các lần (1 đến 4 trong 5 giây). Khi so sau Task 7, hãy lặp ít nhất 3 lần và so khoảng giá trị, đừng so một lần đo.

### Đo tay: GPU memory sau HMR

Playwright không đọc được GPU memory theo tiến trình, nên phải đo tay:

1. Chạy `npm run dev`. Mở Chrome thường (không phải Chrome của Playwright) tại `http://localhost:3000`, cửa sổ khoảng 1280×800. Đợi ma-nơ-canh hiện.
2. Mở Task Manager của Chrome (Windows/Linux: Shift+Esc; macOS: menu Window → Task Manager). Chuột phải vào tiêu đề cột, bật "GPU memory".
3. Ghi GPU memory của tab và của dòng "GPU Process".
4. Kích hoạt HMR cho `MannequinViewport.tsx` 5 lần, mỗi lần cách khoảng 5 giây. Cách 1: `touch src/components/MannequinViewport.tsx`. Nếu Console không hiện `[vite] hot updated`, dùng cách 2: thêm một dòng trống rồi lưu, xoá dòng đó rồi lưu (mỗi lần lưu tính là 1 lần HMR). Xong thì chạy `git diff src/components/MannequinViewport.tsx` để chắc file không đổi.
5. Đợi 10 giây, ghi lại hai số ở bước 3. Ghi cả số trước và sau. Nếu số tăng dần sau mỗi lần HMR, là đang rò (L2).
