import { useState, useEffect } from 'react';
import OnboardingScene, { parseHeightCm, parseMeasureNumber } from '@/components/OnboardingScene';
import Wardrobe from '@/components/Wardrobe';
import type { Occasion } from '@/lib/occasions';
import type { Profile } from '@/lib/supabase';
import {
  loadProfileFromStorage,
  saveProfileToStorage,
  loadOccasionFromStorage,
  saveOccasionToStorage,
  loadAuthUserFromStorage,
  saveAuthUserToStorage,
} from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/emailjs';
import {
  auth,
  onAuthStateChanged,
  loadUserProfileFromFirestore,
  saveUserProfileToFirestore,
} from '@/lib/firebase';

function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfileFromStorage());
  const [lastProfile, setLastProfile] = useState<Profile | null>(() => loadProfileFromStorage());
  const [occasion, setOccasion] = useState<Occasion>(() => {
    const saved = loadOccasionFromStorage() as Occasion | null;
    return saved || 'casual';
  });
  const [restoring, setRestoring] = useState(false);

  const handleUpdateProfile = (nextProfile: Profile | null) => {
    setProfile(nextProfile);
    if (nextProfile) {
      setLastProfile(nextProfile);
      saveProfileToStorage(nextProfile);
      if (auth.currentUser) {
        saveUserProfileToFirestore(auth.currentUser.uid, nextProfile, occasion).catch(() => {});
      }
    }
  };

  const handleUpdateOccasion = (nextOccasion: Occasion) => {
    setOccasion(nextOccasion);
    saveOccasionToStorage(nextOccasion);
    if (auth.currentUser && profile) {
      saveUserProfileToFirestore(auth.currentUser.uid, profile, nextOccasion).catch(() => {});
    }
  };

  // Restore Firebase Google Auth session & cloud profile on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      const userEmail = fbUser.email || '';
      const userName = fbUser.displayName || userEmail.split('@')[0] || 'Người dùng';
      const avatarUrl = fbUser.photoURL || undefined;

      if (userEmail) {
        saveAuthUserToStorage({
          email: userEmail,
          name: userName,
          avatarUrl,
          provider: 'google',
          otpVerified: true,
        });
      }

      // Check if there is stashed pending_onboarding data from before Google Sign-In
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
            const finalProfile: Profile = {
              id: fbUser.uid,
              user_id: fbUser.uid,
              name: pending.form.name.trim() || userName,
              age: parseMeasureNumber(pending.form.age) || 25,
              gender: pending.form.gender,
              height_cm: heightCm,
              weight_kg: weightKg,
              waist_cm: pending.form.gender === 'female' ? parseMeasureNumber(pending.form.waist) || null : null,
              hip_cm: pending.form.gender === 'female' ? parseMeasureNumber(pending.form.hip) || null : null,
              bust_cm: pending.form.gender === 'female' ? parseMeasureNumber(pending.form.bust) || null : null,
              bmi: pending.analysis?.bmi ?? null,
              body_type: pending.analysis?.bodyType ?? null,
              email: userEmail || undefined,
              avatar_url: avatarUrl,
              auth_provider: 'google',
              otp_verified: true,
              created_at: new Date().toISOString(),
            };

            localStorage.removeItem('pending_onboarding');
            await saveUserProfileToFirestore(fbUser.uid, finalProfile, finalOccasion).catch(() => {});

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

            setProfile(finalProfile);
            setLastProfile(finalProfile);
            setOccasion(finalOccasion);
            saveProfileToStorage(finalProfile);
            saveOccasionToStorage(finalOccasion);
            setRestoring(false);
            return;
          }
          localStorage.removeItem('pending_onboarding');
        } catch {
          localStorage.removeItem('pending_onboarding');
        }
        setRestoring(false);
      }

      // Sync with Firestore profile
      try {
        const cloudData = await loadUserProfileFromFirestore(fbUser.uid);
        const localProf = loadProfileFromStorage();

        if (cloudData) {
          // If there is no local profile, or local profile is just a Guest ('Khách'), restore cloud profile
          if (!localProf || localProf.name === 'Khách' || localProf.user_id === fbUser.uid) {
            const mergedProfile: Profile = {
              ...cloudData.profile,
              email: cloudData.profile.email || userEmail || undefined,
              avatar_url: cloudData.profile.avatar_url || avatarUrl,
              auth_provider: 'google',
              otp_verified: true,
            };
            setProfile(mergedProfile);
            setLastProfile(mergedProfile);
            setOccasion(cloudData.occasion);
            saveProfileToStorage(mergedProfile);
            saveOccasionToStorage(cloudData.occasion);
            return;
          }
        }

        // If user has a measured local profile that isn't saved to their Firebase account yet, sync it up
        if (localProf) {
          const enriched: Profile = {
            ...localProf,
            id: fbUser.uid,
            user_id: fbUser.uid,
            name: localProf.name === 'Khách' ? userName : localProf.name,
            email: userEmail || localProf.email,
            avatar_url: avatarUrl || localProf.avatar_url,
            auth_provider: 'google',
            otp_verified: true,
          };
          setProfile(enriched);
          setLastProfile(enriched);
          saveProfileToStorage(enriched);
          const currentOcc = loadOccasionFromStorage() || 'casual';
          await saveUserProfileToFirestore(fbUser.uid, enriched, currentOcc).catch(() => {});
        }
      } catch {
        // Ignore if user hasn't created a Firestore profile yet
      }
    });
    return () => unsubscribe();
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
          handleUpdateProfile(guestProfile);
          handleUpdateOccasion('casual');
        }}
      />
    );
  }

  return (
    <Wardrobe
      profile={profile}
      occasion={occasion}
      onChangeOccasion={handleUpdateOccasion}
      onReset={() => setProfile(null)}
      onUpdateProfile={handleUpdateProfile}
    />
  );
}

export default App;
