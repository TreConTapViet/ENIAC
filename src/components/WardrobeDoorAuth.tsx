import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import {
  sendVerificationOtpEmail,
  registerOtpUserAccount,
  loginOtpUserAccount,
  getDeterministicOtpUid,
  hashPasswordSHA256,
  setActiveSessionAccount,
  getRememberedEmail,
  setRememberedEmail,
  SessionUserAccount,
} from '../services/integrations';
import { Wardrobe3DCanvas } from './Wardrobe3DCanvas';
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
} from 'lucide-react';

interface WardrobeDoorAuthProps {
  onAuthSuccess: (customAccount?: SessionUserAccount) => void;
}

type IntroPhase = 'closed' | 'title_reveal' | 'auth_ready';

export const WardrobeDoorAuth: React.FC<WardrobeDoorAuthProps> = ({ onAuthSuccess }) => {
  const [phase, setPhase] = useState<IntroPhase>('closed');
  const [contrastMode, setContrastMode] = useState<
    'light-wardrobe-dark-bg' | 'dark-wardrobe-light-bg'
  >('light-wardrobe-dark-bg');
  const timerRef = useRef<number | null>(null);

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
    // Display enlarged "Smart Wardrobe" inside the 3D closet for 4.5 seconds, then transition to the Auth Portal (removing the wardrobe completely)
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

  // Step 3: Create SHA-256 hashed password and go STRAIGHT into the Smart Wardrobe interface (NO Google popup)
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

      // Register OTP-verified SHA-256 account and enter the app directly without triggering Google Auth
      const customAccount = await registerOtpUserAccount(
        email.trim(),
        password,
        trimmedName
      );

      onAuthSuccess(customAccount);
    } catch (err: any) {
      console.error('Registration Error:', err);
      setErrorMsg(err?.message || 'Không thể khởi tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Login Handler: Directly verifies SHA-256 password against local account or Firestore profile (no Google popup)
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
      setRememberedEmail(normalizedEmail);

      // 1. Check local SHA-256 registered account first
      try {
        const customAccount = await loginOtpUserAccount(normalizedEmail, password);
        onAuthSuccess(customAccount);
        return;
      } catch (localAuthErr: any) {
        // 2. Also check Firestore /users/{otpUid} in case account was created in an earlier session
        try {
          const otpUid = getDeterministicOtpUid(normalizedEmail);
          const snap = await getDoc(doc(db, 'users', otpUid));
          if (snap.exists()) {
            const data = snap.data();
            const inputHash = await hashPasswordSHA256(password);
            if (!data.passwordHash || data.passwordHash === inputHash) {
              const recoveredAccount = await registerOtpUserAccount(
                normalizedEmail,
                password,
                data.displayName || normalizedEmail.split('@')[0]
              );
              setActiveSessionAccount(recoveredAccount);
              onAuthSuccess(recoveredAccount);
              return;
            } else {
              throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.');
            }
          }
        } catch (firestoreErr: any) {
          if (firestoreErr?.message?.includes('Mật khẩu không chính xác')) {
            throw firestoreErr;
          }
        }
        throw localAuthErr;
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(
        err?.message || 'Địa chỉ Gmail hoặc mật khẩu không chính xác.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Dedicated Google Firebase Sign-In (ONLY triggered when clicking the Google button)
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
          ? 'Bạn đã đóng cửa sổ đăng nhập Google. Vui lòng thử lại.'
          : err?.message || 'Đăng nhập Google không thành công.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isLightWardrobe = contrastMode === 'light-wardrobe-dark-bg';

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${
        phase !== 'auth_ready' && !isLightWardrobe ? 'bg-[#F5EFE4]' : 'bg-[#181411]'
      }`}
    >
      <AnimatePresence mode="wait">
        {/* PHASE 1 & 2: 3D HONEY-OAK WARDROBE SCENE MATCHING REFERENCE IMAGE */}
        {phase !== 'auth_ready' && (
          <motion.div
            key="wardrobe-3d-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-screen flex flex-col overflow-hidden select-none"
          >
            {/* Top Header Bar matching reference image: SMART WARDROBE on left + "Bỏ qua hiệu ứng mở tủ" on right */}
            <header
              className={`w-full px-6 sm:px-12 py-4 border-b z-30 flex items-center justify-between transition-colors ${
                isLightWardrobe
                  ? 'bg-[#1B1613] border-[#2E2620] text-white'
                  : 'bg-[#EDE3D2] border-[#D5C7B2] text-stone-900'
              }`}
            >
              <span className="font-editorial text-xl sm:text-2xl font-bold tracking-wider uppercase">
                SMART WARDROBE
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setContrastMode((prev) =>
                      prev === 'light-wardrobe-dark-bg'
                        ? 'dark-wardrobe-light-bg'
                        : 'light-wardrobe-dark-bg'
                    )
                  }
                  className={`hidden md:inline-flex px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    isLightWardrobe
                      ? 'bg-[#251E19] hover:bg-[#322922] text-stone-300 border-stone-700'
                      : 'bg-white/80 hover:bg-white text-stone-800 border-stone-300'
                  }`}
                >
                  {isLightWardrobe ? 'Tủ Sáng · Nền Tối' : 'Tủ Tối · Nền Sáng'}
                </button>

                <button
                  type="button"
                  onClick={handleSkipOpeningAnimation}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                    isLightWardrobe
                      ? 'bg-[#221D19] hover:bg-[#302822] text-stone-100 border-stone-600/80'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-100 border-stone-700'
                  }`}
                >
                  Bỏ qua hiệu ứng mở tủ
                </button>
              </div>
            </header>

            {/* Radial Studio Backdrop + 3D Honey-Oak Wardrobe Canvas */}
            <div
              className="relative flex-1 w-full overflow-hidden"
              style={{
                background: isLightWardrobe
                  ? 'radial-gradient(circle at 50% 52%, #33261C 0%, #1C1612 52%, #110E0B 100%)'
                  : 'radial-gradient(circle at 50% 52%, #FFFDF9 0%, #F2E8D9 60%, #E2D4C0 100%)',
              }}
            >
              <Wardrobe3DCanvas
                doorsOpen={phase === 'title_reveal'}
                showInteriorTitle={phase === 'title_reveal'}
                contrastMode={contrastMode}
              />

              {/* Centered White & Amber-Bordered "[🚪 Mở Tủ Đồ]" Button on the Upper Double Doors */}
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

        {/* PHASE 3: SPLIT-CARD AUTHENTICATION PORTAL (Wardrobe completely unmounted) */}
        {phase === 'auth_ready' && (
          <motion.div
            key="auth-standalone-stage"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-screen w-full bg-[#161412] text-stone-900 flex flex-col"
          >
            {/* Top Bar with SMART WARDROBE Serif Brand Title */}
            <header className="w-full px-6 sm:px-12 py-5 border-b border-stone-800/80 bg-[#141210]">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <span className="font-editorial text-xl sm:text-2xl font-bold tracking-wider text-white uppercase">
                  SMART WARDROBE
                </span>
                <button
                  type="button"
                  onClick={handleCloseWardrobeAndReplay}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#221D19] hover:bg-[#302822] text-stone-200 border border-stone-700 transition-colors cursor-pointer"
                >
                  Đóng tủ & Xem lại hiệu ứng
                </button>
              </div>
            </header>

            {/* Centered Two-Column Split Card */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-5xl rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.75)] grid grid-cols-1 lg:grid-cols-12 bg-[#FAF8F5] border border-stone-200/80">
                {/* LEFT COLUMN: Warm Cream Editorial Panel (5 Cols) */}
                <div className="lg:col-span-5 bg-[#F2ECE1] p-7 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E5DEC9]">
                  <div className="space-y-6">
                    {/* Top Kicker Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#86198F]">
                        CỔNG XÁC THỰC BẢO MẬT
                      </span>
                      <button
                        type="button"
                        onClick={handleCloseWardrobeAndReplay}
                        className="text-xs font-medium text-stone-700 hover:text-stone-950 underline underline-offset-4 cursor-pointer"
                      >
                        Đóng tủ & Xem lại
                      </button>
                    </div>

                    {/* Display Serif Headline */}
                    <div className="space-y-3">
                      <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-stone-900 leading-[1.15]">
                        Không Gian Thử Đồ
                        <br />
                        Cá Nhân Hóa
                      </h1>
                      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                        Đăng nhập hoặc đăng ký tài khoản để lưu thông số cơ thể và trải nghiệm phối đồ thực tế tăng cường AR.
                      </p>
                    </div>

                    {/* Collapsible 3-Step Security Verification Box */}
                    <div className="rounded-2xl bg-white border border-stone-200/90 p-4 sm:p-5 shadow-xs transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-stone-900">
                            Quy trình xác thực bảo mật 3 bước
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSecurityDetails(!showSecurityDetails)}
                          className="text-xs font-semibold text-[#86198F] hover:text-[#6B1472] underline underline-offset-2 shrink-0 cursor-pointer"
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
                            <div className="pt-4 mt-3 border-t border-stone-100 space-y-3 text-xs text-stone-600 leading-relaxed">
                              <p>
                                <strong className="text-stone-900">
                                  Bước 1 · Định danh Gmail / SĐT:
                                </strong>{' '}
                                Hệ thống kiểm tra định dạng hợp lệ của địa chỉ Gmail hoặc Số điện thoại người dùng nhập vào để chống giả mạo tài khoản.
                              </p>
                              <p>
                                <strong className="text-stone-900">
                                  Bước 2 · Cấp & Xác thực mã OTP 6 số:
                                </strong>{' '}
                                Gửi mã OTP một lần (One-Time Password) về kênh liên hệ đã đăng ký. Người dùng nhập đúng mã OTP để chứng minh quyền sở hữu trước khi kích hoạt.
                              </p>
                              <p>
                                <strong className="text-stone-900">
                                  Bước 3 · Khởi tạo mật khẩu bằng SHA-256 & Vào thẳng giao diện:
                                </strong>{' '}
                                Mật khẩu được băm bảo mật (SHA-256) và lưu trên Cloud Firestore. Sau khi tạo mật khẩu, hệ thống đưa bạn vào thẳng không gian Smart Wardrobe mà không cần xác thực lại qua Google.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Form Panel (7 Cols) */}
                <div className="lg:col-span-7 bg-[#FAF8F5] p-7 sm:p-10 flex flex-col justify-center">
                  {/* Top Segmented Mode Switcher */}
                  <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#EAE6DF] rounded-2xl mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                      }}
                      className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
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
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Đăng ký mới (Xác thực OTP)
                    </button>
                  </div>

                  {/* ================= REGISTRATION MODE ================= */}
                  {mode === 'register' ? (
                    <div className="space-y-5">
                      {/* 3-Step Horizontal Indicator */}
                      <div className="flex items-center justify-between text-xs sm:text-sm border-b border-stone-200/90 pb-3.5">
                        <span
                          className={
                            !otpSent
                              ? 'font-bold text-stone-900'
                              : 'font-semibold text-emerald-700'
                          }
                        >
                          01. Nhập Gmail
                        </span>
                        <span className="text-stone-300">·</span>
                        <span
                          className={
                            otpSent && !otpVerified
                              ? 'font-bold text-stone-900'
                              : otpVerified
                              ? 'font-semibold text-emerald-700'
                              : 'text-stone-500'
                          }
                        >
                          02. Xác nhận OTP qua Gmail
                        </span>
                        <span className="text-stone-300">·</span>
                        <span
                          className={
                            otpVerified ? 'font-bold text-stone-900' : 'text-stone-500'
                          }
                        >
                          03. Tạo mật khẩu
                        </span>
                      </div>

                      {/* STEP 1: Enter Display Name & Gmail */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
                            Tên hiển thị của bạn
                          </label>
                          <input
                            type="text"
                            disabled={otpVerified}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="VD: Minh Anh"
                            className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#86198F] disabled:opacity-60 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
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
                              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#86198F] disabled:opacity-60 transition-colors"
                            />
                          </div>
                        </div>

                        {!otpSent && !otpVerified && (
                          <button
                            type="button"
                            disabled={loading || !email.trim()}
                            onClick={() => handleSendOtp()}
                            className="w-full py-3.5 px-6 rounded-xl bg-[#86198F] hover:bg-[#701478] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
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
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-[#86198F] shrink-0 mt-0.5" />
                          <span>{statusMessage}</span>
                        </div>
                      )}

                      {/* STEP 2: Verify 6-Digit OTP from Gmail */}
                      {otpSent && !otpVerified && (
                        <motion.form
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleVerifyOtp}
                          className="space-y-3 pt-2 border-t border-stone-200"
                        >
                          <div className="flex items-center justify-between">
                            <label className="block text-xs sm:text-sm font-semibold text-stone-800">
                              Nhập mã OTP 6 chữ số từ hộp thư Gmail
                            </label>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleSendOtp()}
                              className="text-xs font-semibold text-[#86198F] hover:underline cursor-pointer"
                            >
                              Gửi lại mã OTP
                            </button>
                          </div>
                          <div className="flex gap-2.5">
                            <div className="relative flex-1">
                              <KeyRound className="w-4 h-4 text-[#86198F] absolute left-4 top-1/2 -translate-y-1/2" />
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
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border-2 border-[#86198F]/50 text-sm font-mono tracking-widest text-stone-900 focus:outline-none focus:border-[#86198F]"
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-6 py-3 rounded-xl bg-[#86198F] hover:bg-[#701478] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Xác nhận OTP
                            </button>
                          </div>
                        </motion.form>
                      )}

                      {/* STEP 3: Create Password (ONLY appears after OTP is verified, then enters app directly) */}
                      {otpVerified && (
                        <motion.form
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handleCompleteRegistration}
                          className="space-y-4 pt-2 border-t border-stone-200"
                        >
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
                              Tạo mật khẩu bảo mật (Mã hóa SHA-256)
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
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#86198F]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
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
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#86198F]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={resetRegistrationFlow}
                              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Đổi địa chỉ Gmail khác</span>
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-6 rounded-xl bg-[#86198F] hover:bg-[#701478] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
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
                        <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
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
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#86198F]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
                          Mật khẩu
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu của bạn"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#86198F]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-6 rounded-xl bg-[#86198F] hover:bg-[#701478] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <span>{loading ? 'Đang đăng nhập...' : 'Đăng Nhập Vào Không Gian Thử Đồ'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {/* Error Message */}
                  {errorMsg && (
                    <div className="mt-4 flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Single Dedicated Google Firebase Button */}
                  <div className="mt-7 pt-6 border-t border-stone-200/90 text-center space-y-4">
                    <p className="text-xs text-stone-500">
                      Hoặc xác thực nhanh qua tài khoản Google Firebase
                    </p>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                      className="w-full py-3 px-5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
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
                      <span>Tiếp tục với tài khoản Gmail (Google Firebase)</span>
                    </button>
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
