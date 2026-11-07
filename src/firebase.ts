import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

// Project Firebase của Smart Wardrobe (smart-wardrobe-79480) lấy từ biến môi trường VITE_FIREBASE_*
// trong .env.local. Thiếu biến thì dùng project AI Studio trong firebase-applet-config.json.
// Cấu hình web của Firebase không phải bí mật: dữ liệu được bảo vệ bằng firestore.rules.
const env = import.meta.env;
const useEnvProject = Boolean(env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_API_KEY);

const firebaseConfig = useEnvProject
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY as string,
      authDomain:
        (env.VITE_FIREBASE_AUTH_DOMAIN as string) ||
        `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID as string,
      storageBucket:
        (env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
        `${env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
      appId: env.VITE_FIREBASE_APP_ID as string,
    }
  : appletConfig;

const firestoreDatabaseId = useEnvProject
  ? (env.VITE_FIREBASE_DATABASE_ID as string) || '(default)'
  : appletConfig.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
