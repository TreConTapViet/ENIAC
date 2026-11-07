import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {app as apiApp} from './server.ts';

// Gắn các API /api/* của server.ts vào dev server của Vite: chỉ cần chạy `vite`
const apiMiddleware = (): Plugin => ({
  name: 'smart-wardrobe-api',
  configureServer(server) {
    server.middlewares.use(apiApp);
  },
});

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const disableHmr =
    process.env.DISABLE_HMR === 'true' || env.DISABLE_HMR === 'true';

  return {
    plugins: [react(), tailwindcss(), apiMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      port: Number(process.env.PORT || env.PORT || 3000),
      host: '0.0.0.0',
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: !disableHmr,
      watch: disableHmr ? null : {},
    },
  };
});
