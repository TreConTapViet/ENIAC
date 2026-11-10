/**
 * Build app PWA (gốc Huhu) để server.ts phục vụ ở /app.
 * Chạy từ gốc repo: `npm run build:app` (= vite build APP). Dùng chung node_modules và .env.local ở gốc.
 * Kiến trúc: architecture/kien-truc.md mục 4.12.
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const appDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: appDir,
  base: '/app/',
  // VITE_FIREBASE_*, VITE_EMAILJS_* lấy từ .env.local ở gốc repo, giống web
  envDir: path.resolve(appDir, '..'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(appDir, './src'),
    },
  },
  build: {
    outDir: path.resolve(appDir, 'dist'),
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three/ },
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)/ },
          ],
        },
      },
    },
  },
});
