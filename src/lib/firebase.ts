import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import type { Profile } from './supabase';
import type { Occasion } from './occasions';

const env = import.meta.env as Record<string, string | undefined>;
const firebaseConfig = {
  ...firebaseConfigJson,
  apiKey: env.VITE_FIREBASE_API_KEY?.trim() || firebaseConfigJson.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || firebaseConfigJson.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() || firebaseConfigJson.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || firebaseConfigJson.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || firebaseConfigJson.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID?.trim() || firebaseConfigJson.appId,
  firestoreDatabaseId:
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID?.trim() || firebaseConfigJson.firestoreDatabaseId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Gracefully handle connection test
  }
}
testConnection();

export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    // Ignore sign out error
  }
}

export async function saveUserProfileToFirestore(
  uid: string,
  profile: Profile,
  occasion: Occasion
): Promise<void> {
  const path = `users/${uid}`;
  const validOccasions: Occasion[] = [
    'work',
    'casual',
    'party',
    'sports',
    'lounging',
    'beach',
  ];
  const safeOccasion: Occasion = validOccasions.includes(occasion)
    ? occasion
    : 'casual';

  const sanitizeRange = (
    val: number | null | undefined,
    min: number,
    max: number
  ): number | null => {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(max, Math.max(min, n));
  };

  try {
    const payload: Record<string, unknown> = {
      uid: uid.slice(0, 128),
      name: (profile.name || 'Người dùng').trim().slice(0, 120) || 'Người dùng',
      gender: profile.gender === 'male' ? 'male' : 'female',
      height_cm: Math.min(260, Math.max(50, Number(profile.height_cm) || 160)),
      weight_kg: Math.min(350, Math.max(15, Number(profile.weight_kg) || 45)),
      occasion: safeOccasion,
      auth_provider: profile.auth_provider === 'email' ? 'email' : 'google',
      otp_verified: Boolean(profile.otp_verified ?? true),
      updatedAt: new Date().toISOString().slice(0, 64),
    };
    if (profile.email) payload.email = profile.email.slice(0, 200);
    if (profile.avatar_url && profile.avatar_url.length <= 150000) {
      payload.avatar_url = profile.avatar_url;
    }
    if (typeof profile.age === 'number' && Number.isFinite(profile.age)) {
      payload.age = Math.min(130, Math.max(0, profile.age));
    }
    payload.waist_cm = sanitizeRange(profile.waist_cm, 30, 200);
    payload.hip_cm = sanitizeRange(profile.hip_cm, 30, 220);
    payload.bust_cm = sanitizeRange(profile.bust_cm, 30, 220);
    payload.bmi = sanitizeRange(profile.bmi, 5, 100);
    if (profile.body_type) {
      payload.body_type = String(profile.body_type).slice(0, 80);
    }

    await setDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserProfileFromFirestore(
  uid: string
): Promise<{ profile: Profile; occasion: Occasion } | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const profile: Profile = {
      id: uid,
      user_id: uid,
      name: String(data.name || 'Người dùng'),
      age: Number(data.age || 25),
      gender: data.gender === 'male' ? 'male' : 'female',
      height_cm: Number(data.height_cm || 160),
      weight_kg: Number(data.weight_kg || 45),
      waist_cm: data.waist_cm ?? null,
      hip_cm: data.hip_cm ?? null,
      bust_cm: data.bust_cm ?? null,
      bmi: data.bmi ?? null,
      body_type: data.body_type ?? null,
      email: data.email || undefined,
      avatar_url: data.avatar_url || undefined,
      auth_provider: data.auth_provider || 'google',
      otp_verified: data.otp_verified ?? true,
    };
    const occasion = (data.occasion as Occasion) || 'casual';
    return { profile, occasion };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export { onAuthStateChanged, type FirebaseUser };
