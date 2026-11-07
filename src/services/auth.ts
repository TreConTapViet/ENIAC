/**
 * Tài khoản khách (Firebase Anonymous) và nâng cấp lên tài khoản thật.
 *
 * Khách: Firebase cấp một uid ẩn danh gắn với trình duyệt này. App không ghi gì của khách lên
 * Firestore (luật chỉ cho tài khoản đã xác thực email) và không thu thập địa chỉ IP; dữ liệu khách
 * chỉ nằm trong localStorage của máy đang dùng.
 *
 * Nâng cấp: liên kết Google hoặc email + mật khẩu vào chính uid khách (linkWith…), nên dữ liệu trên
 * máy giữ nguyên. Nếu Google/email đó đã có tài khoản, ta đăng nhập vào tài khoản cũ và đánh dấu
 * "gộp dữ liệu khách" để useUserSession chuyển tủ đồ khách sang uid mới (localStore.mergeLocalUserData).
 */
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { clearLocalUserData, clearPendingGuestMerge, markPendingGuestMerge } from './localStore';
import { resetCloudSyncMarker } from './userData';

const AUTH_ERRORS: Record<string, string> = {
  'auth/operation-not-allowed':
    'Chế độ khách chưa được bật trong Firebase (Authentication → Sign-in method → Anonymous).',
  'auth/admin-restricted-operation':
    'Chế độ khách chưa được bật trong Firebase (Authentication → Sign-in method → Anonymous).',
  'auth/network-request-failed': 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.',
  'auth/too-many-requests': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
  'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập Google.',
  'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup rồi thử lại.',
  'auth/unauthorized-domain':
    'Tên miền này chưa được phép đăng nhập Google (Firebase → Authentication → Settings → Authorized domains).',
  'auth/invalid-email': 'Địa chỉ email không hợp lệ.',
  'auth/weak-password': 'Mật khẩu phải có tối thiểu 6 ký tự.',
  'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác.',
  'auth/wrong-password': 'Email hoặc mật khẩu không chính xác.',
  'auth/provider-already-linked': 'Tài khoản khách này đã được nâng cấp.',
  'auth/requires-recent-login': 'Phiên đăng nhập đã cũ. Vui lòng đăng nhập lại.',
};

export function authErrorMessage(err: unknown, fallback = 'Không thể xác thực lúc này. Vui lòng thử lại.'): string {
  const code = (err as { code?: string })?.code || '';
  return AUTH_ERRORS[code] || fallback;
}

const errorCode = (err: unknown) => (err as { code?: string })?.code || '';

export async function signInAsGuest(): Promise<User> {
  try {
    return (await signInAnonymously(auth)).user;
  } catch (err) {
    throw new Error(authErrorMessage(err, 'Không vào được chế độ khách. Vui lòng thử lại.'));
  }
}

function requireGuest(): User {
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) throw new Error('Bạn không ở chế độ khách.');
  return user;
}

export type UpgradeResult =
  /** Đã liên kết vào uid khách: dữ liệu giữ nguyên, không cần làm gì thêm */
  | { kind: 'linked'; user: User }
  /** Google/email đã có tài khoản: đã đăng nhập vào tài khoản đó, dữ liệu khách sẽ được gộp vào */
  | { kind: 'merged-into-existing'; user: User };

export async function upgradeGuestWithGoogle(): Promise<UpgradeResult> {
  const guest = requireGuest();
  try {
    const cred = await linkWithPopup(guest, googleProvider);
    return { kind: 'linked', user: cred.user };
  } catch (err) {
    if (errorCode(err) === 'auth/credential-already-in-use') {
      const credential = GoogleAuthProvider.credentialFromError(err as never);
      if (credential) {
        markPendingGuestMerge(guest.uid);
        try {
          const cred = await signInWithCredential(auth, credential);
          return { kind: 'merged-into-existing', user: cred.user };
        } catch (signInErr) {
          clearPendingGuestMerge();
          throw new Error(authErrorMessage(signInErr));
        }
      }
    }
    throw new Error(authErrorMessage(err, 'Không nâng cấp được bằng Google. Vui lòng thử lại.'));
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Email này đã có tài khoản. Nhập đúng mật khẩu của tài khoản đó để chuyển dữ liệu khách sang.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

/** Liên kết email + mật khẩu vào uid khách rồi gửi thư xác thực (Firestore cần email đã xác thực) */
export async function upgradeGuestWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UpgradeResult> {
  const guest = requireGuest();
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const cred = await linkWithCredential(guest, EmailAuthProvider.credential(normalizedEmail, password));
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 80) }).catch(() => {});
    }
    await sendEmailVerification(cred.user).catch((e) => console.warn('Không gửi được thư xác thực:', e));
    return { kind: 'linked', user: cred.user };
  } catch (err) {
    const code = errorCode(err);
    if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
      throw new EmailAlreadyRegisteredError();
    }
    throw new Error(authErrorMessage(err, 'Không nâng cấp được tài khoản. Vui lòng thử lại.'));
  }
}

/** Email đã có tài khoản: đăng nhập vào đó và mang dữ liệu khách theo */
export async function signInExistingEmailAndMergeGuest(email: string, password: string): Promise<UpgradeResult> {
  const guest = requireGuest();
  markPendingGuestMerge(guest.uid);
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return { kind: 'merged-into-existing', user: cred.user };
  } catch (err) {
    clearPendingGuestMerge();
    throw new Error(authErrorMessage(err));
  }
}

/**
 * Đăng xuất. Với khách: xoá dữ liệu trên máy và xoá luôn tài khoản ẩn danh (không đăng nhập lại
 * được vào uid đó nữa). deleteUser tự đăng xuất; lỗi thì vẫn đăng xuất bình thường.
 */
export async function signOutCurrentUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  if (user.isAnonymous) {
    clearLocalUserData(user.uid);
    resetCloudSyncMarker(user.uid);
    try {
      await deleteUser(user);
      return;
    } catch {
      // rơi xuống signOut
    }
  }
  await signOut(auth);
}
