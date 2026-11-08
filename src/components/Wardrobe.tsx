import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  X,
  Mail,
  ShieldCheck,
  LogIn,
  LogOut,
  Send,
  Shirt,
  Loader2,
  HelpCircle,
  UserPen,
  Camera,
  Smartphone,
} from 'lucide-react';
import type { Profile } from '@/lib/supabase';
import { clearAuthUserStorage } from '@/lib/supabase';
import { analyzeBody } from '@/lib/bodyAnalysis';
import { OCCASIONS, occasionInfo, type Occasion } from '@/lib/occasions';
import {
  getPresetsForOccasion,
  generateAiOutfitsForOccasion,
  type OccasionOutfitPreset,
} from '@/lib/occasionOutfits';
import { sendWelcomeEmail } from '@/lib/emailjs';
import { ComputerDeskStage, type AuthCompletedMeta } from './OnboardingScene';
import MannequinStudio from './MannequinStudio';
import BodyShapeGuideModal from './BodyShapeGuideModal';
import ProfileEditModal from './ProfileEditModal';
import ShareAppModal from './ShareAppModal';
import PwaInstallToast from './PwaInstallToast';

interface Props {
  profile: Profile;
  occasion: Occasion;
  onChangeOccasion?: (occasion: Occasion) => void;
  onReset: () => void;
  onUpdateProfile: (profile: Profile) => void;
}

export default function Wardrobe({
  profile,
  occasion,
  onChangeOccasion,
  onReset,
  onUpdateProfile,
}: Props) {
  const [showOccasionPicker, setShowOccasionPicker] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showBodyShapeGuide, setShowBodyShapeGuide] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentOccasion, setCurrentOccasion] = useState<Occasion>(occasion);
  const [welcomeStatus, setWelcomeStatus] = useState<string | null>(null);
  const [sendingWelcome, setSendingWelcome] = useState(false);

  // AI-generated outfits for the current occasion
  const [aiOccasionOutfits, setAiOccasionOutfits] = useState<OccasionOutfitPreset[]>([]);
  const [isGeneratingAiOutfits, setIsGeneratingAiOutfits] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<{
    preset: OccasionOutfitPreset;
    trigger: number;
  } | null>(null);
  const [showTopAiRecommendations, setShowTopAiRecommendations] =
    useState(true);

  useEffect(() => {
    setCurrentOccasion(occasion);
  }, [occasion]);

  const handleSelectOccasion = (nextOcc: Occasion) => {
    setCurrentOccasion(nextOcc);
    onChangeOccasion?.(nextOcc);
  };

  const analysis = useMemo(
    () =>
      analyzeBody({
        gender: profile.gender,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        waist_cm: profile.waist_cm,
        hip_cm: profile.hip_cm,
        bust_cm: profile.bust_cm,
      }),
    [profile]
  );

  const occInfo = occasionInfo(currentOccasion);

  // Combine AI outfits (if generated for this occasion) + curated presets for this occasion
  const displayedOccasionOutfits = useMemo(() => {
    const aiForOcc = aiOccasionOutfits.filter(
      (o) => o.occasion === currentOccasion && o.gender === profile.gender
    );
    const basePresets = getPresetsForOccasion(currentOccasion, profile.gender);
    return [...aiForOcc, ...basePresets];
  }, [aiOccasionOutfits, currentOccasion, profile.gender]);

  async function handleGenerateAiOutfits() {
    if (isGeneratingAiOutfits) return;
    setIsGeneratingAiOutfits(true);
    try {
      const generated = await generateAiOutfitsForOccasion({
        occasion: currentOccasion,
        gender: profile.gender,
        heightCm: profile.height_cm,
        weightKg: profile.weight_kg,
        waistCm: profile.waist_cm,
        hipCm: profile.hip_cm,
        bustCm: profile.bust_cm,
        bodyShapeName: analysis.bodyTypeLabel,
      });
      setAiOccasionOutfits((prev) => [
        ...generated,
        ...prev.filter((p) => p.occasion !== currentOccasion),
      ]);
      if (generated.length > 0) {
        setAppliedPreset({ preset: generated[0], trigger: Date.now() });
      }
    } finally {
      setIsGeneratingAiOutfits(false);
    }
  }

  async function handleSendWelcomeMail() {
    if (!profile.email || sendingWelcome) return;
    setSendingWelcome(true);
    setWelcomeStatus(null);
    const res = await sendWelcomeEmail({
      toEmail: profile.email,
      toName: profile.name,
      gender: profile.gender,
      heightCm: profile.height_cm,
      weightKg: profile.weight_kg,
      waistCm: profile.waist_cm,
      hipCm: profile.hip_cm,
      bustCm: profile.bust_cm,
      bmi: analysis.bmi,
      bodyTypeLabel: analysis.bodyTypeLabel,
    });
    setSendingWelcome(false);
    setWelcomeStatus(res.message);
    setTimeout(() => setWelcomeStatus(null), 6000);
  }

  function handleAuthSuccess(meta?: AuthCompletedMeta) {
    if (meta) {
      if (meta.cloudProfile && profile.name === 'Khách') {
        onUpdateProfile({
          ...meta.cloudProfile,
          email: meta.email || meta.cloudProfile.email,
          avatar_url: meta.avatarUrl || meta.cloudProfile.avatar_url,
          auth_provider: meta.provider || 'google',
          otp_verified: true,
        });
        if (meta.cloudOccasion) {
          handleSelectOccasion(meta.cloudOccasion);
        }
      } else {
        onUpdateProfile({
          ...profile,
          name:
            profile.name === 'Khách' && meta.name
              ? meta.name
              : profile.name,
          email: meta.email,
          avatar_url: meta.avatarUrl,
          auth_provider: meta.provider,
          otp_verified: meta.otpVerified ?? true,
        });
      }
      if (meta.welcomeEmailMessage) {
        setWelcomeStatus(meta.welcomeEmailMessage);
        setTimeout(() => setWelcomeStatus(null), 6000);
      }
    }
    setShowAuthModal(false);
  }

  function handleLogout() {
    clearAuthUserStorage();
    import('@/lib/firebase').then(({ signOutFirebase }) => signOutFirebase()).catch(() => {});
    onUpdateProfile({
      ...profile,
      email: undefined,
      avatar_url: undefined,
      auth_provider: undefined,
      otp_verified: undefined,
    });
  }

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-b from-stone-50 via-rose-50/40 to-amber-50/40">
      <Header
        profile={profile}
        analysis={analysis}
        occasion={currentOccasion}
        onReset={onReset}
        onPickOccasion={() => setShowOccasionPicker(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenEditProfile={() => setShowProfileEditModal(true)}
        onOpenShareApp={() => setShowShareModal(true)}
        onLogout={handleLogout}
        onSendWelcome={handleSendWelcomeMail}
        sendingWelcome={sendingWelcome}
        onOpenBodyShapeGuide={() => setShowBodyShapeGuide(true)}
      />

      <main className="mx-auto w-full max-w-[1920px] px-2 sm:px-4 pb-6 pt-3">
        {welcomeStatus && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{welcomeStatus}</span>
            </div>
            <button
              onClick={() => setWelcomeStatus(null)}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile & Viewport Interaction Guidance Note */}
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/85 px-4 py-3 text-xs sm:text-sm text-amber-900 shadow-sm backdrop-blur-sm">
          <span className="text-base shrink-0 leading-none mt-0.5">💡</span>
          <p className="leading-relaxed">
            <strong className="font-semibold text-amber-950">Lưu ý tiện ích:</strong> Nếu bạn dùng điện thoại, vui lòng sử dụng thanh công cụ nhớ kéo ngang để dùng được toàn bộ thanh công cụ. Ngoài ra khi dùng tính năng so sánh trang phục, vui lòng thu nhỏ nhân vật để dễ thấy toàn diện.
          </p>
        </div>

        {/* AI & Occasion Outfit Recommendations */}
        <section className="mb-5 rounded-3xl border border-rose-100 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-rose-600">
              <Sparkles className="h-5 w-5 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">
                Gợi ý trang phục AI cho dáng &ldquo;{analysis.bodyTypeLabel}&rdquo; — {occInfo.emoji} {occInfo.label}
              </h2>
              <button
                type="button"
                onClick={() => setShowBodyShapeGuide(true)}
                title="Mở Cẩm nang Dáng người (Body Shape Guide)"
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-500 hover:text-white cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Cẩm nang dáng người</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateAiOutfits}
                disabled={isGeneratingAiOutfits}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:from-rose-600 hover:to-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                {isGeneratingAiOutfits ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {isGeneratingAiOutfits
                    ? `AI đang thiết kế đồ ${occInfo.label}...`
                    : `✨ AI Gợi ý trang phục ${occInfo.label}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowOccasionPicker(true)}
                className="rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-100 cursor-pointer"
              >
                Đổi hoàn cảnh
              </button>

              <button
                type="button"
                onClick={() => setShowTopAiRecommendations((prev) => !prev)}
                title={
                  showTopAiRecommendations
                    ? 'Đóng / Thu gọn tab gợi ý trang phục (-)'
                    : 'Mở tab gợi ý trang phục (+)'
                }
                aria-label="Đóng mở tab gợi ý trang phục"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-base font-mono font-bold text-rose-700 hover:bg-rose-500 hover:text-white transition cursor-pointer shrink-0"
              >
                {showTopAiRecommendations ? '-' : '+'}
              </button>
            </div>
          </div>

          {showTopAiRecommendations && (
          <>
          {/* Quick Occasion Switcher Chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-stone-400 mr-1 shrink-0">
              Hoàn cảnh:
            </span>
            {OCCASIONS.map((o) => {
              const active = currentOccasion === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelectOccasion(o.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition shrink-0 cursor-pointer ${
                    active
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  <span>{o.emoji}</span>
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-xs sm:text-sm text-stone-500">{occInfo.description}</p>

          {/* Body shape styling tips */}
          <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
            {analysis.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-xl bg-rose-50/60 px-3.5 py-2.5 text-xs sm:text-sm text-stone-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>

          {/* Occasion-specific 3D Outfits Ready to Try On */}
          <div className="mt-4 pt-4 border-t border-rose-100">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-800">
                <Shirt className="h-4 w-4 text-rose-500" />
                <span>
                  Bộ trang phục 3D phù hợp khi {occInfo.emoji} {occInfo.label} (Nhấn để mặc thử lên Ma-nơ-canh):
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayedOccasionOutfits.map((preset) => {
                const isSelected = appliedPreset?.preset.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`flex flex-col justify-between rounded-2xl border p-3.5 transition ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/60 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-rose-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            preset.isAiGenerated
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {preset.tag}
                        </span>
                        <div className="flex items-center gap-1">
                          {preset.swatchColors.map((hex, i) => (
                            <span
                              key={i}
                              className="h-3.5 w-3.5 rounded-full border border-stone-300"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <h4 className="mt-1.5 text-sm font-bold text-stone-800">
                        {preset.name}
                      </h4>
                      <p className="mt-1 text-xs text-stone-500 line-clamp-2">
                        {preset.reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAppliedPreset({ preset, trigger: Date.now() })
                      }
                      className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-stone-900 text-white hover:bg-rose-500'
                      }`}
                    >
                      <Shirt className="h-3.5 w-3.5" />
                      <span>
                        {isSelected
                          ? 'Đang mặc trên Ma-nơ-canh 3D'
                          : 'Mặc thử lên Ma-nơ-canh 3D'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          </>
          )}
        </section>

        {/* 3D mannequin studio */}
        <section>
          <MannequinStudio
            profile={profile}
            occasion={currentOccasion}
            onChangeOccasion={handleSelectOccasion}
            externalPreset={appliedPreset}
            aiOccasionOutfits={displayedOccasionOutfits}
            onRequestAiOccasionOutfits={handleGenerateAiOutfits}
            isGeneratingAiOutfits={isGeneratingAiOutfits}
          />
        </section>
      </main>

      {showOccasionPicker && (
        <OccasionModal
          current={currentOccasion}
          onPick={(o) => {
            handleSelectOccasion(o);
            setShowOccasionPicker(false);
          }}
          onClose={() => setShowOccasionPicker(false)}
        />
      )}

      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowAuthModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <ComputerDeskStage
              form={{
                name: profile.name === 'Khách' ? '' : profile.name,
                age: String(profile.age),
                gender: profile.gender,
                height: String(profile.height_cm),
                weight: String(profile.weight_kg),
                waist: profile.waist_cm ? String(profile.waist_cm) : '',
                hip: profile.hip_cm ? String(profile.hip_cm) : '',
                bust: profile.bust_cm ? String(profile.bust_cm) : '',
              }}
              analysis={analysis}
              occasion={currentOccasion}
              saving={false}
              compactModal
              onAuthed={handleAuthSuccess}
              onSkip={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      )}
      <ProfileEditModal
        profile={profile}
        isOpen={showProfileEditModal}
        onClose={() => setShowProfileEditModal(false)}
        onSave={(updated) => onUpdateProfile(updated)}
      />
      <BodyShapeGuideModal
        isOpen={showBodyShapeGuide}
        onClose={() => setShowBodyShapeGuide(false)}
        userBodyType={analysis.bodyType}
        userGender={profile.gender}
        userMeasurements={{
          heightCm: profile.height_cm,
          weightKg: profile.weight_kg,
          waistCm: profile.waist_cm,
          hipCm: profile.hip_cm,
          bustCm: profile.bust_cm,
          bmi: analysis.bmi,
        }}
      />
      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      {!profile.email && !profile.auth_provider && (
        <PwaInstallToast onOpenGuide={() => setShowShareModal(true)} />
      )}
    </div>
  );
}

/* ---------- header ---------- */

function Header({
  profile,
  analysis,
  occasion,
  onReset,
  onPickOccasion,
  onOpenAuth,
  onOpenEditProfile,
  onOpenShareApp,
  onLogout,
  onSendWelcome,
  sendingWelcome,
  onOpenBodyShapeGuide,
}: {
  profile: Profile;
  analysis: ReturnType<typeof analyzeBody>;
  occasion: Occasion;
  onReset: () => void;
  onPickOccasion: () => void;
  onOpenAuth: () => void;
  onOpenEditProfile: () => void;
  onOpenShareApp?: () => void;
  onLogout: () => void;
  onSendWelcome: () => void;
  sendingWelcome: boolean;
  onOpenBodyShapeGuide: () => void;
}) {
  const occ = occasionInfo(occasion);
  return (
    <header className="border-b border-rose-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenEditProfile}
            title="Nhấn để đổi ảnh đại diện hoặc chỉnh sửa hồ sơ"
            className="group relative h-11 w-11 shrink-0 rounded-full cursor-pointer"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="h-11 w-11 rounded-full border-2 border-rose-300 object-cover transition group-hover:border-rose-500"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white transition group-hover:bg-rose-600">
                {(profile.name || 'K')[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white bg-stone-800 text-white shadow-xs">
              <Camera className="h-2.5 w-2.5" />
            </span>
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400 sm:text-sm">
              <span>Xin chào,</span>
              {profile.email && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  {profile.auth_provider === 'google' ? 'Tài khoản Google' : 'Đã xác thực'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-stone-800 sm:text-lg">
                {profile.name}
              </span>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50/80 px-2 py-0.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500 hover:text-white cursor-pointer"
              >
                <UserPen className="h-3 w-3" />
                <span>Sửa hồ sơ</span>
              </button>
            </div>
            {profile.email && (
              <div className="text-xs text-stone-500">{profile.email}</div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600 sm:gap-2 sm:text-sm">
          <Pill label="Giới tính" value={profile.gender === 'female' ? 'Nữ' : 'Nam'} />
          <Pill label="Số đo" value={`${profile.height_cm}cm · ${profile.weight_kg}kg`} />
          {profile.gender === 'female' && profile.bust_cm && profile.waist_cm && profile.hip_cm && (
            <Pill label="3 Vòng" value={`${profile.bust_cm}-${profile.waist_cm}-${profile.hip_cm}cm`} />
          )}
          <Pill label="BMI" value={String(analysis.bmi)} />
          <div className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5">
            <span className="text-xs text-rose-400">Dáng: </span>
            <span className="font-semibold text-stone-700">{analysis.bodyTypeLabel}</span>
            <button
              type="button"
              onClick={onOpenBodyShapeGuide}
              title="Xem Cẩm nang Dáng người & Mẹo phối đồ"
              className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-500 hover:text-white cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={onPickOccasion}
            className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs hover:bg-rose-100 sm:px-3 cursor-pointer"
          >
            <span className="text-rose-400">Hoàn cảnh: </span>
            <span className="font-semibold text-stone-700">
              {occ.emoji} {occ.label}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenShareApp && (
            <button
              type="button"
              onClick={onOpenShareApp}
              title="Tải ứng dụng về điện thoại hoặc chia sẻ link cho bạn bè"
              className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-600 cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>📱 Tải App / Chia sẻ</span>
            </button>
          )}
          {profile.email ? (
            <>
              <button
                onClick={onSendWelcome}
                disabled={sendingWelcome}
                title="Gửi lại email chào mừng"
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingWelcome ? 'Đang gửi...' : 'Mail chào mừng'}
              </button>
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Đổi TK
              </button>
              <button
                onClick={onLogout}
                title="Đăng xuất tài khoản"
                className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-rose-600 hover:to-amber-600 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Đăng nhập
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />&nbsp;Đo lại
          </button>
        </div>
      </div>
    </header>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-rose-50 px-2.5 py-1.5">
      <span className="text-xs text-rose-400">{label}: </span>
      <span className="font-semibold text-stone-700">{value}</span>
    </div>
  );
}

/* ---------- occasion modal ---------- */

function OccasionModal({
  current,
  onPick,
  onClose,
}: {
  current: Occasion;
  onPick: (o: Occasion) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800">Chọn hoàn cảnh phối đồ</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {OCCASIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => onPick(o.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-4 text-sm font-semibold transition cursor-pointer ${
                current === o.value
                  ? 'border-rose-500 bg-rose-50 text-rose-600'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-rose-300'
              }`}
            >
              <span className="text-3xl">{o.emoji}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
