import { useEffect, useMemo, useState } from 'react';
import MannequinStudioApp, { type StudioSavedOutfit } from '../MannequinStudioApp';
import type { AuraOutfitRecommendation, UserProfile, WardrobeItem } from '../types';
import type { ExtractedGarmentItem } from '../types/studio';
import {
  STUDIO_INVENTORY_LIMIT,
  profileToStudioBody,
  recommendationToSources,
  sourcesToStudioGarments,
  toStudioGender,
  wardrobeItemToSource,
} from './wardrobeBridge';
import './studio.css';

interface StudioSectionProps {
  profile: UserProfile;
  wardrobeItems: WardrobeItem[];
  /** Bộ đồ được chọn "Ướm thử" ở Tủ đồ hoặc Gợi ý phối đồ */
  tryOnOutfit: AuraOutfitRecommendation | null;
  onSaveOutfit: (saved: StudioSavedOutfit) => void;
}

/**
 * Ma-nơ-canh 3D của app: nhúng Studio vào vùng nội dung (sau khi đã đăng nhập).
 * App.tsx tải lười file này, nên three.js của studio và mô hình GLB chỉ tải khi mở mục Ma-nơ-canh.
 */
export default function StudioSection({
  profile,
  wardrobeItems,
  tryOnOutfit,
  onSaveOutfit,
}: StudioSectionProps) {
  const gender = toStudioGender(profile.gender);
  const initialBody = useMemo(() => profileToStudioBody(profile), [profile]);

  const [wardrobeGarments, setWardrobeGarments] = useState<ExtractedGarmentItem[]>([]);
  const [tryOnGarments, setTryOnGarments] = useState<ExtractedGarmentItem[]>([]);

  // Tủ đồ → kho đồ của studio. Xử lý ảnh chạy trên trình duyệt nên chỉ lấy các món mới nhất.
  useEffect(() => {
    let cancelled = false;
    const sources = wardrobeItems
      .map(wardrobeItemToSource)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .slice(0, STUDIO_INVENTORY_LIMIT);
    sourcesToStudioGarments(sources, gender).then((garments) => {
      if (!cancelled) setWardrobeGarments(garments);
    });
    return () => {
      cancelled = true;
    };
  }, [wardrobeItems, gender]);

  useEffect(() => {
    let cancelled = false;
    if (!tryOnOutfit) {
      setTryOnGarments([]);
      return;
    }
    sourcesToStudioGarments(recommendationToSources(tryOnOutfit, wardrobeItems), gender).then(
      (garments) => {
        if (!cancelled) setTryOnGarments(garments);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [tryOnOutfit, wardrobeItems, gender]);

  return (
    <div className="studio-embed relative h-[calc(100dvh-9rem)] min-h-[560px] w-full overflow-hidden rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm">
      <MannequinStudioApp
        embedded
        initialBody={initialBody}
        wardrobeGarments={wardrobeGarments}
        tryOnGarments={tryOnGarments}
        onSaveOutfit={onSaveOutfit}
      />
    </div>
  );
}
