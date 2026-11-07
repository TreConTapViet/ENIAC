import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // Thư viện lớn, ít đổi → chunk riêng để trình duyệt cache lâu dài
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
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
