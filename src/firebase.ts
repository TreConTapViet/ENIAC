import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Cấu hình Firebase (project smart-wardrobe-79480) chỉ lấy từ biến môi trường VITE_FIREBASE_*
// trong .env.local (đã nằm trong .gitignore). Không để key trong mã nguồn hay trong repo.
// Lưu ý: Vite vẫn nhúng các biến VITE_* vào bundle gửi xuống trình duyệt; dữ liệu được bảo vệ
// bằng firestore.rules và giới hạn API key trên Google Cloud Console, không phải bằng việc giấu key.
const env = import.meta.env;

const required = {
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
} as Record<string, string | undefined>;

const missing = Object.keys(required).filter((name) => !required[name]);
if (missing.length > 0) {
  throw new Error(
    `Thiếu cấu hình Firebase: ${missing.join(', ')}. Sao chép .env.example thành .env.local rồi điền giá trị.`,
  );
}

const projectId = env.VITE_FIREBASE_PROJECT_ID as string;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    (env.VITE_FIREBASE_STORAGE_BUCKET as string) || `${projectId}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: env.VITE_FIREBASE_APP_ID as string,
};

const firestoreDatabaseId = (env.VITE_FIREBASE_DATABASE_ID as string) || '(default)';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
