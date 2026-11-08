// Chạy Smart Wardrobe trên máy (npm run dev) hoặc khi tự host (NODE_ENV=production):
// API lấy từ server/app.ts, rồi thêm phần giao diện (Vite ở chế độ dev, dist/ ở production) và listen.
// Trên Vercel, API chạy dưới dạng Vercel Function (server/vercelEntry.ts, gói bởi scripts/build-vercel.mjs),
// file này không được dùng.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { app } from "./server/app.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  // Luôn phục vụ /public (gồm /models/*.glb) trước khi trả trang SPA, để file GLB không bị thay bằng HTML
  const publicPath = path.resolve(__dirname, "public");
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  listenWithFallback(PORT);
}

// Cổng bận (thường do một `npm run dev` khác còn chạy) thì thử cổng kế tiếp thay vì dừng hẳn
function listenWithFallback(port: number, attemptsLeft = 10) {
  const server = app.listen(port, "0.0.0.0", () => {
    if (port !== PORT) {
      console.log(`Cổng ${PORT} đang bận, chuyển sang cổng ${port}.`);
    }
    console.log(`Smart Wardrobe đang chạy. Mở trình duyệt tại: http://localhost:${port}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      listenWithFallback(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(`Không mở được server ở cổng ${port}:`, err.message);
    process.exit(1);
  });
}

startServer();
