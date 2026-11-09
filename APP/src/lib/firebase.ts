/**
 * Firebase của app /app: dùng chung project, Auth và Firestore với web Smart Wardrobe.
 *
 * - Cấu hình lấy từ VITE_FIREBASE_* trong .env.local ở gốc repo (vite.config.ts đặt envDir '..'),
 *   giống src/firebase.ts của web. Không có key trong mã nguồn.
 * - Web và app cùng origin nên dùng chung phiên đăng nhập (IndexedDB của Firebase Auth).
 * - Chỉ đọc/ghi Firestore khi canSync (không phải khách và email đã xác thực), giống
 *   src/services/userData.ts. Dữ liệu ghi đi qua webMapping.ts để khớp firestore.rules.
 * Kiến trúc: architecture/kien-truc.md mục 4.12.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Profile } from './profileStore';
import { loadProfileFromStorage, loadOccasionFromStorage } from './profileStore';
import type { Occasion } from './occasions';
import {
  fromWebProfile,
  fromWebWardrobeDoc,
  newWardrobeItemId,
  toWebProfileChanges,
  toWebWardrobeFields,
  type NewWardrobeInput,
  type SyncedWardrobeItem,
  type WebProfileDoc,
} from './webMapping';

const env = import.meta.env;

const required = {
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
} as Record<string, string | undefined>;
const missing = Object.keys(required).filter((name) => !required[name]);
if (missing.length > 0) {
  throw new Error(
    `Thiếu cấu hình Firebase: ${missing.join(', ')}. Điền vào .env.local ở thư mục gốc repo rồi build lại app.`
  );
}

const projectId = env.VITE_FIREBASE_PROJECT_ID as string;
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY as string,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || `${projectId}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: env.VITE_FIREBASE_APP_ID as string,
});

export const db = getFirestore(app, (env.VITE_FIREBASE_DATABASE_ID as string) || '(default)');
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Giống canSyncUser của web: khách và email chưa xác thực không được gọi Firestore */
export const canSyncUser = (u: FirebaseUser | null): u is FirebaseUser =>
  Boolean(u && !u.isAnonymous && u.emailVerified);

// ---------- Đăng nhập ----------

export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** Đăng xuất Firebase. Web dùng chung phiên nên cũng bị đăng xuất. */
export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    // bỏ qua
  }
}

const EMAIL_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
  'auth/user-not-found': 'Email hoặc mật khẩu không đúng.',
  'auth/invalid-email': 'Địa chỉ email không hợp lệ.',
  'auth/email-already-in-use': 'Email này đã có tài khoản. Hãy chọn "Đăng nhập" và nhập đúng mật khẩu.',
  'auth/weak-password': 'Mật khẩu cần tối thiểu 6 ký tự.',
  'auth/too-many-requests': 'Bạn thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.',
  'auth/operation-not-allowed': 'Đăng nhập bằng email chưa được bật trên Firebase Console.',
  'auth/network-request-failed': 'Không có kết nối mạng. Vui lòng thử lại.',
};

export function emailAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  return EMAIL_AUTH_MESSAGES[code] || 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
}

/**
 * Đăng nhập / đăng ký bằng Firebase Auth email + mật khẩu (cùng tài khoản với web).
 * Tài khoản mới được gửi thư xác thực; chỉ sau khi xác thực mới đồng bộ dữ liệu lên mây.
 */
export async function signInOrSignUpWithEmail(
  email: string,
  password: string,
  mode: 'login' | 'signup',
  displayName?: string
): Promise<{ user: FirebaseUser; created: boolean }> {
  const cleanEmail = email.trim();
  if (mode === 'login') {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return { user: cred.user, created: false };
  }
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const name = displayName?.trim().slice(0, 80);
  if (name) await updateProfile(cred.user, { displayName: name }).catch(() => {});
  await sendEmailVerification(cred.user).catch(() => {});
  return { user: cred.user, created: true };
}

// ---------- Hồ sơ: users/{uid} ----------

export type ProfileSaveResult = 'saved' | 'not-synced' | 'missing-web-profile';

/**
 * Ghi phần hồ sơ đồng bộ lên users/{uid} bằng updateDoc (chỉ các trường của web, không ghi đè cả tài liệu).
 * Không tự tạo hồ sơ: luật bắt buộc favoriteStyles, accentColor… mà app không có, nên người dùng
 * hoàn tất bước đầu trên web. `occasion` chỉ lưu trên máy.
 */
export async function saveUserProfileToFirestore(
  uid: string,
  profile: Profile,
  _occasion?: Occasion
): Promise<ProfileSaveResult> {
  const user = auth.currentUser;
  if (!canSyncUser(user) || user.uid !== uid) return 'not-synced';
  const ref = doc(db, 'users', uid);
  if (!(await getDoc(ref)).exists()) return 'missing-web-profile';
  await updateDoc(ref, { ...toWebProfileChanges(profile), updatedAt: serverTimestamp() });
  return 'saved';
}

/** Ghép hồ sơ web với phần chỉ có trên máy (tuổi, BMI, dáng người) */
function toAppProfile(uid: string, data: WebProfileDoc): Profile | null {
  const local = loadProfileFromStorage();
  const sameUser = Boolean(local && (local.user_id === uid || local.id === uid));
  const synced = fromWebProfile(data, sameUser ? local : null);
  if (!synced) return null;
  return {
    id: uid,
    user_id: uid,
    age: (sameUser && local?.age) || 25,
    bmi: sameUser ? local?.bmi ?? null : null,
    body_type: sameUser ? local?.body_type ?? null : null,
    auth_provider: sameUser ? local?.auth_provider : undefined,
    otp_verified: true,
    created_at: sameUser ? local?.created_at : undefined,
    ...synced,
  };
}

export async function loadUserProfileFromFirestore(
  uid: string
): Promise<{ profile: Profile; occasion: Occasion; favoriteStyles: unknown } | null> {
  const user = auth.currentUser;
  if (!canSyncUser(user) || user.uid !== uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as WebProfileDoc;
  const profile = toAppProfile(uid, data);
  if (!profile) return null;
  return { profile, occasion: loadOccasionFromStorage(), favoriteStyles: data.favoriteStyles };
}

/**
 * Nghe users/{uid}: web đổi hồ sơ thì app nhận ngay. `onChange(null)` khi chưa có hồ sơ trên mây.
 * Trả null khi không được đồng bộ.
 */
export function subscribeUserProfile(
  uid: string,
  onChange: (cloud: { profile: Profile; favoriteStyles: unknown } | null) => void,
  onError: (err: unknown) => void = () => {}
): Unsubscribe | null {
  if (!canSyncUser(auth.currentUser)) return null;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return onChange(null);
      const data = snap.data() as WebProfileDoc;
      const profile = toAppProfile(uid, data);
      onChange(profile ? { profile, favoriteStyles: data.favoriteStyles } : null);
    },
    onError
  );
}

// ---------- Tủ đồ: wardrobeItems (collection gốc, lọc theo userId) ----------

export function subscribeWardrobe(
  uid: string,
  onChange: (items: SyncedWardrobeItem[]) => void,
  onError: (err: unknown) => void = () => {}
): Unsubscribe | null {
  if (!canSyncUser(auth.currentUser)) return null;
  return onSnapshot(
    query(collection(db, 'wardrobeItems'), where('userId', '==', uid)),
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' });
        const created = data.createdAt as { toMillis?: () => number } | undefined;
        return { item: fromWebWardrobeDoc(d.id, data), ms: created?.toMillis?.() ?? 0 };
      });
      // Mới nhất lên đầu, giống tủ đồ của web
      rows.sort((a, b) => b.ms - a.ms);
      onChange(rows.map((r) => r.item));
    },
    onError
  );
}

export async function addWardrobeItem(input: Omit<NewWardrobeInput, 'uid'>): Promise<string> {
  const user = auth.currentUser;
  if (!canSyncUser(user)) throw new Error('Cần đăng nhập và xác thực email để lưu tủ đồ lên mây.');
  const id = newWardrobeItemId();
  await setDoc(doc(db, 'wardrobeItems', id), {
    ...toWebWardrobeFields({ ...input, uid: user.uid }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function deleteWardrobeItem(itemId: string): Promise<void> {
  if (!canSyncUser(auth.currentUser)) return;
  await deleteDoc(doc(db, 'wardrobeItems', itemId));
}

export { onAuthStateChanged, onIdTokenChanged, type FirebaseUser };
