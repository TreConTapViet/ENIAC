import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  Monitor,
  Loader2,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { analyzeBody, type RawMeasurements } from '@/lib/bodyAnalysis';
import BodyShapeGuideModal from './BodyShapeGuideModal';
import ShareAppModal from './ShareAppModal';
import PwaInstallToast from './PwaInstallToast';
import { OCCASIONS, type Occasion } from '@/lib/occasions';
import {
  saveProfileToStorage,
  saveOccasionToStorage,
  saveAuthUserToStorage,
  loadAuthUserFromStorage,
  loadSavedGoogleAccounts,
  type Profile,
  type SavedAuthUser,
} from '@/lib/profileStore';
import {
  generateOtpCode,
  sendOtpVerificationEmail,
  sendWelcomeEmail,
} from '@/lib/emailjs';
import {
  auth,
  signInWithGooglePopup,
  signInOrSignUpWithEmail,
  emailAuthErrorMessage,
  saveUserProfileToFirestore,
  loadUserProfileFromFirestore,
} from '@/lib/firebase';

interface Props {
  initialProfile?: Profile | null;
  initialOccasion?: Occasion;
  onComplete: (profile: Profile, occasion: Occasion) => void;
  onSkip: () => void;
}

type Stage =
  | 'door'
  | 'enter'
  | 'greet'
  | 'askName'
  | 'askAge'
  | 'askGender'
  | 'askHeight'
  | 'askWeight'
  | 'askFemaleMeasures'
  | 'compute'
  | 'reveal'
  | 'askOccasion'
  | 'computerDesk'
  | 'saved';

interface FormState {
  name: string;
  age: string;
  gender: 'male' | 'female';
  height: string;
  weight: string;
  waist: string;
  hip: string;
  bust: string;
}

const EMPTY: FormState = {
  name: '',
  age: '',
  gender: 'female',
  height: '',
  weight: '',
  waist: '',
  hip: '',
  bust: '',
};

const FORM_DRAFT_STORAGE_KEY = 'smart_wardrobe_form_draft_v2';

function loadDraftForm(initialProfile?: Profile | null): FormState {
  if (initialProfile && initialProfile.name !== 'Khách') {
    return {
      name: initialProfile.name || '',
      age: initialProfile.age ? String(initialProfile.age) : '',
      gender: initialProfile.gender || 'female',
      height: initialProfile.height_cm ? String(initialProfile.height_cm) : '',
      weight: initialProfile.weight_kg ? String(initialProfile.weight_kg) : '',
      waist: initialProfile.waist_cm ? String(initialProfile.waist_cm) : '',
      hip: initialProfile.hip_cm ? String(initialProfile.hip_cm) : '',
      bust: initialProfile.bust_cm ? String(initialProfile.bust_cm) : '',
    };
  }
  try {
    const raw = localStorage.getItem(FORM_DRAFT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FormState>;
      const savedAuth = loadAuthUserFromStorage();
      return {
        name: parsed.name || savedAuth?.name || '',
        age: parsed.age || '',
        gender: parsed.gender === 'male' ? 'male' : 'female',
        height: parsed.height || '',
        weight: parsed.weight || '',
        waist: parsed.waist || '',
        hip: parsed.hip || '',
        bust: parsed.bust || '',
      };
    }
  } catch {
    // Ignore storage error
  }
  const savedAuth = loadAuthUserFromStorage();
  if (savedAuth?.name) {
    return { ...EMPTY, name: savedAuth.name };
  }
  return EMPTY;
}

export function parseMeasureNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseHeightCm(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim().toLowerCase();
  const mMatch = trimmed.match(/^([12])\s*m\s*(\d{1,2})?$/);
  if (mMatch) {
    const meters = Number(mMatch[1]);
    const cmPart = mMatch[2] ? Number(mMatch[2].padEnd(2, '0')) : 0;
    return meters * 100 + cmPart;
  }
  const n = parseMeasureNumber(trimmed);
  if (n >= 1.0 && n <= 2.5) {
    return Math.round(n * 100);
  }
  return Math.round(n);
}

export default function OnboardingScene({
  initialProfile,
  initialOccasion,
  onComplete,
  onSkip,
}: Props) {
  const [stage, setStage] = useState<Stage>('door');
  const [form, setForm] = useState<FormState>(() => loadDraftForm(initialProfile));
  const [occasion, setOccasion] = useState<Occasion | null>(initialOccasion || null);
  const [enterProgress, setEnterProgress] = useState(0);
  const [doorProgress, setDoorProgress] = useState(0);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeBody> | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickGoogleLoading, setQuickGoogleLoading] = useState(false);
  const [signedInUser, setSignedInUser] = useState<SavedAuthUser | null>(() =>
    loadAuthUserFromStorage()
  );
  const [showShareModal, setShowShareModal] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('install=1')) {
      return true;
    }
    return false;
  });

  async function handleQuickTopGoogleSignIn() {
    if (quickGoogleLoading) return;
    setQuickGoogleLoading(true);
    try {
      const fbUser = await signInWithGooglePopup();
      const userEmail = fbUser.email || '';
      const userName =
        fbUser.displayName || form.name.trim() || userEmail.split('@')[0] || 'Người dùng';
      const avatarUrl = fbUser.photoURL || undefined;

      const savedUser: SavedAuthUser = {
        email: userEmail,
        name: userName,
        avatarUrl,
        provider: 'google',
        otpVerified: true,
      };
      saveAuthUserToStorage(savedUser);
      setSignedInUser(savedUser);

      if (!form.name.trim() && userName) {
        setForm((prev) => ({ ...prev, name: userName }));
      }

      // Check if user already has a saved profile in Firestore
      try {
        const existingCloud = await loadUserProfileFromFirestore(fbUser.uid);
        if (existingCloud) {
          saveProfileToStorage(existingCloud.profile);
          saveOccasionToStorage(existingCloud.occasion);
          setQuickGoogleLoading(false);
          onComplete(existingCloud.profile, existingCloud.occasion);
          return;
        }
      } catch {
        // Ignore if no cloud doc yet
      }

      // Send welcome email in background
      if (userEmail) {
        sendWelcomeEmail({
          toEmail: userEmail,
          toName: userName,
          gender: form.gender,
          heightCm: parseHeightCm(form.height) || 160,
          weightKg: parseMeasureNumber(form.weight) || 45,
          waistCm: form.gender === 'female' ? parseMeasureNumber(form.waist) || 66 : null,
          hipCm: form.gender === 'female' ? parseMeasureNumber(form.hip) || 84 : null,
          bustCm: form.gender === 'female' ? parseMeasureNumber(form.bust) || 90 : null,
          bmi: analysis?.bmi ?? null,
          bodyTypeLabel: analysis?.bodyTypeLabel,
        }).catch(() => {});
      }

      // If user already completed body analysis & occasion, finish onboarding immediately
      if (analysis && occasion) {
        setQuickGoogleLoading(false);
        await saveProfile(occasion, {
          email: userEmail,
          name: userName,
          avatarUrl,
          provider: 'google',
          otpVerified: true,
        });
        return;
      }

      // If user is still at door/enter/greet/askName, advance to next measurement step
      if (stage === 'door' || stage === 'enter' || stage === 'greet' || stage === 'askName') {
        setStage('askAge');
      }
    } catch {
      // User closed popup or cancelled
    } finally {
      setQuickGoogleLoading(false);
    }
  }

  // Persist form draft to localStorage so user never loses typed measurements
  useEffect(() => {
    try {
      localStorage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Ignore
    }
  }, [form]);

  useEffect(() => {
    if (stage === 'door') {
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1200);
        setDoorProgress(p);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setTimeout(() => setStage('enter'), 400);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    if (stage === 'enter') {
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1600);
        setEnterProgress(p);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setTimeout(() => setStage('greet'), 350);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
  }, [stage]);

  const fieldReady = useMemo(() => {
    const h = parseHeightCm(form.height);
    const w = parseMeasureNumber(form.weight);
    const waist = parseMeasureNumber(form.waist);
    const hip = parseMeasureNumber(form.hip);
    const bust = parseMeasureNumber(form.bust);
    const age = parseMeasureNumber(form.age);
    switch (stage) {
      case 'askName': return form.name.trim().length > 0;
      case 'askAge': return age > 0 && age < 120;
      case 'askGender': return true;
      case 'askHeight': return h >= 80 && h <= 250;
      case 'askWeight': return w >= 20 && w <= 300;
      case 'askFemaleMeasures':
        return waist >= 40 && hip >= 50 && bust >= 50;
      case 'askOccasion': return occasion !== null;
      default: return true;
    }
  }, [stage, form, occasion]);

  function next() {
    if (!fieldReady) return;
    switch (stage) {
      case 'door': setStage('enter'); break;
      case 'greet': setStage('askName'); break;
      case 'askName': setStage('askAge'); break;
      case 'askAge': setStage('askGender'); break;
      case 'askGender':
        setStage(form.gender === 'female' ? 'askFemaleMeasures' : 'askHeight');
        break;
      case 'askFemaleMeasures': setStage('askHeight'); break;
      case 'askHeight': setStage('askWeight'); break;
      case 'askWeight':
        setStage('compute');
        setTimeout(() => {
          const raw: RawMeasurements = {
            gender: form.gender as 'male' | 'female',
            height_cm: parseHeightCm(form.height),
            weight_kg: parseMeasureNumber(form.weight),
            waist_cm: form.gender === 'female' ? parseMeasureNumber(form.waist) : null,
            hip_cm: form.gender === 'female' ? parseMeasureNumber(form.hip) : null,
            bust_cm: form.gender === 'female' ? parseMeasureNumber(form.bust) : null,
          };
          setAnalysis(analyzeBody(raw));
          setStage('reveal');
        }, 1400);
        break;
      case 'reveal': setStage('askOccasion'); break;
      case 'askOccasion':
        if (occasion) {
          saveOccasionToStorage(occasion);
          const existingAuth = loadAuthUserFromStorage();
          if (existingAuth && existingAuth.email) {
            saveProfile(occasion, {
              email: existingAuth.email,
              name: form.name.trim() || existingAuth.name,
              avatarUrl: existingAuth.avatarUrl,
              provider: existingAuth.provider,
              otpVerified: existingAuth.otpVerified,
            });
          } else {
            setStage('computerDesk');
          }
        }
        break;
    }
  }

  interface AuthMeta {
    email?: string;
    name?: string;
    avatarUrl?: string;
    provider?: 'google' | 'email';
    otpVerified?: boolean;
  }

  async function saveProfile(occ: Occasion, authMeta?: AuthMeta) {
    if (!analysis) return;
    setSaving(true);
    const finalName = (authMeta?.name || form.name).trim() || 'Khách';
    const uid = auth.currentUser?.uid || crypto.randomUUID();
    const finalProfile: Profile = {
      id: uid,
      user_id: auth.currentUser?.uid,
      name: finalName,
      age: parseMeasureNumber(form.age) || 25,
      gender: form.gender,
      height_cm: parseHeightCm(form.height),
      weight_kg: parseMeasureNumber(form.weight),
      waist_cm: form.gender === 'female' ? parseMeasureNumber(form.waist) : null,
      hip_cm: form.gender === 'female' ? parseMeasureNumber(form.hip) : null,
      bust_cm: form.gender === 'female' ? parseMeasureNumber(form.bust) : null,
      bmi: analysis.bmi,
      body_type: analysis.bodyType,
      email: authMeta?.email || auth.currentUser?.email || undefined,
      avatar_url: authMeta?.avatarUrl || auth.currentUser?.photoURL || undefined,
      auth_provider: authMeta?.provider || (auth.currentUser ? 'google' : undefined),
      otp_verified: authMeta?.otpVerified ?? true,
      created_at: new Date().toISOString(),
    };

    if (auth.currentUser) {
      try {
        await saveUserProfileToFirestore(auth.currentUser.uid, finalProfile, occ);
      } catch {
        // Ignore cloud sync error, local storage still saves
      }
    }

    localStorage.removeItem('pending_onboarding');
    setSaving(false);
    saveProfileToStorage(finalProfile);
    saveOccasionToStorage(occ);
    onComplete(finalProfile, occ);
  }

  function saveProfileLocal(occ: Occasion, authMeta?: AuthMeta) {
    if (!analysis) return;
    const finalProfile: Profile = {
      id: auth.currentUser?.uid || crypto.randomUUID(),
      user_id: auth.currentUser?.uid,
      name: (authMeta?.name || form.name).trim() || 'Khách',
      age: parseMeasureNumber(form.age) || 25,
      gender: form.gender,
      height_cm: parseHeightCm(form.height),
      weight_kg: parseMeasureNumber(form.weight),
      waist_cm: form.gender === 'female' ? parseMeasureNumber(form.waist) : null,
      hip_cm: form.gender === 'female' ? parseMeasureNumber(form.hip) : null,
      bust_cm: form.gender === 'female' ? parseMeasureNumber(form.bust) : null,
      bmi: analysis.bmi,
      body_type: analysis.bodyType,
      email: authMeta?.email,
      avatar_url: authMeta?.avatarUrl,
      auth_provider: authMeta?.provider,
      otp_verified: authMeta?.otpVerified,
      created_at: new Date().toISOString(),
    };
    if (auth.currentUser) {
      saveUserProfileToFirestore(auth.currentUser.uid, finalProfile, occ).catch(() => {});
    }
    saveProfileToStorage(finalProfile);
    saveOccasionToStorage(occ);
    onComplete(finalProfile, occ);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-rose-50 via-amber-50 to-sky-50">
      <ShopBackdrop />

      <div className="absolute right-5 top-5 z-30 flex items-center gap-2">
        {signedInUser?.email ? (
          <button
            type="button"
            onClick={handleQuickTopGoogleSignIn}
            disabled={quickGoogleLoading}
            title="Nhấn để khôi phục hồ sơ từ Firebase hoặc đổi tài khoản Google"
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur transition hover:border-emerald-400 hover:bg-white cursor-pointer disabled:opacity-60"
          >
            {quickGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : signedInUser.avatarUrl ? (
              <img
                src={signedInUser.avatarUrl}
                alt={signedInUser.name}
                referrerPolicy="no-referrer"
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <span>Đã đăng nhập: {signedInUser.email}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleQuickTopGoogleSignIn}
            disabled={quickGoogleLoading}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/95 px-4 py-1.5 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur transition hover:border-rose-300 hover:bg-white cursor-pointer disabled:opacity-60"
          >
            {quickGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
            ) : (
              <GoogleIcon />
            )}
            <span>Đăng nhập bằng Google</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-rose-600 cursor-pointer"
        >
          <Smartphone className="h-4 w-4" />
          <span>📱 Tải App / Chia sẻ</span>
        </button>
        <button
          onClick={onSkip}
          className="rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-stone-600 backdrop-blur hover:bg-white cursor-pointer"
        >
          Bỏ qua
        </button>
      </div>

      <div className="relative z-20 mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 pt-8 pb-8">
        {/* stage characters */}
        <div className="relative flex h-60 w-full items-end justify-center">
          {stage === 'door' ? (
            <DoorScene progress={doorProgress} />
          ) : (
            <>
              <Shopkeeper active={stage !== 'enter'} />
              <ChibiCustomer progress={enterProgress} />
            </>
          )}
        </div>

        {/* dialog box */}
        <DialogBox stage={stage} analysis={analysis} occasion={occasion}>
          {(stage === 'askName' ||
            stage === 'askAge' ||
            stage === 'askGender' ||
            stage === 'askFemaleMeasures' ||
            stage === 'askHeight' ||
            stage === 'askWeight') && (
            <div className="mt-4 space-y-3">
              <FieldInput stage={stage} form={form} setForm={setForm} />
            </div>
          )}

          {stage === 'askOccasion' && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setOccasion(o.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                      occasion === o.value
                        ? 'border-rose-500 bg-rose-50 text-rose-600'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-rose-300'
                    }`}
                  >
                    <span className="text-2xl">{o.emoji}</span>
                    {o.label}
                  </button>
                ))}
              </div>
              {occasion && (
                <p className="rounded-lg bg-rose-50/60 px-3 py-2 text-sm text-stone-600">
                  {OCCASIONS.find((o) => o.value === occasion)?.description}
                </p>
              )}
            </div>
          )}

          {/* Single prominent 'Tiếp tục' button for all interactive stages */}
          {stage !== 'compute' && stage !== 'computerDesk' && stage !== 'enter' && (
            <button
              onClick={next}
              disabled={!fieldReady || saving}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-200 transition enabled:hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {saving ? 'Đang lưu...' : 'Tiếp tục'}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </DialogBox>

        {stage === 'computerDesk' && (
          <ComputerDeskStage
            form={form}
            analysis={analysis}
            occasion={occasion}
            saving={saving}
            onSkip={() => saveProfileLocal(occasion!)}
            onAuthed={(meta) => {
              // Tài khoản đã có hồ sơ trên web: dùng hồ sơ web thay vì ghi đè bằng số đo vừa nhập
              if (meta?.cloudProfile) {
                localStorage.removeItem('pending_onboarding');
                saveProfileToStorage(meta.cloudProfile);
                saveOccasionToStorage(occasion!);
                onComplete(meta.cloudProfile, occasion!);
                return;
              }
              saveProfile(occasion!, meta);
            }}
          />
        )}
      </div>

      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      <PwaInstallToast onOpenGuide={() => setShowShareModal(true)} />
    </div>
  );
}

/* ---------- dialog text ---------- */

function dialogText(stage: Stage, analysis: ReturnType<typeof analyzeBody> | null) {
  switch (stage) {
    case 'door': return { speaker: '', text: 'Bạn bước tới cửa tiệm quần áo. Hãy mở cửa bước vào!' };
    case 'enter': return { speaker: '', text: '...' };
    case 'greet':
      return { speaker: 'Nhân viên', text: 'Chào bạn! Mình là nhân viên của tiệm. Cho mình xin ít thông tin để có thể chọn được cho bạn bộ trang phục phù hợp nhé!' };
    case 'askName': return { speaker: 'Nhân viên', text: 'Trước tiên — bạn tên gì?' };
    case 'askAge': return { speaker: 'Nhân viên', text: `Bạn bao nhiêu tuổi?` };
    case 'askGender': return { speaker: 'Nhân viên', text: 'Bạn là nam hay nữ? (Nữ sẽ cần thêm số đo eo - hông - ngực để xác định dáng người chính xác hơn.)' };
    case 'askFemaleMeasures': return { speaker: 'Nhân viên', text: 'Với nữ, mình cần số đo eo, hông và ngực (cm) để chốt dáng người. Bạn nhập nhé!' };
    case 'askHeight': return { speaker: 'Nhân viên', text: 'Chiều cao của bạn (cm)?' };
    case 'askWeight': return { speaker: 'Nhân viên', text: 'Cân nặng (kg)? Mình sẽ tính chỉ số BMI cho bạn.' };
    case 'compute': return { speaker: 'Nhân viên', text: 'Để mình tính toán dáng người của bạn một chút...' };
    case 'reveal':
      if (!analysis) return { speaker: 'Nhân viên', text: 'Xong rồi!' };
      return {
        speaker: 'Nhân viên',
        text: `Dáng người của bạn là "${analysis.bodyTypeLabel}" — BMI ${analysis.bmi} (${analysis.bmiCategory}). ${analysis.bodyTypeDescription}`,
      };
    case 'askOccasion':
      return { speaker: 'Nhân viên', text: 'Cuối cùng — bạn dự định phối đồ cho hoàn cảnh nào? Mình sẽ gợi ý phù hợp hơn.' };
    case 'computerDesk':
      return { speaker: 'Nhân viên', text: 'Cảm ơn bạn! Giờ mời bạn qua bàn máy tính bên kia để đăng nhập hoặc tạo tài khoản — mình sẽ lưu thông tin của bạn vào tài khoản để lần sau quay lại là có sẵn nhé!' };
    default: return { speaker: '', text: '' };
  }
}

function DialogBox({
  stage,
  analysis,
  occasion,
  children,
}: {
  stage: Stage;
  analysis: ReturnType<typeof analyzeBody> | null;
  occasion: Occasion | null;
  children?: React.ReactNode;
}) {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const d = dialogText(stage, analysis);
  const visible = stage !== 'enter';
  return (
    <div
      className={`mt-4 w-full max-w-2xl rounded-3xl border border-white/60 bg-white/90 p-4 shadow-xl shadow-rose-100 backdrop-blur transition-all duration-500 sm:p-6 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-600">
        <Sparkles className="h-4 w-4" />
        {d.speaker}
      </div>
      <p className={`mt-2 leading-relaxed text-stone-700 ${stage === 'door' ? 'text-base' : 'text-lg'}`}>{d.text}</p>

      {stage === 'reveal' && analysis && (
        <div className="mt-4 rounded-2xl bg-rose-50/70 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="BMI" value={String(analysis.bmi)} />
            <Stat label="Phân loại" value={analysis.bmiCategory} />
            <div className="col-span-2 sm:col-span-1 rounded-xl bg-white px-3 py-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-stone-400">Dáng người</div>
                <div className="font-semibold text-stone-700">{analysis.bodyTypeLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                title="Xem Cẩm nang Dáng người & Mẹo phối đồ chi tiết"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-500 hover:text-white cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            {analysis.suggestions.slice(0, 2).map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400">•</span> {s}
              </li>
            ))}
          </ul>

          <BodyShapeGuideModal
            isOpen={showGuideModal}
            onClose={() => setShowGuideModal(false)}
            userBodyType={analysis.bodyType}
            userMeasurements={{
              bmi: analysis.bmi,
            }}
          />
        </div>
      )}

      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-xs text-stone-400">{label}</div>
      <div className="font-semibold text-stone-700">{value}</div>
    </div>
  );
}

/* ---------- field inputs ---------- */

function FieldInput({
  stage,
  form,
  setForm,
}: {
  stage: Stage;
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  const set = (k: keyof FormState, v: string) => setForm({ ...form, [k]: v });

  if (stage === 'askName')
    return <TextInput placeholder="Tên của bạn" value={form.name} onChange={(v) => set('name', v)} autoFocus />;
  if (stage === 'askAge')
    return <TextInput placeholder="Tuổi" type="number" value={form.age} onChange={(v) => set('age', v)} autoFocus />;
  if (stage === 'askGender')
    return (
      <div className="grid grid-cols-2 gap-3">
        <ChoiceCard label="Nam" emoji="♂" selected={form.gender === 'male'} onClick={() => set('gender', 'male')} />
        <ChoiceCard label="Nữ" emoji="♀" selected={form.gender === 'female'} onClick={() => set('gender', 'female')} />
      </div>
    );
  if (stage === 'askHeight')
    return <TextInput placeholder="Chiều cao (VD: 160 hoặc 1,60)" type="decimal" value={form.height} onChange={(v) => set('height', v)} autoFocus />;
  if (stage === 'askWeight')
    return <TextInput placeholder="Cân nặng (kg, VD: 45)" type="decimal" value={form.weight} onChange={(v) => set('weight', v)} autoFocus />;
  if (stage === 'askFemaleMeasures')
    return (
      <div className="grid grid-cols-3 gap-3">
        <TextInput placeholder="Eo (cm)" type="decimal" value={form.waist} onChange={(v) => set('waist', v)} autoFocus />
        <TextInput placeholder="Hông (cm)" type="decimal" value={form.hip} onChange={(v) => set('hip', v)} />
        <TextInput placeholder="Ngực (cm)" type="decimal" value={form.bust} onChange={(v) => set('bust', v)} />
      </div>
    );
  return null;
}

function TextInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  autoFocus,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={type === 'decimal' ? 'text' : type}
      inputMode={type === 'decimal' ? 'decimal' : type === 'number' ? 'numeric' : undefined}
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-lg text-stone-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
    />
  );
}

function ChoiceCard({
  label,
  emoji,
  selected,
  onClick,
}: {
  label: string;
  emoji: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-4 text-lg font-semibold transition ${
        selected ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-stone-200 bg-white text-stone-500 hover:border-rose-300'
      }`}
    >
      <span className="text-2xl">{emoji}</span> {label}
    </button>
  );
}

/* ---------- chibi characters ---------- */

function ShopBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-b from-rose-100/70 to-amber-100/40" />
      {/* clothing racks */}
      <div className="absolute left-6 top-16 h-44 w-20 rounded-md bg-white/40 shadow-inner">
        <div className="mx-auto mt-2 h-1 w-16 rounded bg-stone-300/50" />
        <div className="mt-1 flex justify-center gap-1">
          <div className="h-12 w-6 rounded-t-full bg-rose-300/40" />
          <div className="h-10 w-6 rounded-t-full bg-sky-300/40" />
          <div className="h-14 w-6 rounded-t-full bg-amber-300/40" />
        </div>
      </div>
      <div className="absolute right-6 top-20 h-40 w-16 rounded-md bg-white/40 shadow-inner">
        <div className="mx-auto mt-2 h-1 w-12 rounded bg-stone-300/50" />
        <div className="mt-1 flex flex-col items-center gap-1">
          <div className="h-8 w-8 rounded bg-emerald-300/40" />
          <div className="h-8 w-8 rounded bg-stone-300/40" />
        </div>
      </div>
      {/* mirror */}
      <div className="absolute right-28 top-12 h-28 w-16 rounded-lg border-4 border-white/70 bg-sky-100/50 shadow-md" />
      <div className="absolute right-24 top-10 h-3 w-3 rounded-full bg-amber-200/60" />
      {/* plants */}
      <div className="absolute bottom-20 left-4 h-16 w-12">
        <div className="absolute bottom-0 h-8 w-8 rounded-md bg-amber-700/30" />
        <div className="absolute bottom-6 left-1 h-10 w-10 rounded-full bg-emerald-300/30" />
      </div>
      {/* floor */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-100/50 to-amber-200/60" />
    </div>
  );
}

function Shopkeeper({ active }: { active: boolean }) {
  return (
    <div className={`absolute left-1/2 z-10 -translate-x-[150%] transition-all duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}>
      <ChibiStaff />
    </div>
  );
}

function ChibiCustomer({ progress }: { progress: number }) {
  const x = -80 + progress * 170;
  const bob = Math.sin(progress * Math.PI * 6) * 4 * (progress < 1 ? 1 : 0);
  return (
    <div className="absolute z-10" style={{ transform: `translateX(${x}px) translateY(${bob}px)` }}>
      <ChibiGirl />
    </div>
  );
}

/* ----- Cute female customer chibi — clean round head ----- */
function ChibiGirl() {
  return (
    <svg width="130" height="185" viewBox="0 0 130 185">
      {/* legs */}
      <rect x="48" y="150" width="13" height="30" rx="5" fill="#e8a0c0" />
      <rect x="69" y="150" width="13" height="30" rx="5" fill="#e8a0c0" />
      {/* shoes */}
      <ellipse cx="54" cy="182" rx="9" ry="4" fill="#8a5a7a" />
      <ellipse cx="76" cy="182" rx="9" ry="4" fill="#8a5a7a" />
      {/* dress */}
      <path d="M42 90 Q65 84 88 90 L84 150 L46 150 Z" fill="#f48fb1" />
      <path d="M50 90 Q65 86 80 90 L78 100 L52 100 Z" fill="#ec407a" />
      <path d="M46 146 L84 146" stroke="#e91e63" strokeWidth="2" opacity="0.4" />
      {/* collar */}
      <path d="M55 89 Q65 94 75 89" fill="none" stroke="#fff" strokeWidth="2" />
      {/* arms */}
      <path d="M42 92 Q34 110 38 130" fill="none" stroke="#f48fb1" strokeWidth="10" strokeLinecap="round" />
      <path d="M88 92 Q96 110 92 130" fill="none" stroke="#f48fb1" strokeWidth="10" strokeLinecap="round" />
      {/* hands */}
      <circle cx="38" cy="132" r="5" fill="#fce0d0" />
      <circle cx="92" cy="132" r="5" fill="#fce0d0" />
      {/* hair back — one smooth cap */}
      <path d="M38 56 Q36 24 65 18 Q94 24 92 56 L92 74 Q88 78 84 74 L84 50 Q78 42 65 44 Q52 42 46 50 L46 74 Q42 78 38 74 Z" fill="#5a3a2a" />
      {/* head — perfectly round */}
      <circle cx="65" cy="56" r="30" fill="#fce0d0" />
      {/* hair front — single clean bangs arc */}
      <path d="M37 54 Q40 24 65 20 Q90 24 93 54 Q87 46 78 44 Q72 50 65 50 Q58 50 52 44 Q43 46 37 54 Z" fill="#5a3a2a" />
      {/* hair sides */}
      <path d="M38 56 Q36 68 40 78 L44 78 Q42 68 40 56 Z" fill="#5a3a2a" />
      <path d="M92 56 Q94 68 90 78 L86 78 Q88 68 90 56 Z" fill="#5a3a2a" />
      {/* hair clip */}
      <path d="M47 38 L42 34 L42 42 Z" fill="#f06292" />
      <path d="M47 38 L52 34 L52 42 Z" fill="#f06292" />
      <circle cx="47" cy="38" r="2" fill="#ec407a" />
      {/* ears */}
      <circle cx="36" cy="58" r="3.5" fill="#fce0d0" />
      <circle cx="94" cy="58" r="3.5" fill="#fce0d0" />
      {/* eyes — big round */}
      <circle cx="55" cy="58" r="4.5" fill="#fff" />
      <circle cx="75" cy="58" r="4.5" fill="#fff" />
      <circle cx="56" cy="59" r="3" fill="#3a2418" />
      <circle cx="76" cy="59" r="3" fill="#3a2418" />
      <circle cx="57" cy="57.5" r="1.2" fill="#fff" />
      <circle cx="77" cy="57.5" r="1.2" fill="#fff" />
      {/* eyebrows */}
      <path d="M50 50 Q55 48 60 50" fill="none" stroke="#5a3a2a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M70 50 Q75 48 80 50" fill="none" stroke="#5a3a2a" strokeWidth="1.4" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="48" cy="66" r="4.5" fill="#f8a8a8" opacity="0.5" />
      <circle cx="82" cy="66" r="4.5" fill="#f8a8a8" opacity="0.5" />
      {/* nose — tiny dot */}
      <circle cx="65" cy="66" r="1.2" fill="#d9a080" opacity="0.5" />
      {/* mouth — cute smile */}
      <path d="M59 73 Q65 78 71 73" fill="none" stroke="#c06050" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ----- Door scene — girl opens the shop door and steps in ----- */
function DoorScene({ progress }: { progress: number }) {
  // 0..0.3: door closed, girl stands in front
  // 0.3..0.6: door opens
  // 0.6..1.0: girl walks through
  const doorOpen = Math.max(0, Math.min(1, (progress - 0.25) / 0.35));
  const girlX = progress < 0.55 ? 0 : (progress - 0.55) / 0.45 * 30;
  const girlOpacity = progress < 0.9 ? 1 : 1 - (progress - 0.9) / 0.1;
  const bob = Math.sin(progress * Math.PI * 8) * 3 * (progress > 0.55 && progress < 1 ? 1 : 0);

  return (
    <svg width="200" height="180" viewBox="0 0 200 180">
      {/* shop wall */}
      <rect x="0" y="0" width="200" height="180" fill="rgba(0,0,0,0)" />
      {/* door frame */}
      <rect x="70" y="20" width="60" height="140" rx="3" fill="#8a6a4a" />
      <rect x="74" y="24" width="52" height="132" rx="2" fill="#a08a6a" />
      {/* shop interior glow (visible as door opens) */}
      <rect x="76" y="26" width="48" height="128" rx="2" fill="#fff5e8" opacity={doorOpen * 0.6} />
      {/* door panel (swings open) */}
      <g style={{ transformOrigin: '74px 24px', transform: `perspective(200px) rotateY(${-doorOpen * 65}deg)` }}>
        <rect x="74" y="24" width="26" height="132" rx="2" fill="#7a5a3a" stroke="#5a3a1a" strokeWidth="1" />
        <rect x="78" y="30" width="18" height="30" rx="1" fill="#9a7a5a" stroke="#5a3a1a" strokeWidth="0.5" />
        <rect x="78" y="66" width="18" height="30" rx="1" fill="#9a7a5a" stroke="#5a3a1a" strokeWidth="0.5" />
        <rect x="78" y="102" width="18" height="30" rx="1" fill="#9a7a5a" stroke="#5a3a1a" strokeWidth="0.5" />
        {/* door handle */}
        <circle cx="96" cy="90" r="2" fill="#d4a050" />
      </g>
      {/* OPEN sign */}
      <rect x="82" y="38" width="22" height="10" rx="2" fill="#f48fb1" opacity={0.8} />
      <text x="93" y="45" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold">OPEN</text>
      {/* welcome mat */}
      <rect x="72" y="156" width="56" height="6" rx="1" fill="#c48a5a" opacity={0.6} />
      {/* girl standing in front of / entering door */}
      <g style={{ transform: `translateX(${girlX}px) translateY(${bob}px)`, opacity: girlOpacity }}>
        {/* simplified girl behind door */}
        <ellipse cx="100" cy="150" rx="16" ry="4" fill="rgba(0,0,0,0.15)" />
        {/* dress */}
        <path d="M92 110 Q100 106 108 110 L106 150 L94 150 Z" fill="#f48fb1" />
        {/* head */}
        <circle cx="100" cy="92" r="16" fill="#fce0d0" />
        {/* hair */}
        <path d="M84 88 Q84 72 100 68 Q116 72 116 88 L116 96 Q112 100 108 96 L108 84 Q104 78 100 80 Q96 78 92 84 L92 96 Q88 100 84 96 Z" fill="#5a3a2a" />
        {/* bangs */}
        <path d="M86 86 Q92 74 100 74 Q108 74 114 86 L110 82 Q104 78 100 80 Q96 78 90 82 Z" fill="#5a3a2a" />
        {/* eyes */}
        <circle cx="95" cy="92" r="2" fill="#3a2418" />
        <circle cx="105" cy="92" r="2" fill="#3a2418" />
        <circle cx="95.5" cy="91" r="0.7" fill="#fff" />
        <circle cx="105.5" cy="91" r="0.7" fill="#fff" />
        {/* smile */}
        <path d="M96 98 Q100 101 104 98" fill="none" stroke="#c06050" strokeWidth="1.2" strokeLinecap="round" />
        {/* cheeks */}
        <ellipse cx="91" cy="96" rx="3" ry="2" fill="#f8a8a8" opacity={0.5} />
        <ellipse cx="109" cy="96" rx="3" ry="2" fill="#f8a8a8" opacity={0.5} />
        {/* hair clip */}
        <path d="M88 78 L84 75 L84 81 Z" fill="#f06292" />
        <path d="M88 78 L92 75 L92 81 Z" fill="#f06292" />
        <circle cx="88" cy="78" r="1.5" fill="#ec407a" />
      </g>
    </svg>
  );
}

/* ----- Shop staff chibi (stylist with apron) ----- */
function ChibiStaff() {
  return (
    <svg width="130" height="185" viewBox="0 0 130 185">
      {/* legs */}
      <rect x="48" y="150" width="13" height="30" rx="5" fill="#2a2a3a" />
      <rect x="69" y="150" width="13" height="30" rx="5" fill="#2a2a3a" />
      {/* shoes */}
      <ellipse cx="54" cy="182" rx="9" ry="4" fill="#1a1a2a" />
      <ellipse cx="76" cy="182" rx="9" ry="4" fill="#1a1a2a" />
      {/* body */}
      <path d="M44 88 Q65 82 86 88 L82 150 L48 150 Z" fill="#6c7a9c" />
      {/* apron */}
      <path d="M52 88 L78 88 L76 150 L54 150 Z" fill="#f6e6d3" />
      <path d="M56 92 L74 92" stroke="#d9c9b6" strokeWidth="1.5" />
      {/* apron strap */}
      <path d="M54 88 Q65 78 76 88" fill="none" stroke="#f6e6d3" strokeWidth="3" />
      {/* arms */}
      <path d="M44 90 Q36 110 40 130" fill="none" stroke="#6c7a9c" strokeWidth="10" strokeLinecap="round" />
      <path d="M86 90 Q94 110 90 130" fill="none" stroke="#6c7a9c" strokeWidth="10" strokeLinecap="round" />
      {/* hands */}
      <circle cx="40" cy="132" r="5" fill="#e8c0a0" />
      <circle cx="90" cy="132" r="5" fill="#e8c0a0" />
      {/* head */}
      <circle cx="65" cy="55" r="32" fill="#f0d0b0" />
      {/* hair — short bob with side part */}
      <path d="M33 52 Q30 24 65 18 Q100 24 97 52 L97 60 Q92 64 88 60 L88 44 Q80 34 65 36 Q50 34 42 44 L42 60 Q38 64 33 60 Z" fill="#3a2a4a" />
      <path d="M40 44 Q52 32 65 36 L62 50 Q50 48 42 52 Z" fill="#2a1a3a" />
      {/* ears */}
      <ellipse cx="34" cy="58" rx="3" ry="5" fill="#f0d0b0" />
      <ellipse cx="96" cy="58" rx="3" ry="5" fill="#f0d0b0" />
      {/* glasses */}
      <circle cx="54" cy="58" r="6" fill="none" stroke="#2a2a3a" strokeWidth="1.6" />
      <circle cx="76" cy="58" r="6" fill="none" stroke="#2a2a3a" strokeWidth="1.6" />
      <path d="M60 58 L70 58" stroke="#2a2a3a" strokeWidth="1.4" />
      {/* eyes behind glasses */}
      <circle cx="54" cy="58" r="2.4" fill="#2a2a3a" />
      <circle cx="76" cy="58" r="2.4" fill="#2a2a3a" />
      <circle cx="55" cy="57" r="0.8" fill="#fff" />
      <circle cx="77" cy="57" r="0.8" fill="#fff" />
      {/* eyebrows */}
      <path d="M49 48 Q54 46 59 48" fill="none" stroke="#3a2a4a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M71 48 Q76 46 81 48" fill="none" stroke="#3a2a4a" strokeWidth="1.4" strokeLinecap="round" />
      {/* cheeks */}
      <ellipse cx="48" cy="66" rx="4" ry="3" fill="#e8a0a0" opacity="0.4" />
      <ellipse cx="82" cy="66" rx="4" ry="3" fill="#e8a0a0" opacity="0.4" />
      {/* nose */}
      <path d="M65 60 L63 68 Q65 70 67 68" fill="none" stroke="#c89070" strokeWidth="1" strokeLinecap="round" />
      {/* mouth — friendly smile */}
      <path d="M59 74 Q65 78 71 74" fill="none" stroke="#9a5a45" strokeWidth="1.6" strokeLinecap="round" />
      {/* name tag */}
      <rect x="56" y="100" width="18" height="8" rx="2" fill="#fff" opacity="0.9" />
      <text x="65" y="106" textAnchor="middle" fontSize="5" fill="#6c7a9c">staff</text>
    </svg>
  );
}

/* ---------- Computer desk stage (Google Sign-In + OTP Verification + Welcome Email) ---------- */

export interface AuthCompletedMeta {
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: 'google' | 'email';
  otpVerified?: boolean;
  welcomeEmailMessage?: string;
  cloudProfile?: Profile;
  cloudOccasion?: Occasion;
}

export function ComputerDeskStage({
  form,
  analysis,
  occasion,
  saving,
  onSkip,
  onAuthed,
  compactModal = false,
}: {
  form: FormState;
  analysis: ReturnType<typeof analyzeBody> | null;
  occasion: Occasion | null;
  saving: boolean;
  onSkip: () => void;
  onAuthed: (meta?: AuthCompletedMeta) => void;
  compactModal?: boolean;
}) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authStep, setAuthStep] = useState<'credentials' | 'otp_verify' | 'google_picker'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authName, setAuthName] = useState(form.name || '');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState(form.name || '');
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState(() => loadSavedGoogleAccounts());
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [otpStatusMsg, setOtpStatusMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const triggerWelcomeEmail = async (targetEmail: string, targetName: string) => {
    const res = await sendWelcomeEmail({
      toEmail: targetEmail,
      toName: targetName || form.name || 'Bạn',
      gender: form.gender,
      heightCm: parseHeightCm(form.height) || 160,
      weightKg: parseMeasureNumber(form.weight) || 45,
      waistCm: form.gender === 'female' ? parseMeasureNumber(form.waist) || 66 : null,
      hipCm: form.gender === 'female' ? parseMeasureNumber(form.hip) || 84 : null,
      bustCm: form.gender === 'female' ? parseMeasureNumber(form.bust) || 90 : null,
      bmi: analysis?.bmi ?? null,
      bodyTypeLabel: analysis?.bodyTypeLabel,
    });
    return res.message;
  };

  function stashPendingData() {
    const pending = {
      form,
      analysis: analysis
        ? {
            bmi: analysis.bmi,
            bodyType: analysis.bodyType,
            bodyTypeLabel: analysis.bodyTypeLabel,
            bmiCategory: analysis.bmiCategory,
            bodyTypeDescription: analysis.bodyTypeDescription,
          }
        : null,
      occasion,
    };
    localStorage.setItem('pending_onboarding', JSON.stringify(pending));
  }

  async function handleGoogleAuth() {
    setError(null);
    stashPendingData();
    setLoading(true);

    try {
      // Primary: Real Google Sign-In Popup via Firebase Auth
      const fbUser = await signInWithGooglePopup();
      const finalEmail = fbUser.email || 'user@gmail.com';
      const finalName =
        fbUser.displayName || form.name.trim() || finalEmail.split('@')[0];
      const avatarUrl = fbUser.photoURL || undefined;

      saveAuthUserToStorage({
        email: finalEmail,
        name: finalName,
        avatarUrl,
        provider: 'google',
        otpVerified: true,
      });

      let existingCloud: { profile: Profile; occasion: Occasion } | null = null;
      try {
        existingCloud = await loadUserProfileFromFirestore(fbUser.uid);
      } catch {
        // Ignore if no cloud doc yet
      }

      const welcomeMsg = fbUser.email
        ? await triggerWelcomeEmail(fbUser.email, finalName)
        : undefined;

      localStorage.removeItem('pending_onboarding');
      setLoading(false);
      onAuthed({
        email: finalEmail,
        name: finalName,
        avatarUrl,
        provider: 'google',
        otpVerified: true,
        welcomeEmailMessage: welcomeMsg,
        cloudProfile: existingCloud?.profile,
        cloudOccasion: existingCloud?.occasion,
      });
      return;
    } catch (err: unknown) {
      setLoading(false);
      const errCode = (err as { code?: string })?.code || '';
      if (
        errCode === 'auth/popup-closed-by-user' ||
        errCode === 'auth/cancelled-popup-request'
      ) {
        setError(
          'Bạn đã đóng cửa sổ đăng nhập Google. Vui lòng bấm lại "Đăng nhập nhanh bằng Google" và chọn tài khoản của bạn.'
        );
        return;
      }
      // If popup was blocked by browser settings, open the fallback account chooser
      setSavedGoogleAccounts(loadSavedGoogleAccounts());
      if (!googleName && form.name) {
        setGoogleName(form.name);
      }
      setAuthStep('google_picker');
    }
  }

  async function handleCompleteGoogleAccountSignIn(selectedEmail?: string, selectedName?: string) {
    setError(null);
    const targetEmail = (selectedEmail ?? googleEmail).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ Gmail của bạn (ví dụ: tenban@gmail.com).');
      return;
    }
    const targetName =
      (selectedName ?? googleName).trim() ||
      form.name.trim() ||
      targetEmail.split('@')[0];

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=f43f5e&color=fff&bold=true`;

    setLoading(true);
    try {
      saveAuthUserToStorage({
        email: targetEmail,
        name: targetName,
        avatarUrl,
        provider: 'google',
        otpVerified: true,
      });

      const welcomeMsg = await triggerWelcomeEmail(targetEmail, targetName);
      setLoading(false);
      onAuthed({
        email: targetEmail,
        name: targetName,
        avatarUrl,
        provider: 'google',
        otpVerified: true,
        welcomeEmailMessage: welcomeMsg,
      });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Không thể hoàn tất đăng nhập Google.');
    }
  }

  // Đăng nhập: dùng thẳng Firebase Auth email + mật khẩu (cùng tài khoản với web), không cần OTP
  async function handleEmailLogin() {
    setLoading(true);
    try {
      const { user } = await signInOrSignUpWithEmail(email, password, 'login');
      const finalEmail = user.email || email.trim();
      const finalName = user.displayName || form.name.trim() || finalEmail.split('@')[0];
      saveAuthUserToStorage({ email: finalEmail, name: finalName, provider: 'email', otpVerified: true });

      let existingCloud: { profile: Profile; occasion: Occasion } | null = null;
      try {
        existingCloud = await loadUserProfileFromFirestore(user.uid);
      } catch {
        // chưa có hồ sơ trên mây hoặc email chưa xác thực
      }
      setLoading(false);
      onAuthed({
        email: finalEmail,
        name: finalName,
        provider: 'email',
        otpVerified: true,
        cloudProfile: existingCloud?.profile,
        cloudOccasion: existingCloud?.occasion,
      });
    } catch (err) {
      setLoading(false);
      setError(emailAuthErrorMessage(err));
    }
  }

  // Step 1: Validate credentials & send 6-digit OTP (chỉ khi đăng ký)
  async function handleRequestOtp() {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ để nhận mã xác thực OTP.');
      return;
    }
    // Firebase Auth yêu cầu mật khẩu tối thiểu 6 ký tự
    if (!password.trim() || password.length < 6) {
      setError('Vui lòng nhập mật khẩu (tối thiểu 6 ký tự).');
      return;
    }
    if (authMode === 'login') {
      await handleEmailLogin();
      return;
    }
    if (authMode === 'signup' && !(authName.trim() || form.name.trim())) {
      setError('Vui lòng nhập tên của bạn.');
      return;
    }

    setLoading(true);
    try {
      const code = generateOtpCode();
      setGeneratedOtp(code);
      const targetName = authName.trim() || form.name.trim() || email.split('@')[0];
      const otpRes = await sendOtpVerificationEmail({
        toEmail: email.trim(),
        toName: targetName,
        otpCode: code,
      });

      setOtpStatusMsg(otpRes.message);
      setDemoOtpHint(otpRes.demoOtpCode || null);
      setResendCooldown(60);
      setAuthStep('otp_verify');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Lỗi gửi mã xác thực OTP.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const code = generateOtpCode();
      setGeneratedOtp(code);
      const targetName = authName.trim() || form.name.trim() || email.split('@')[0];
      const otpRes = await sendOtpVerificationEmail({
        toEmail: email.trim(),
        toName: targetName,
        otpCode: code,
      });
      setOtpStatusMsg(otpRes.message);
      setDemoOtpHint(otpRes.demoOtpCode || null);
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lại mã OTP.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify 6-digit OTP -> Complete Auth -> Send Welcome Email
  async function handleVerifyOtpAndComplete() {
    setError(null);
    const cleanedOtp = otpInput.trim();
    if (!cleanedOtp || cleanedOtp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số của mã OTP.');
      return;
    }
    if (generatedOtp && cleanedOtp !== generatedOtp) {
      setError('Mã OTP không chính xác. Vui lòng kiểm tra lại email của bạn.');
      return;
    }

    setLoading(true);
    const targetName = authName.trim() || form.name.trim() || email.split('@')[0];

    try {
      // Tạo tài khoản Firebase Auth thật (cùng tài khoản với web) và gửi thư xác thực email.
      // Chỉ sau khi xác thực email, hồ sơ và tủ đồ mới đồng bộ lên mây (firestore.rules).
      await signInOrSignUpWithEmail(email, password, 'signup', targetName);
    } catch (err) {
      setLoading(false);
      setError(emailAuthErrorMessage(err));
      return;
    }

    try {
      saveAuthUserToStorage({
        email: email.trim(),
        name: targetName,
        provider: 'email',
        otpVerified: true,
      });

      const welcomeMsg = await triggerWelcomeEmail(email.trim(), targetName);

      setLoading(false);
      onAuthed({
        email: email.trim(),
        name: targetName,
        provider: 'email',
        otpVerified: true,
        welcomeEmailMessage: welcomeMsg
          ? `${welcomeMsg} Hãy mở thư xác thực của Firebase để đồng bộ với web.`
          : 'Đã tạo tài khoản. Hãy mở thư xác thực của Firebase để đồng bộ với web.',
      });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Lỗi xác thực tài khoản.');
    }
  }

  return (
    <div className={compactModal ? 'w-full' : 'mt-6 w-full max-w-2xl'}>
      {/* Computer desk illustration */}
      {!compactModal && (
        <div className="mb-4 flex items-end justify-center">
          <ComputerDesk />
        </div>
      )}

      {/* Auth popup */}
      <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl shadow-rose-100 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-600">
            <Monitor className="h-4 w-4" />
            <span>
              {authStep === 'otp_verify'
                ? 'Xác thực Mã OTP & Nhận Mail Chào Mừng'
                : authStep === 'google_picker'
                ? 'Đăng nhập bằng tài khoản Google'
                : 'Đăng nhập / Đăng ký Tài khoản'}
            </span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            Bảo mật & Tự động lưu
          </span>
        </div>

        {authStep === 'google_picker' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <GoogleIcon />
                <div>
                  <h4 className="text-sm font-bold text-stone-800">
                    Chọn hoặc nhập tài khoản Google
                  </h4>
                  <p className="text-xs text-stone-500">
                    Tài khoản của bạn sẽ được lưu tự động cho các lần truy cập sau
                  </p>
                </div>
              </div>

              {savedGoogleAccounts.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Tài khoản đã đăng nhập trước đây
                  </p>
                  {savedGoogleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading || saving}
                      onClick={() => handleCompleteGoogleAccountSignIn(acc.email, acc.name)}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left transition hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                          {(acc.name || acc.email)[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-stone-800">
                            {acc.name}
                          </div>
                          <div className="truncate text-xs text-stone-500">
                            {acc.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-rose-600 shrink-0 ml-2">
                        Tiếp tục →
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-2.5">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Tên hiển thị Google của bạn"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    placeholder="Nhập địa chỉ Gmail (VD: tenban@gmail.com)"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCompleteGoogleAccountSignIn();
                      }
                    }}
                    autoFocus
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => handleCompleteGoogleAccountSignIn()}
              disabled={loading || saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>Tiếp tục với Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthStep('credentials');
                setError(null);
              }}
              className="w-full text-center text-xs font-medium text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              ← Quay lại các phương thức đăng nhập khác
            </button>
          </div>
        ) : authStep === 'credentials' ? (
          <>
            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || saving}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-stone-200 bg-white px-4 py-3 font-semibold text-stone-700 transition hover:border-rose-300 hover:bg-rose-50/30 disabled:opacity-50 cursor-pointer"
            >
              <GoogleIcon />
              <span>Đăng nhập nhanh bằng Google</span>
            </button>

            {/* Divider */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-400">
                hoặc đăng nhập bằng Email &amp; mã OTP
              </span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            {/* Email/password form */}
            <div className="space-y-3">
              {authMode === 'signup' && (
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Tên của bạn"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-stone-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  placeholder="Địa chỉ Email nhận mã xác thực OTP"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-stone-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-stone-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                <span>
                  {authMode === 'signup'
                    ? 'Tạo tài khoản & Nhận mã OTP'
                    : 'Đăng nhập'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                  setError(null);
                }}
                className="w-full text-center text-sm text-stone-500 hover:text-rose-500 cursor-pointer"
              >
                {authMode === 'signup'
                  ? 'Đã có tài khoản? Đăng nhập'
                  : 'Chưa có tài khoản? Đăng ký ngay'}
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: OTP VERIFICATION VIEW */
          <div className="space-y-4">
            <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
                <ShieldCheck className="h-5 w-5 text-rose-600 shrink-0" />
                <span>Kiểm tra hộp thư của bạn: {email}</span>
              </div>
              {otpStatusMsg && (
                <p className="text-xs text-stone-600 leading-relaxed">
                  {otpStatusMsg}
                </p>
              )}
              {demoOtpHint && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 border border-amber-300 shadow-xs">
                  <span className="text-xs font-medium text-stone-600">
                    Mã xác thực OTP 6 số của bạn:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-extrabold tracking-widest text-rose-600">
                      {demoOtpHint}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpInput(demoOtpHint)}
                      className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 cursor-pointer"
                    >
                      Điền nhanh
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-600">
                Nhập mã xác thực OTP (6 chữ số)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Nhập 6 số OTP (VD: 123456)"
                value={otpInput}
                onChange={(e) =>
                  setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                autoFocus
                className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-stone-800 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleVerifyOtpAndComplete}
              disabled={loading || saving || otpInput.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>Xác nhận OTP &amp; Hoàn tất</span>
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthStep('credentials');
                  setError(null);
                }}
                className="font-medium text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                ← Đổi địa chỉ Email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 disabled:text-stone-400 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>
                  {resendCooldown > 0
                    ? `Gửi lại mã sau ${resendCooldown}s`
                    : 'Gửi lại mã OTP'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Skip option */}
        <div className="mt-4 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="w-full text-center text-sm text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            Bỏ qua đăng nhập — dùng mà không cần tài khoản
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function ComputerDesk() {
  return (
    <svg width="240" height="140" viewBox="0 0 240 140">
      {/* desk surface */}
      <rect x="20" y="100" width="200" height="8" rx="3" fill="#c4a070" />
      <rect x="20" y="108" width="200" height="4" rx="2" fill="#a08050" />
      {/* desk legs */}
      <rect x="30" y="108" width="6" height="28" rx="2" fill="#8a6a40" />
      <rect x="204" y="108" width="6" height="28" rx="2" fill="#8a6a40" />
      {/* monitor stand */}
      <rect x="112" y="92" width="16" height="8" rx="2" fill="#6a6a7a" />
      <rect x="100" y="98" width="40" height="4" rx="2" fill="#5a5a6a" />
      {/* monitor body */}
      <rect x="70" y="20" width="100" height="74" rx="6" fill="#2a2a3a" />
      <rect x="74" y="24" width="92" height="66" rx="3" fill="#1a1a2a" />
      {/* screen — login form mockup */}
      <rect x="80" y="30" width="80" height="54" rx="3" fill="#3a3a5a" />
      {/* title bar */}
      <rect x="80" y="30" width="80" height="10" rx="3" fill="#4a4a6a" />
      <circle cx="86" cy="35" r="1.5" fill="#f06292" />
      <circle cx="91" cy="35" r="1.5" fill="#ffd54a" />
      <circle cx="96" cy="35" r="1.5" fill="#66bb6a" />
      {/* Google button mockup */}
      <rect x="86" y="46" width="68" height="8" rx="3" fill="#fff" opacity="0.85" />
      <circle cx="91" cy="50" r="2" fill="#4285F4" />
      <rect x="96" y="49" width="30" height="2" rx="1" fill="#4285F4" />
      {/* divider */}
      <rect x="86" y="58" width="68" height="1" fill="#5a5a7a" />
      {/* input fields mockup */}
      <rect x="86" y="62" width="68" height="5" rx="2" fill="#4a4a6a" />
      <rect x="86" y="69" width="68" height="5" rx="2" fill="#4a4a6a" />
      {/* submit button mockup */}
      <rect x="86" y="77" width="68" height="5" rx="2" fill="#f06292" />
      {/* keyboard */}
      <rect x="80" y="112" width="80" height="12" rx="2" fill="#3a3a4a" />
      <rect x="84" y="114" width="72" height="2" rx="1" fill="#5a5a6a" />
      <rect x="84" y="118" width="72" height="2" rx="1" fill="#5a5a6a" />
      {/* chair back */}
      <rect x="100" y="115" width="40" height="20" rx="4" fill="#6c7a9c" opacity="0.5" />
    </svg>
  );
}
