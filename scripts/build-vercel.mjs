// Dựng bản triển khai Vercel theo Build Output API (https://vercel.com/docs/build-output-api):
//   .vercel/output/static/          giao diện, chép từ dist/ (chạy `vite build` trước)
//   .vercel/output/functions/api.func  một Vercel Function chứa toàn bộ /api/* (server/app.ts)
//   .vercel/output/config.json      định tuyến: file tĩnh → /api/* → SPA index.html
// Vercel chạy lệnh này qua "buildCommand" trong vercel.json (npm run build:vercel).
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.vercel', 'output');
const distDir = path.join(root, 'dist');
const funcDir = path.join(out, 'functions', 'api.func');

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('Chưa có dist/index.html. Chạy `vite build` trước (npm run build:vercel đã làm việc này).');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

// 1. Giao diện tĩnh
cpSync(distDir, path.join(out, 'static'), { recursive: true });

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
  // Gói tuỳ chọn của ws (thư viện con của @google/genai), không cài thì ws tự bỏ qua
  external: ['bufferutil', 'utf-8-validate'],
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
          src: '^/assets/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        { handle: 'filesystem' },
        // Mọi API vào một function
        { src: '^/api/(.*)$', dest: '/api?__api_path=$1' },
        // Còn lại là đường dẫn của SPA (/login, /studio…). /assets và /models thiếu file thì 404 thật.
        { src: '^/(?!assets/|models/).*$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('Đã tạo .vercel/output (static + functions/api.func).');
