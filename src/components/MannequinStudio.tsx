import { useState } from 'react';
import { Maximize2, Minimize2, Info } from 'lucide-react';
import type { Profile } from '@/lib/supabase';
import type { Occasion } from '@/lib/occasions';
import { occasionInfo } from '@/lib/occasions';
import type { OccasionOutfitPreset } from '@/lib/occasionOutfits';
import Mannequin3DApp from './mannequin3d/App';

interface Props {
  profile: Profile;
  occasion: Occasion;
  onChangeOccasion?: (occasion: Occasion) => void;
  externalPreset?: {
    preset: OccasionOutfitPreset;
    trigger: number;
  } | null;
  aiOccasionOutfits?: OccasionOutfitPreset[];
  onRequestAiOccasionOutfits?: () => void;
  isGeneratingAiOutfits?: boolean;
}

export default function MannequinStudio({
  profile,
  occasion,
  onChangeOccasion,
  externalPreset,
  aiOccasionOutfits,
  onRequestAiOccasionOutfits,
  isGeneratingAiOutfits,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  const genderLabel = profile.gender === 'female' ? 'Nữ' : 'Nam';
  const occ = occasionInfo(occasion);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col w-screen h-[100dvh] bg-[#FAF9F6] overflow-hidden'
          : 'flex flex-col w-full h-[calc(100dvh-16px)] min-h-[560px] sm:h-[calc(100dvh-24px)] rounded-2xl sm:rounded-3xl border border-stone-200 bg-[#FAF9F6] shadow-sm overflow-hidden'
      }
    >
      {/* Header bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 sm:px-4 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white">
            <span className="text-xs sm:text-sm font-bold">3D</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-stone-800 truncate">
                Studio Ma-nơ-canh 3D
              </h3>
              <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-rose-700 shrink-0">
                {occ.emoji} {occ.label}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 truncate">
              Ma-nơ-canh {genderLabel} · Cao {profile.height_cm}cm · Nặng {profile.weight_kg}kg
              {profile.gender === 'female' && profile.bust_cm && profile.waist_cm && profile.hip_cm
                ? ` · Ngực ${profile.bust_cm}cm / Eo ${profile.waist_cm}cm / Hông ${profile.hip_cm}cm`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 cursor-pointer"
          >
            {fullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" /> Thu nhỏ
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" /> Toàn màn hình
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info banner — gender & measurements auto-applied */}
      <div className="shrink-0 hidden sm:flex items-center gap-2 bg-rose-50/70 px-4 py-1 text-xs text-stone-600 border-b border-rose-100">
        <Info className="h-3.5 w-3.5 shrink-0 text-rose-400" />
        <span className="truncate">
          Ma-nơ-canh <strong className="text-rose-600">{genderLabel}</strong> đã đồng bộ số đo của bạn ({profile.height_cm}cm · {profile.weight_kg}kg
          {profile.gender === 'female' && profile.bust_cm && profile.waist_cm && profile.hip_cm
            ? ` · Ngực ${profile.bust_cm}cm · Eo ${profile.waist_cm}cm · Hông ${profile.hip_cm}cm`
            : ''}
          ) và hiển thị sẵn các bộ trang phục phù hợp khi <strong className="text-rose-600">{occ.emoji} {occ.label}</strong>.
        </span>
      </div>

      {/* 3D Studio container — flex-1 min-h-0 guarantees zero white cut-off across all screen sizes */}
      <div className="relative flex-1 min-h-0 w-full bg-[#FAF9F6] overflow-hidden">
        <Mannequin3DApp
          key={`${profile.gender}-${profile.height_cm}-${profile.weight_kg}-${profile.waist_cm ?? ''}-${profile.hip_cm ?? ''}-${profile.bust_cm ?? ''}`}
          initialGender={profile.gender}
          initialHeightCm={profile.height_cm}
          initialWeightKg={profile.weight_kg}
          initialWaistCm={profile.waist_cm}
          initialHipCm={profile.hip_cm}
          initialBustCm={profile.bust_cm}
          initialOccasion={occasion}
          onChangeOccasion={onChangeOccasion}
          externalPreset={externalPreset}
          aiOccasionOutfits={aiOccasionOutfits}
          onRequestAiOccasionOutfits={onRequestAiOccasionOutfits}
          isGeneratingAiOutfits={isGeneratingAiOutfits}
        />
      </div>
    </div>
  );
}
