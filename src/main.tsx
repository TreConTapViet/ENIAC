import {createRoot} from 'react-dom/client';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import './index.css';

// reducedMotion="user": tắt hiệu ứng chuyển động khi người dùng bật "Giảm chuyển động" trong hệ điều hành
createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
