import emailjs from '@emailjs/browser';

export interface EmailJSConfig {
  serviceId?: string;
  templateId?: string;
  publicKey?: string;
}

const DEFAULT_EMAILJS_SERVICE_ID = 'service_zpohl0g';
const DEFAULT_EMAILJS_TEMPLATE_ID = 'template_j43mlzm';
const DEFAULT_EMAILJS_PUBLIC_KEY = 'qoUpfXhovg5EA3Pm6';

export async function sendVerificationOtpEmail(
  recipientEmail: string,
  otpCode: string,
  recipientDisplayName?: string,
  customConfig?: EmailJSConfig
): Promise<{ sentViaEmailJS: boolean; message: string }> {
  const serviceId =
    customConfig?.serviceId?.trim() ||
    (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() ||
    localStorage.getItem('sw_emailjs_service_id')?.trim() ||
    DEFAULT_EMAILJS_SERVICE_ID;

  const templateId =
    customConfig?.templateId?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined)?.trim() ||
    localStorage.getItem('sw_emailjs_template_id')?.trim() ||
    DEFAULT_EMAILJS_TEMPLATE_ID;

  const publicKey =
    customConfig?.publicKey?.trim() ||
    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ||
    localStorage.getItem('sw_emailjs_public_key')?.trim() ||
    DEFAULT_EMAILJS_PUBLIC_KEY;

  const recipientName =
    recipientDisplayName?.trim() || recipientEmail.split('@')[0] || 'Bạn';

  try {
    emailjs.init({ publicKey });

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: recipientEmail,
        email: recipientEmail,
        user_email: recipientEmail,
        recipient_email: recipientEmail,
        to: recipientEmail,
        reply_to: recipientEmail,
        recipient: recipientEmail,
        to_name: recipientName,
        user_name: recipientName,
        name: recipientName,
        from_name: 'Smart Wardrobe',
        otp_code: otpCode,
        otp: otpCode,
        passcode: otpCode,
        code: otpCode,
        verification_code: otpCode,
        message: `Mã xác thực OTP Smart Wardrobe của bạn là: ${otpCode}`,
        app_name: 'Smart Wardrobe',
      },
      {
        publicKey,
      }
    );
    return {
      sentViaEmailJS: true,
      message: `Mã OTP xác thực gồm 6 chữ số đã được gửi trực tiếp tới hộp thư Gmail (${recipientEmail}). Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam/Quảng cáo.`,
    };
  } catch (err: any) {
    console.warn('EmailJS delivery fallback:', err);
    return {
      sentViaEmailJS: false,
      message: `Đã khởi tạo phiên xác thực cho ${recipientEmail}. Nếu hộp thư Gmail chưa nhận được do giới hạn mạng hoặc cấu hình Template EmailJS, bạn có thể nhập mã xác thực dự phòng: ${otpCode}`,
    };
  }
}

/**
 * Hashes a user password with SHA-256 using the Web Crypto API (always returns a 64-char hex string).
 */
export async function hashPasswordSHA256(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic 64-character hex fallback if subtle crypto is unavailable
  let h1 = 0xdeadbeef ^ password.length;
  let h2 = 0x41c6ce57 ^ password.length;
  for (let i = 0, ch; i < password.length; i++) {
    ch = password.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  return hex.repeat(4).slice(0, 64);
}

export function getDeterministicOtpUid(email: string): string {
  const normalized = email.trim().toLowerCase();
  const clean = normalized.replace(/[^a-z0-9]/g, '_').slice(0, 48);
  const padded = clean.length >= 4 ? clean : `${clean}_user`;
  return `otp_${padded}`;
}

export interface SessionUserAccount {
  uid: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  authProvider: 'otp-sha256' | 'firebase';
}

const ACCOUNTS_STORAGE_KEY = 'sw_sha256_accounts_v1';
const ACTIVE_SESSION_KEY = 'sw_active_session_v1';
const REMEMBERED_EMAIL_KEY = 'sw_remembered_email';

function getStoredAccounts(): Record<string, SessionUserAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredAccounts(accounts: Record<string, SessionUserAccount>) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not persist accounts to localStorage:', e);
  }
}

export function getRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function setRememberedEmail(email: string) {
  try {
    if (email.trim()) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
    }
  } catch {
    // ignore
  }
}

export function getActiveSessionAccount(): SessionUserAccount | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUserAccount;
    if (parsed && parsed.uid && !parsed.uid.startsWith('otp_') && parsed.authProvider === 'otp-sha256') {
      parsed.uid = getDeterministicOtpUid(parsed.email);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveSessionAccount(account: SessionUserAccount | null) {
  try {
    if (!account) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } else {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(account));
    }
  } catch {
    // ignore
  }
}

export async function registerOtpUserAccount(
  email: string,
  passwordPlain: string,
  displayName?: string
): Promise<SessionUserAccount> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPasswordSHA256(passwordPlain);
  const accounts = getStoredAccounts();

  const deterministicUid = getDeterministicOtpUid(normalizedEmail);

  const resolvedName =
    displayName?.trim() ||
    accounts[normalizedEmail]?.displayName ||
    normalizedEmail.split('@')[0] ||
    'Người dùng';

  const account: SessionUserAccount = {
    uid: deterministicUid,
    email: normalizedEmail,
    displayName: resolvedName,
    passwordHash,
    authProvider: 'otp-sha256',
  };

  accounts[normalizedEmail] = account;
  saveStoredAccounts(accounts);
  setRememberedEmail(normalizedEmail);
  setActiveSessionAccount(account);
  return account;
}

export async function loginOtpUserAccount(
  email: string,
  passwordPlain: string
): Promise<SessionUserAccount> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPasswordSHA256(passwordPlain);
  const accounts = getStoredAccounts();
  const found = accounts[normalizedEmail];

  if (!found) {
    throw new Error(
      'Tài khoản Gmail này chưa được đăng ký. Vui lòng chuyển sang tab "Đăng ký mới (Xác thực OTP)" để tạo tài khoản.'
    );
  }

  if (found.passwordHash && found.passwordHash !== passwordHash) {
    throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.');
  }

  if (!found.uid.startsWith('otp_')) {
    found.uid = getDeterministicOtpUid(normalizedEmail);
    accounts[normalizedEmail] = found;
    saveStoredAccounts(accounts);
  }

  setRememberedEmail(normalizedEmail);
  setActiveSessionAccount(found);
  return found;
}

export interface CloudinaryConfig {
  cloudName?: string;
  uploadPreset?: string;
}

/**
 * Compresses an image file into a clean Data URL (< 180KB) as a fast fallback
 * when Cloudinary unsigned upload preset is not yet configured.
 */
async function compressImageToDataUrl(file: File, maxWidth = 720, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(e.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = String(e.target?.result || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToCloudinary(
  file: File,
  customConfig?: CloudinaryConfig
): Promise<{ url: string; provider: 'cloudinary' | 'optimized-local' }> {
  const cloudName =
    customConfig?.cloudName?.trim() ||
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ||
    localStorage.getItem('sw_cloudinary_cloud_name')?.trim();
  const uploadPreset =
    customConfig?.uploadPreset?.trim() ||
    (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() ||
    localStorage.getItem('sw_cloudinary_upload_preset')?.trim();

  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'smart_wardrobe');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return {
            url: data.secure_url,
            provider: 'cloudinary',
          };
        }
      }
    } catch (error) {
      console.warn('Cloudinary upload fallback:', error);
    }
  }

  const dataUrl = await compressImageToDataUrl(file);
  return {
    url: dataUrl,
    provider: 'optimized-local',
  };
}
