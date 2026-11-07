import MannequinStudioApp from '../MannequinStudioApp';
import './studio.css';

/**
 * Khung nhúng Studio ma-nơ-canh 3D vào vùng nội dung của app (sau khi đã đăng nhập).
 * File này được App.tsx tải lười (React.lazy) nên three.js và mô hình GLB
 * chỉ được tải khi người dùng mở mục Studio.
 */
export default function StudioSection() {
  return (
    <div className="studio-embed relative h-[calc(100dvh-10rem)] min-h-[620px] w-full overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
      <MannequinStudioApp />
    </div>
  );
}
