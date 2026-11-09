import { useState, useEffect } from 'react';
import OnboardingScene, { parseHeightCm, parseMeasureNumber } from '@/components/OnboardingScene';
import Wardrobe from '@/components/Wardrobe';
import { SIGNED_OUT_SYNC, type SyncInfo } from '@/components/SyncStatusBar';
import type { Occasion } from '@/lib/occasions';
import type { Profile } from '@/lib/profileStore';
import {
  loadProfileFromStorage,
  saveProfileToStorage,
  loadOccasionFromStorage,
  saveOccasionToStorage,
  loadAuthUserFromStorage,
  saveAuthUserToStorage,
} from '@/lib/profileStore';
import { sendWelcomeEmail } from '@/lib/emailjs';
import {
  auth,
  onIdTokenChanged,
  saveUserProfileToFirestore,
  subscribeUserProfile,
  type FirebaseUser,
} from '@/lib/firebase';

const providerOf = (u: FirebaseUser): 'google' | 'email' =>
  u.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email';

function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfileFromStorage());
  const [lastProfile, setLastProfile] = useState<Profile | null>(() => loadProfileFromStorage());
  const [occasion, setOccasion] = useState<Occasion>(() => {
    const saved = loadOccasionFromStorage() as Occasion | null;
    return saved || 'casual';
  });
  const [restoring, setRestoring] = useState(false);
  const [sync, setSync] = useState<SyncInfo>(SIGNED_OUT_SYNC);

  /** Lưu trên máy, rồi đẩy phần đồng bộ lên users/{uid} nếu được (xem lib/firebase.ts) */
  const handleUpdateProfile = (nextProfile: Profile | null) => {
    setProfile(nextProfile);
    if (!nextProfile) return;
    setLastProfile(nextProfile);
    saveProfileToStorage(nextProfile);
    const user = auth.currentUser;
    if (user) {
      saveUserProfileToFirestore(user.uid, nextProfile)
        .then((result) => {
          if (result === 'missing-web-profile') {
            setSync((s) => (s.uid === user.uid ? { ...s, status: 'missing-web-profile' } : s));
          }
        })
        .catch(() => setSync((s) => (s.uid === user.uid ? { ...s, status: 'error' } : s)));
    }
  };

  // Dịp (hoàn cảnh) chỉ lưu trên máy: hồ sơ web không có trường này
  const handleUpdateOccasion = (nextOccasion: Occasion) => {
    setOccasion(nextOccasion);
    saveOccasionToStorage(nextOccasion);
  };

  // Phiên đăng nhập dùng chung với web. onIdTokenChanged (không phải onAuthStateChanged) để biết cả
  // lúc email vừa được xác thực, giống useUserSession của web.
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const stop = onIdTokenChanged(auth, async (fbUser) => {
      unsubProfile?.();
      unsubProfile = null;

      if (!fbUser) {
        setSync(SIGNED_OUT_SYNC);
        return;
      }
      if (fbUser.isAnonymous) {
        // Khách của web: không có email nên không đồng bộ được (firestore.rules)
        setSync({ ...SIGNED_OUT_SYNC, status: 'guest', uid: fbUser.uid });
        return;
      }

      const userEmail = fbUser.email || '';
      const userName = fbUser.displayName || userEmail.split('@')[0] || 'Người dùng';
      const avatarUrl = fbUser.photoURL || undefined;
      const provider = providerOf(fbUser);
      if (userEmail) {
        saveAuthUserToStorage({ email: userEmail, name: userName, avatarUrl, provider, otpVerified: true });
      }

      // Số đo nhập trước khi đăng nhập Google (OnboardingScene cất vào pending_onboarding)
      const stashed = localStorage.getItem('pending_onboarding');
      if (stashed) {
        setRestoring(true);
        try {
          const pending = JSON.parse(stashed) as {
            form: {
              name: string;
              age: string;
              gender: 'male' | 'female';
              height: string;
              weight: string;
              waist: string;
              hip: string;
              bust: string;
            };
            analysis: { bmi: number; bodyType: string; bodyTypeLabel?: string } | null;
            occasion: Occasion | null;
          };
          const heightCm = parseHeightCm(pending.form.height);
          const weightKg = parseMeasureNumber(pending.form.weight);
          if (heightCm >= 80 && weightKg >= 20) {
            const finalOccasion: Occasion = pending.occasion || loadOccasionFromStorage() || 'casual';
            const isFemale = pending.form.gender === 'female';
            const finalProfile: Profile = {
              id: fbUser.uid,
              user_id: fbUser.uid,
              name: pending.form.name.trim() || userName,
              age: parseMeasureNumber(pending.form.age) || 25,
              gender: pending.form.gender,
              height_cm: heightCm,
              weight_kg: weightKg,
              waist_cm: isFemale ? parseMeasureNumber(pending.form.waist) || null : null,
              hip_cm: isFemale ? parseMeasureNumber(pending.form.hip) || null : null,
              bust_cm: isFemale ? parseMeasureNumber(pending.form.bust) || null : null,
              bmi: pending.analysis?.bmi ?? null,
              body_type: pending.analysis?.bodyType ?? null,
              email: userEmail || undefined,
              avatar_url: avatarUrl,
              auth_provider: provider,
              otp_verified: true,
              created_at: new Date().toISOString(),
            };
            localStorage.removeItem('pending_onboarding');
            if (userEmail) {
              sendWelcomeEmail({
                toEmail: userEmail,
                toName: finalProfile.name,
                gender: finalProfile.gender,
                heightCm: finalProfile.height_cm,
                weightKg: finalProfile.weight_kg,
                waistCm: finalProfile.waist_cm,
                hipCm: finalProfile.hip_cm,
                bustCm: finalProfile.bust_cm,
                bmi: finalProfile.bmi,
                bodyTypeLabel: pending.analysis?.bodyTypeLabel ?? finalProfile.body_type ?? undefined,
              }).catch(() => {});
            }
            handleUpdateProfile(finalProfile);
            handleUpdateOccasion(finalOccasion);
          } else {
            localStorage.removeItem('pending_onboarding');
          }
        } catch {
          localStorage.removeItem('pending_onboarding');
        }
        setRestoring(false);
      }

      if (!fbUser.emailVerified) {
        setSync({ status: 'unverified', uid: fbUser.uid, email: userEmail || null, favoriteStyles: undefined });
        return;
      }

      // Đã xác thực: hồ sơ trên web là nguồn chính, app nhận thay đổi theo thời gian thực
      setSync({ status: 'synced', uid: fbUser.uid, email: userEmail || null, favoriteStyles: undefined });
      unsubProfile = subscribeUserProfile(
        fbUser.uid,
        (cloud) => {
          if (!cloud) {
            setSync((s) => ({ ...s, status: 'missing-web-profile' }));
            return;
          }
          const merged: Profile = {
            ...cloud.profile,
            email: cloud.profile.email || userEmail || undefined,
            avatar_url: cloud.profile.avatar_url || avatarUrl,
            auth_provider: provider,
            otp_verified: true,
          };
          setProfile(merged);
          setLastProfile(merged);
          saveProfileToStorage(merged);
          setSync((s) => ({ ...s, status: 'synced', favoriteStyles: cloud.favoriteStyles }));
        },
        () => setSync((s) => ({ ...s, status: 'error' }))
      );
    });

    return () => {
      stop();
      unsubProfile?.();
    };
  }, []);

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 via-amber-50 to-sky-50">
        <div className="text-center">
          <div className="mb-3 h-10 w-10 mx-auto animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
          <p className="text-stone-600">Đang khôi phục thông tin của bạn...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <OnboardingScene
        initialProfile={lastProfile}
        initialOccasion={occasion}
        onComplete={(p, occ) => {
          handleUpdateProfile(p);
          handleUpdateOccasion(occ);
        }}
        onSkip={() => {
          const savedAuth = loadAuthUserFromStorage();
          const guestProfile: Profile = {
            id: crypto.randomUUID(),
            name: savedAuth?.name || 'Khách',
            age: 25,
            gender: 'female',
            height_cm: 160,
            weight_kg: 45,
            waist_cm: 66,
            hip_cm: 84,
            bust_cm: 90,
            bmi: 17.6,
            body_type: 'hourglass',
            email: savedAuth?.email,
            avatar_url: savedAuth?.avatarUrl,
            auth_provider: savedAuth?.provider,
            otp_verified: savedAuth?.otpVerified,
            created_at: new Date().toISOString(),
          };
          // Khách bỏ qua: chỉ lưu trên máy, không ghi đè hồ sơ web
          setProfile(guestProfile);
          setLastProfile(guestProfile);
          saveProfileToStorage(guestProfile);
          handleUpdateOccasion('casual');
        }}
      />
    );
  }

  return (
    <Wardrobe
      profile={profile}
      occasion={occasion}
      sync={sync}
      onChangeOccasion={handleUpdateOccasion}
      onReset={() => setProfile(null)}
      onUpdateProfile={handleUpdateProfile}
    />
  );
}

export default App;
