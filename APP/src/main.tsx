import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service worker chỉ quản lý /app/ (BASE_URL), không ảnh hưởng trang web ở "/"
if ('serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  const registerSw = () => {
    navigator.serviceWorker
      .register(`${base}service-worker.js`, { scope: base })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSw();
  } else {
    window.addEventListener('DOMContentLoaded', registerSw);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
