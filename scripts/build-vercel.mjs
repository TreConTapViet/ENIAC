// Dựng bản triển khai Vercel theo Build Output API (https://vercel.com/docs/build-output-api):
//   .vercel/output/static/             web (dist/) + app PWA (APP/dist → static/app)
//   .vercel/output/functions/api.func  một Vercel Function chứa toàn bộ /api/* (app Express trong server.ts)
//   .vercel/output/config.json         định tuyến: file tĩnh → /api/* → SPA /app → SPA web
// Vercel chạy lệnh này qua "buildCommand" trong vercel.json (npm run build:vercel = npm run build + file này).
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.vercel', 'output');
const distDir = path.join(root, 'dist');
const appDistDir = path.join(root, 'APP', 'dist');
const funcDir = path.join(out, 'functions', 'api.func');

for (const dir of [distDir, appDistDir]) {
  if (!existsSync(path.join(dir, 'index.html'))) {
    console.error(`Chưa có ${path.relative(root, dir)}/index.html. Chạy \`npm run build\` trước.`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

// 1. Giao diện tĩnh: web ở gốc, app PWA ở /app
cpSync(distDir, path.join(out, 'static'), { recursive: true });
cpSync(appDistDir, path.join(out, 'static', 'app'), { recursive: true });

// 2. Function /api: gói server/vercelEntry.ts thành một file ESM duy nhất
await build({
  entryPoints: [path.join(root, 'server', 'vercelEntry.ts')],
  outfile: path.join(funcDir, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Thư viện CommonJS (express…) gọi require(): tạo require cho bản ESM
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
  },
  external: [
    // Gói tuỳ chọn của ws (thư viện con của @google/genai), không cài thì ws tự bỏ qua
    'bufferutil',
    'utf-8-validate',
    // server.ts chỉ import vite khi chạy dev, không bao giờ chạy trên Vercel
    'vite',
  ],
  logLevel: 'warning',
});

writeFileSync(
  path.join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      // Express tự đọc body; không để Vercel can thiệp vào req/res
      shouldAddHelpers: false,
      // Gemini có thể mất vài chục giây
      maxDuration: 60,
    },
    null,
    2,
  ),
);

// 3. Định tuyến
writeFileSync(
  path.join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // File trong /assets có mã băm trong tên: cho trình duyệt cache lâu
        {
          src: '^/(app/)?assets/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // Service worker và manifest luôn lấy bản mới (của app: giống server.ts; /service-worker.js: bản tự gỡ)
        {
          src: '^/(app/)?(service-worker\\.js|manifest\\.json)$',
          headers: { 'cache-control': 'no-cache' },
          continue: true,
        },
        // /app → /app/ để đường dẫn tương đối, phạm vi service worker và start_url khớp nhau
        { src: '^/app$', status: 301, headers: { Location: '/app/' } },
        { handle: 'filesystem' },
        // Mọi API vào một function
        { src: '^/api/(.*)$', dest: '/api?__api_path=$1' },
        // SPA của app: chỉ đường dẫn trang (không có đuôi file); file thiếu thì 404 thật
        { src: '^/app/(?!.*\\.[a-zA-Z0-9]+$).*$', dest: '/app/index.html' },
        // Còn lại là đường dẫn của SPA web. /assets, /models và /app thiếu file thì 404 thật.
        { src: '^/(?!assets/|models/|app/).*$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('Đã tạo .vercel/output (static + static/app + functions/api.func).');
