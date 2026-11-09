import type { Occasion } from './occasions';

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  height_cm: number;
  weight_kg: number;
  waist_cm?: number | null;
  hip_cm?: number | null;
  bust_cm?: number | null;
  bmi?: number | null;
  body_type?: string | null;
  created_at?: string;
  user_id?: string;
  email?: string;
  avatar_url?: string;
  auth_provider?: 'google' | 'email';
  otp_verified?: boolean;
}

export interface SavedAuthUser {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
  otpVerified: boolean;
}

export interface ClothingItem {
  id: string;
  image_path: string;
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'other';
  color?: string | null;
  label: string;
  fit_score?: number | null;
  fit_notes?: string | null;
  created_at?: string;
  user_id?: string;
}

const PROFILE_STORAGE_KEY = 'smart_wardrobe_saved_profile_v2';
const OCCASION_STORAGE_KEY = 'smart_wardrobe_saved_occasion_v2';
const AUTH_USER_STORAGE_KEY = 'smart_wardrobe_saved_auth_user_v2';
const GOOGLE_ACCOUNTS_STORAGE_KEY = 'smart_wardrobe_google_accounts_v2';

export function saveProfileToStorage(profile: Profile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (profile.email) {
      saveAuthUserToStorage({
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        provider: profile.auth_provider || 'email',
        otpVerified: profile.otp_verified ?? true,
      });
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadProfileFromStorage(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    if (parsed && parsed.gender && parsed.height_cm && parsed.weight_kg) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearProfileStorage(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function saveOccasionToStorage(occasion: Occasion): void {
  try {
    localStorage.setItem(OCCASION_STORAGE_KEY, occasion);
  } catch {
    // Ignore
  }
}

export function loadOccasionFromStorage(): Occasion {
  try {
    const raw = localStorage.getItem(OCCASION_STORAGE_KEY) as Occasion | null;
    if (
      raw &&
      ['work', 'casual', 'party', 'sports', 'lounging', 'beach'].includes(raw)
    ) {
      return raw;
    }
  } catch {
    // Ignore
  }
  return 'casual';
}

export function saveAuthUserToStorage(user: SavedAuthUser): void {
  try {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    if (user.provider === 'google' && user.email) {
      const existing = loadSavedGoogleAccounts();
      const filtered = existing.filter(
        (a) => a.email.toLowerCase() !== user.email.toLowerCase()
      );
      localStorage.setItem(
        GOOGLE_ACCOUNTS_STORAGE_KEY,
        JSON.stringify([user, ...filtered].slice(0, 5))
      );
    }
  } catch {
    // Ignore
  }
}

export function loadAuthUserFromStorage(): SavedAuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedAuthUser;
    if (parsed && parsed.email) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function clearAuthUserStorage(): void {
  try {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function loadSavedGoogleAccounts(): SavedAuthUser[] {
  try {
    const raw = localStorage.getItem(GOOGLE_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Ignore
  }
  return [];
}

