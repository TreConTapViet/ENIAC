import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { signInAsGuest } from '../services/auth';
import {
  sendVerificationOtpEmail,
  registerFirebaseEmailAccount,
  loginFirebaseEmailAccount,
  sendPasswordReset,
  getRememberedEmail,
  setRememberedEmail,
} from '../services/integrations';
import { Wardrobe3DCanvas } from './Wardrobe3DCanvas';
import { ThemeMode } from '../types';
import {
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  DoorOpen,
  Sun,
  Moon,
} from 'lucide-react';

interface WardrobeDoorAuthProps {
  themeMode: ThemeMode;
  onChangeThemeMode: (mode: ThemeMode) => void;
  /** Gọi sau khi Firebase Auth hoặc tài khoản đăng nhập thành công */
  onAuthSuccess: (customAccount?: any) => void;
}

type IntroPhase = 'closed' | 'title_reveal' | 'auth_ready';

export const WardrobeDoorAuth: React.FC<WardrobeDoorAuthProps> = ({
  themeMode,
  onChangeThemeMode,
  onAuthSuccess,
}) => {
  const [phase, setPhase] = useState<IntroPhase>('closed');
  const timerRef = useRef<number | null>(null);

  // Synchronized Contrast Rule:
  // - Chế độ tối (dark): Ngoài tối - Trong sáng (Tủ sáng trên nền tối & Thẻ đăng nhập sáng trên nền ngoài tối)
  // - Chế độ sáng (light): Ngoài trắng - Trong tối (Tủ tối trên nền trắng & Thẻ đăng nhập tối trên nền ngoài trắng)
  const isDarkTheme = themeMode === 'dark';
  const contrastMode: 'light-wardrobe-dark-bg' | 'dark-wardrobe-light-bg' = isDarkTheme
    ? 'light-wardrobe-dark-bg'
    : 'dark-wardrobe-light-bg';

  // Auth Split Card States
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [showSecurityDetails, setShowSecurityDetails] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Progressive 3-Step Registration State:
  // 01. Nhập Gmail -> 02. Xác nhận OTP qua Gmail -> 03. Tạo mật khẩu
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleOpenWardrobe = () => {
    if (phase !== 'closed') return;
    setPhase('title_reveal');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setPhase('auth_ready');
    }, 4500);
  };

  const handleSkipOpeningAnimation = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPhase('auth_ready');
  };

  const handleCloseWardrobeAndReplay = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPhase('closed');
  };

  const resetRegistrationFlow = () => {
    setOtpSent(false);
    setGeneratedOtp('');
    setEnteredOtp('');
    setOtpVerified(false);
    setPassword('');
    setConfirmPassword('');
    setStatusMessage(null);
    setErrorMsg(null);
  };

  // Step 1: Send 6-digit OTP via EmailJS directly to user's Gmail
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setStatusMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail hợp lệ để nhận mã xác thực OTP.');
      return;
    }

    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setRememberedEmail(trimmedEmail);
      if (displayName.trim()) {
        localStorage.setItem('sw_prefill_display_name', displayName.trim());
      }
      const res = await sendVerificationOtpEmail(trimmedEmail, code, displayName.trim());
      setOtpSent(true);
      setOtpVerified(false);
      setEnteredOtp('');
      setStatusMessage(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể gửi mã OTP lúc này. Vui lòng kiểm tra lại Gmail.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the 6-digit OTP entered by the user
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!enteredOtp.trim() || enteredOtp.trim().length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số OTP được gửi tới Gmail của bạn.');
      return;
    }

    if (enteredOtp.trim() === generatedOtp && generatedOtp !== '') {
      setOtpVerified(true);
      setStatusMessage(
        'Xác thực mã OTP thành công! Vui lòng khởi tạo mật khẩu ở Bước 03 bên dưới để vào thẳng giao diện Smart Wardrobe.'
      );
    } else {
      setErrorMsg('Mã OTP không chính xác. Vui lòng kiểm tra lại hộp thư Gmail của bạn.');
    }
  };

  // Step 3: Tạo tài khoản Firebase Auth (email + mật khẩu) rồi vào thẳng giao diện Smart Wardrobe
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpVerified) {
      setErrorMsg('Vui lòng xác thực mã OTP trước khi tạo mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      const trimmedName = displayName.trim() || email.trim().split('@')[0] || 'Người dùng';
      localStorage.setItem('sw_prefill_display_name', trimmedName);

      await registerFirebaseEmailAccount(email.trim(), password, trimmedName);
      onAuthSuccess();
    } catch (err: any) {
      console.error('Registration Error:', err);
      setErrorMsg(err?.message || 'Không thể khởi tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Quên mật khẩu: Firebase gửi thư đặt lại mật khẩu tới Gmail đang nhập
  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg('Nhập Gmail của bạn trước rồi bấm "Quên mật khẩu?".');
      return;
    }
    try {
      await sendPasswordReset(normalizedEmail);
      setInfoMsg(`Nếu ${normalizedEmail} đã có tài khoản, thư đặt lại mật khẩu đã được gửi. Kiểm tra cả mục Spam.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Chưa gửi được thư đặt lại mật khẩu.');
    }
  };

  // Login Handler: Firebase Auth kiểm tra mật khẩu trên máy chủ (không đọc mã băm từ Firestore)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Gmail và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      await loginFirebaseEmailAccount(normalizedEmail, password);
      onAuthSuccess();
    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(
        err?.message || 'Địa chỉ Gmail hoặc mật khẩu không chính xác.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Chế độ khách: Firebase Anonymous, dữ liệu chỉ lưu trên máy này (không thu thập IP)
  const handleGuestSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInAsGuest();
      onAuthSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không vào được chế độ khách.');
    } finally {
      setLoading(false);
    }
  };

  // Dedicated Gmail Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      if (displayName.trim()) {
        localStorage.setItem('sw_prefill_display_name', displayName.trim());
      }
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user?.email) {
        setRememberedEmail(cred.user.email);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(
        err?.code === 'auth/popup-closed-by-user'
          ? 'Bạn đã đóng cửa sổ đăng nhập Gmail. Vui lòng thử lại.'
          : err?.code === 'auth/unauthorized-domain'
            ? `Tên miền "${window.location.hostname}" chưa được phép đăng nhập Gmail (Firebase → Authentication → Settings → Authorized domains). Tạm thời hãy dùng "Đăng ký mới (Xác thực OTP)".`
            : err?.code === 'auth/popup-blocked'
              ? 'Trình duyệt đã chặn cửa sổ đăng nhập Gmail. Hãy cho phép popup rồi thử lại.'
              : err?.message || 'Đăng nhập bằng tài khoản Gmail không thành công.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 bg-canvas`}
    >
      <AnimatePresence mode="wait">
        {/* PHASE 1 & 2: 3D WARDROBE SCENE (Chế độ tối: Ngoài tối trong sáng | Chế độ sáng: Ngoài trắng trong tối) */}
        {phase !== 'auth_ready' && (
          <motion.div
            key="wardrobe-3d-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-screen flex flex-col overflow-hidden select-none"
          >
            {/* Top Header Bar */}
            <header
              className={`w-full px-6 sm:px-12 py-4 border-b z-30 flex items-center justify-between transition-colors bg-surface border-line text-fg`}
            >
              <span className="font-editorial text-xl sm:text-2xl font-bold tracking-wider uppercase">
                SMART WARDROBE
              </span>

              <div className="flex items-center gap-2.5">
                {/* Theme Switcher — Strictly "Chế độ sáng" and "Chế độ tối" */}
                <div
                  className={`inline-flex items-center p-1 rounded-xl border bg-surface-2 border-line`}
                >
                  <button
                    type="button"
                    onClick={() => onChangeThemeMode('light')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      !isDarkTheme
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Chế độ sáng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeThemeMode('dark')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDarkTheme
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Chế độ tối</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSkipOpeningAnimation}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors cursor-pointer bg-surface-2 hover:bg-line text-fg border-line`}
                >
                  Bỏ qua hiệu ứng mở tủ
                </button>
              </div>
            </header>

            {/* Radial Studio Backdrop + 3D Wardrobe Canvas */}
            <div
              className="relative flex-1 w-full overflow-hidden"
              style={{
                background: isDarkTheme
                  ? 'radial-gradient(circle at 50% 52%, #33261C 0%, #1C1612 52%, #110E0B 100%)'
                  : 'radial-gradient(circle at 50% 52%, #FFFFFF 0%, #F8FAFC 62%, #F1F5F9 100%)',
              }}
            >
              <Wardrobe3DCanvas
                doorsOpen={phase === 'title_reveal'}
                showInteriorTitle={phase === 'title_reveal'}
                contrastMode={contrastMode}
              />

              {/* Centered "[🚪 Mở Tủ Đồ]" Button */}
              <AnimatePresence>
                {phase === 'closed' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.28 }}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none -translate-y-10"
                  >
                    <button
                      type="button"
                      onClick={handleOpenWardrobe}
                      className="pointer-events-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-amber-50 text-stone-900 border-[2.5px] border-[#F59E0B] shadow-[0_14px_34px_rgba(0,0,0,0.65)] flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <DoorOpen className="w-5 h-5 text-[#B45309] shrink-0" />
                      <span>Mở Tủ Đồ</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* PHASE 3: SPLIT-CARD AUTHENTICATION PORTAL */}
        {/* Chế độ tối: Ngoài tối (#141210) - Trong sáng (#FAF8F5) */}
        {/* Chế độ sáng: Ngoài trắng (#FFFFFF) - Trong tối (#181512) */}
        {phase === 'auth_ready' && (
          <motion.div
            key="auth-standalone-stage"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${
              isDarkTheme
                ? 'bg-[#141210] text-stone-900'
                : 'bg-white text-stone-100'
            }`}
          >
            {/* Top Bar */}
            <header
              className={`w-full px-6 sm:px-12 py-4 border-b transition-colors border-line bg-canvas text-fg`}
            >
              <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <span className="font-editorial text-xl sm:text-2xl font-bold tracking-wider uppercase">
                  SMART WARDROBE
                </span>

                <div className="flex items-center gap-2.5">
                  <div
                    className={`inline-flex items-center p-1 rounded-xl border bg-surface-2 border-line`}
                  >
                    <button
                      type="button"
                      onClick={() => onChangeThemeMode('light')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        !isDarkTheme
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Chế độ sáng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeThemeMode('dark')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDarkTheme
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Chế độ tối</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseWardrobeAndReplay}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer bg-surface-2 hover:bg-line text-fg border-line`}
                  >
                    Đóng tủ & Xem lại hiệu ứng
                  </button>
                </div>
              </div>
            </header>

            {/* Centered Two-Column Split Card */}
            {/* Chế độ tối (isDarkTheme): Ngoài tối -> Trong sáng (#FAF8F5) */}
            {/* Chế độ sáng (!isDarkTheme): Ngoài trắng -> Trong tối (#1C1917) */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
              <div
                className={`w-full max-w-5xl rounded-[28px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 border transition-colors duration-300 bg-surface text-fg border-line shadow-pop`}
              >
                {/* LEFT COLUMN: Editorial Panel (5 Cols) */}
                <div
                  className={`lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r transition-colors bg-surface-2 border-line text-fg`}
                >
                  <div className="space-y-6">
                    {/* Top Kicker Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider text-accent-text`}
                      >
                        CỔNG XÁC THỰC BẢO MẬT
                      </span>
                      <button
                        type="button"
                        onClick={handleCloseWardrobeAndReplay}
                        className={`text-xs font-medium underline underline-offset-4 cursor-pointer text-fg-muted hover:text-fg`}
                      >
                        Đóng tủ & Xem lại
                      </button>
                    </div>

                    {/* Display Serif Headline */}
                    <div className="space-y-3">
                      <h1
                        className={`font-editorial text-3xl sm:text-4xl font-bold leading-[1.15] text-fg`}
                      >
                        Không Gian Thử Đồ
                        <br />
                        Cá Nhân Hóa
                      </h1>
                      <p
                        className={`text-xs sm:text-sm leading-relaxed text-fg-muted`}
                      >
                        Đăng nhập hoặc đăng ký tài khoản để lưu thông số cơ thể và trải nghiệm phối đồ chuẩn kích cỡ cùng Manocanh 3D.
                      </p>
                    </div>

                    {/* Collapsible 3-Step Security Verification Box */}
                    <div
                      className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all bg-surface border-line text-fg`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold">
                            Quy trình xác thực bảo mật 3 bước
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSecurityDetails(!showSecurityDetails)}
                          className={`text-xs font-semibold underline underline-offset-2 shrink-0 cursor-pointer text-accent-text hover:underline`}
                        >
                          {showSecurityDetails ? 'Thu gọn' : 'Xem chi tiết'}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {showSecurityDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div
                              className={`pt-4 mt-3 border-t space-y-3 text-xs leading-relaxed border-line text-fg-muted`}
                            >
                              <p>
                                <strong className={'text-fg'}>
                                  Bước 1 · Định danh Gmail / SĐT:
                                </strong>{' '}
                                Hệ thống kiểm tra định dạng hợp lệ của địa chỉ Gmail hoặc Số điện thoại người dùng nhập vào để chống giả mạo tài khoản.
                              </p>
                              <p>
                                <strong className={'text-fg'}>
                                  Bước 2 · Cấp & Xác thực mã OTP 6 số:
                                </strong>{' '}
                                Gửi mã OTP một lần (One-Time Password) về kênh liên hệ đã đăng ký. Người dùng nhập đúng mã OTP để chứng minh quyền sở hữu trước khi kích hoạt.
                              </p>
                              <p>
                                <strong className={'text-fg'}>
                                  Bước 3 · Tạo mật khẩu & vào thẳng giao diện:
                                </strong>{' '}
                                Mật khẩu được Firebase Authentication bảo vệ, Smart Wardrobe không lưu mật khẩu. Tạo xong là vào thẳng không gian của bạn.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Form Panel (7 Cols) */}
                <div
                  className={`lg:col-span-7 p-7 sm:p-10 flex flex-col justify-center transition-colors bg-surface`}
                >
                  {/* Top Segmented Mode Switcher */}
                  <div
                    className={`grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl mb-6 bg-surface-2`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'bg-surface text-fg shadow-xs'
                          : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      Đăng nhập (Đã có tài khoản)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        mode === 'register'
                          ? 'bg-surface text-fg shadow-xs'
                          : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      Đăng ký mới (Xác thực OTP)
                    </button>
                  </div>

                  {/* ================= REGISTRATION MODE ================= */}
                  {mode === 'register' ? (
                    <div className="space-y-5">
                      {/* 3-Step Horizontal Indicator */}
                      <div
                        className={`flex items-center justify-between text-xs sm:text-sm border-b pb-3.5 border-line`}
                      >
                        <span
                          className={
                            !otpSent
                              ? 'font-bold text-fg'
                              : 'font-semibold text-emerald-500'
                          }
                        >
                          01. Nhập Gmail
                        </span>
                        <span className="text-stone-400">·</span>
                        <span
                          className={
                            otpSent && !otpVerified
                              ? 'font-bold text-fg'
                              : otpVerified
                              ? 'font-semibold text-emerald-500'
                              : 'text-stone-500'
                          }
                        >
                          02. Xác nhận OTP qua Gmail
                        </span>
                        <span className="text-stone-400">·</span>
                        <span
                          className={
                            otpVerified
                              ? 'font-bold text-fg'
                              : 'text-stone-500'
                          }
                        >
                          03. Tạo mật khẩu
                        </span>
                      </div>

                      {/* STEP 1: Enter Display Name & Gmail */}
                      <div className="space-y-4">
                        <div>
                          <label
                            className={`block text-xs sm:text-sm font-medium mb-1.5 text-fg-muted`}
                          >
                            Tên hiển thị của bạn
                          </label>
                          <input
                            type="text"
                            disabled={otpVerified}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="VD: Minh Anh"
                            className={`w-full px-4 py-3 rounded-xl border text-sm placeholder-stone-400 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors bg-surface-2 border-line text-fg`}
                          />
                        </div>

                        <div>
                          <label
                            className={`block text-xs sm:text-sm font-medium mb-1.5 text-fg-muted`}
                          >
                            Địa chỉ Gmail nhận mã xác thực OTP
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              required
                              disabled={otpVerified}
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (otpSent) {
                                  setOtpSent(false);
                                  setOtpVerified(false);
                                  setStatusMessage(null);
                                }
                              }}
                              placeholder="demo@gmail.com"
                              className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm placeholder-stone-400 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors bg-surface-2 border-line text-fg`}
                            />
                          </div>
                        </div>

                        {!otpSent && !otpVerified && (
                          <button
                            type="button"
                            disabled={loading || !email.trim()}
                            onClick={() => handleSendOtp()}
                            className="w-full py-3.5 px-6 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>
                              {loading ? 'Đang gửi mã OTP...' : 'Gửi Mã OTP Về Gmail'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Status Message Banner */}
                      {statusMessage && (
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-accent-text shrink-0 mt-0.5" />
                          <span className={'text-fg'}>
                            {statusMessage}
                          </span>
                        </div>
                      )}

                      {/* STEP 2: Verify 6-Digit OTP from Gmail */}
                      {otpSent && !otpVerified && (
                        <motion.form
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleVerifyOtp}
                          className={`space-y-3 pt-2 border-t border-line`}
                        >
                          <div className="flex items-center justify-between">
                            <label
                              className={`block text-xs sm:text-sm font-semibold text-fg`}
                            >
                              Nhập mã OTP 6 chữ số từ hộp thư Gmail
                            </label>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleSendOtp()}
                              className="text-xs font-semibold text-accent-text hover:underline cursor-pointer"
                            >
                              Gửi lại mã OTP
                            </button>
                          </div>
                          <div className="flex gap-2.5">
                            <div className="relative flex-1">
                              <KeyRound className="w-4 h-4 text-accent-text absolute left-4 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                autoFocus
                                required
                                value={enteredOtp}
                                onChange={(e) =>
                                  setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))
                                }
                                placeholder="Nhập 6 số OTP..."
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 border-accent/50 text-sm font-mono tracking-widest focus:outline-none focus:border-accent bg-surface-2 text-fg`}
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-fg text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Xác nhận OTP
                            </button>
                          </div>
                        </motion.form>
                      )}

                      {/* STEP 3: Create Password */}
                      {otpVerified && (
                        <motion.form
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleCompleteRegistration}
                          className={`space-y-4 pt-2 border-t border-line`}
                        >
                          <div>
                            <label
                              className={`block text-xs sm:text-sm font-medium mb-1.5 text-fg-muted`}
                            >
                              Tạo mật khẩu (tối thiểu 6 ký tự)
                            </label>
                            <div className="relative">
                              <Lock className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                              <input
                                type="password"
                                required
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tối thiểu 6 ký tự"
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm placeholder-stone-400 focus:outline-none focus:border-accent bg-surface-2 border-line text-fg`}
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              className={`block text-xs sm:text-sm font-medium mb-1.5 text-fg-muted`}
                            >
                              Xác nhận lại mật khẩu
                            </label>
                            <div className="relative">
                              <Lock className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                              <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu"
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm placeholder-stone-400 focus:outline-none focus:border-accent bg-surface-2 border-line text-fg`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={resetRegistrationFlow}
                              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Đổi địa chỉ Gmail khác</span>
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-6 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                          >
                            <span>
                              {loading ? 'Đang vào không gian tủ đồ...' : 'Hoàn Tất Đăng Ký & Vào Thẳng Giao Diện'}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.form>
                      )}
                    </div>
                  ) : (
                    /* ================= LOGIN MODE ================= */
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <label
                          className={`block text-xs sm:text-sm font-medium mb-1.5 text-fg-muted`}
                        >
                          Địa chỉ Gmail đã đăng ký
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="demo@gmail.com"
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm placeholder-stone-400 focus:outline-none focus:border-accent bg-surface-2 border-line text-fg`}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <label className="block text-xs sm:text-sm font-medium text-fg-muted">Mật khẩu</label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-xs font-semibold text-accent-text hover:underline cursor-pointer"
                          >
                            Quên mật khẩu?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu của bạn"
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm placeholder-stone-400 focus:outline-none focus:border-accent bg-surface-2 border-line text-fg`}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <span>{loading ? 'Đang đăng nhập...' : 'Đăng Nhập Vào Không Gian Thử Đồ'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {infoMsg && (
                    <div role="status" className="mt-4 flex items-start gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{infoMsg}</span>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMsg && (
                    <div className="mt-4 flex items-start gap-2 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Single Dedicated Gmail Button (Strictly NO "(Google Firebase)") */}
                  <div
                    className={`mt-7 pt-6 border-t text-center space-y-4 border-line`}
                  >
                    <p className="text-xs text-stone-500">
                      Hoặc xác thực nhanh qua tài khoản Gmail
                    </p>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                      className={`w-full py-3 px-5 border font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-xs cursor-pointer bg-surface hover:bg-surface-2 border-line text-fg`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Tiếp tục với tài khoản Gmail</span>
                    </button>

                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleGuestSignIn}
                        className={`w-full h-11 px-5 rounded-xl text-sm font-semibold underline-offset-4 hover:underline disabled:opacity-50 cursor-pointer text-fg-muted`}
                      >
                        Dùng thử không cần tài khoản
                      </button>
                      <p className="text-xs text-stone-500">
                        Dữ liệu chỉ lưu trên trình duyệt này. Có thể nâng cấp thành tài khoản sau mà không mất tủ đồ.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
