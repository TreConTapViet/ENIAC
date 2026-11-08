import emailjs from '@emailjs/browser';

const SERVICE_ID =
  (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() ||
  'service_ybexw99';
const OTP_TEMPLATE_ID =
  (import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID as string | undefined)?.trim() ||
  'template_7w36qgd';
const WELCOME_TEMPLATE_ID =
  (import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID as string | undefined)?.trim() ||
  'template_txc8b0e';
const PUBLIC_KEY =
  (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ||
  'iY5XohDPWaWHLdLEM';

export function isEmailJsConfigured(): boolean {
  return Boolean(
    SERVICE_ID &&
      PUBLIC_KEY &&
      (OTP_TEMPLATE_ID || WELCOME_TEMPLATE_ID) &&
      !SERVICE_ID.startsWith('YOUR_') &&
      !PUBLIC_KEY.startsWith('YOUR_')
  );
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export interface SendOtpEmailParams {
  toEmail: string;
  toName: string;
  otpCode: string;
}

export interface EmailDispatchResult {
  success: boolean;
  sentViaEmailJs: boolean;
  message: string;
  demoOtpCode?: string;
}

/**
 * Sends a 6-digit OTP verification email using EmailJS (`@emailjs/browser`).
 * Passes common template parameter aliases (`to_email`, `email`, `user_email`, `otp_code`, `passcode`, `code`, `message`)
 * so any standard EmailJS template works seamlessly.
 */
export async function sendOtpVerificationEmail({
  toEmail,
  toName,
  otpCode,
}: SendOtpEmailParams): Promise<EmailDispatchResult> {
  const cleanEmail = toEmail.trim();
  const cleanName = toName.trim() || cleanEmail.split('@')[0] || 'Bạn';

  const templateParams = {
    to_email: cleanEmail,
    user_email: cleanEmail,
    email: cleanEmail,
    recipient: cleanEmail,
    to_name: cleanName,
    user_name: cleanName,
    name: cleanName,
    otp_code: otpCode,
    otp: otpCode,
    passcode: otpCode,
    code: otpCode,
    verification_code: otpCode,
    subject: `[Smart Wardrobe 3D] Mã xác thực OTP của bạn là ${otpCode}`,
    message: `Xin chào ${cleanName}, mã xác thực OTP để đăng nhập / đăng ký tài khoản Smart Wardrobe 3D Studio của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút.`,
    app_name: 'Smart Wardrobe 3D Studio',
  };

  if (isEmailJsConfigured() && OTP_TEMPLATE_ID) {
    try {
      await emailjs.send(SERVICE_ID, OTP_TEMPLATE_ID, templateParams, {
        publicKey: PUBLIC_KEY,
      });
      return {
        success: true,
        sentViaEmailJs: true,
        message: `Đã gửi mã xác thực OTP tới hộp thư ${cleanEmail}.`,
      };
    } catch {
      return {
        success: true,
        sentViaEmailJs: false,
        demoOtpCode: otpCode,
        message: `Đã tạo mã xác thực OTP cho ${cleanEmail}. Bạn có thể nhập mã bên dưới để hoàn tất.`,
      };
    }
  }

  return {
    success: true,
    sentViaEmailJs: false,
    demoOtpCode: otpCode,
    message: `Đã tạo mã OTP xác thực cho ${cleanEmail}.`,
  };
}

export interface SendWelcomeEmailParams {
  toEmail: string;
  toName: string;
  gender: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  waistCm?: number | null;
  hipCm?: number | null;
  bustCm?: number | null;
  bmi?: number | null;
  bodyTypeLabel?: string;
}

/**
 * Sends a personalized Welcome Email after OTP verification or Google Login.
 */
export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<EmailDispatchResult> {
  const cleanEmail = params.toEmail.trim();
  const cleanName = params.toName.trim() || cleanEmail.split('@')[0] || 'Bạn';
  const genderLabel = params.gender === 'female' ? 'Nữ' : 'Nam';
  const measuresText =
    params.gender === 'female' && params.bustCm && params.waistCm && params.hipCm
      ? `Số đo 3 vòng (Ngực - Eo - Hông): ${params.bustCm} - ${params.waistCm} - ${params.hipCm} cm`
      : `Chỉ số BMI: ${params.bmi ?? 'Chuẩn'}`;

  const welcomeSummary = `Chào mừng ${cleanName} đến với Smart Wardrobe & 3D Mannequin Studio! Hồ sơ người mẫu 3D (${genderLabel}) của bạn đã được đồng bộ: Cao ${params.heightCm}cm, Nặng ${params.weightKg}kg (${measuresText}${params.bodyTypeLabel ? ` · Dáng ${params.bodyTypeLabel}` : ''}). Chúc bạn có trải nghiệm phối đồ 3D tuyệt vời!`;

  const templateParams = {
    to_email: cleanEmail,
    user_email: cleanEmail,
    email: cleanEmail,
    recipient: cleanEmail,
    to_name: cleanName,
    user_name: cleanName,
    name: cleanName,
    gender: genderLabel,
    height_cm: String(params.heightCm),
    weight_kg: String(params.weightKg),
    measurements: measuresText,
    bmi: String(params.bmi ?? ''),
    body_type: params.bodyTypeLabel || 'Cân đối',
    subject: `Chào mừng ${cleanName} đến với Smart Wardrobe 3D Studio!`,
    welcome_message: welcomeSummary,
    message: welcomeSummary,
    app_name: 'Smart Wardrobe 3D Studio',
  };

  if (isEmailJsConfigured() && WELCOME_TEMPLATE_ID) {
    try {
      await emailjs.send(SERVICE_ID, WELCOME_TEMPLATE_ID, templateParams, {
        publicKey: PUBLIC_KEY,
      });
      return {
        success: true,
        sentViaEmailJs: true,
        message: `Đã gửi thư chào mừng tới ${cleanEmail}!`,
      };
    } catch {
      return {
        success: false,
        sentViaEmailJs: false,
        message: `Chào mừng ${cleanName}! Hồ sơ của bạn đã được lưu thành công.`,
      };
    }
  }

  return {
    success: true,
    sentViaEmailJs: false,
    message: `Chào mừng ${cleanName}! Hồ sơ của bạn đã được đồng bộ.`,
  };
}
