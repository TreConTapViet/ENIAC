import { useEffect, useMemo, useState } from 'react';
import MannequinStudioApp, { type StudioSavedOutfit } from '../MannequinStudioApp';
import type { AuraOutfitRecommendation, UserProfile, WardrobeItem, WeatherContextData } from '../types';
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
import type { GenderProfile } from '../types/studio';

interface GarmentsFor {
  gender: GenderProfile;
  garments: ExtractedGarmentItem[];
}
const EMPTY: ExtractedGarmentItem[] = [];

interface StudioSectionProps {
  profile: UserProfile;
  wardrobeItems: WardrobeItem[];
  /** Bộ đồ được chọn "Ướm thử" ở Tủ đồ hoặc Gợi ý phối đồ */
  tryOnOutfit: AuraOutfitRecommendation | null;
  onSaveOutfit: (saved: StudioSavedOutfit) => void;
  weather?: WeatherContextData;
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
  weather,
}: StudioSectionProps) {
  const gender = toStudioGender(profile.gender);
  const initialBody = useMemo(() => profileToStudioBody(profile), [profile]);

  // Lưu kèm giới tính đã dùng để dựng đồ: chỉ đưa vào studio khi khớp giới tính hiện tại,
  // tránh studio mới (sau khi đổi giới tính) nhận đồ dựng cho giới tính cũ
  const [wardrobeState, setWardrobeGarments] = useState<GarmentsFor>({ gender, garments: [] });
  const [tryOnState, setTryOnGarments] = useState<GarmentsFor>({ gender, garments: [] });
  const wardrobeGarments = wardrobeState.gender === gender ? wardrobeState.garments : EMPTY;
  const tryOnGarments = tryOnState.gender === gender ? tryOnState.garments : EMPTY;

  // Tủ đồ → kho đồ của studio. Xử lý ảnh chạy trên trình duyệt nên chỉ lấy các món mới nhất.
  useEffect(() => {
    let cancelled = false;
    const sources = wardrobeItems
      .map(wardrobeItemToSource)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .slice(0, STUDIO_INVENTORY_LIMIT);
    sourcesToStudioGarments(sources, gender).then((garments) => {
      if (!cancelled) setWardrobeGarments({ gender, garments });
    });
    return () => {
      cancelled = true;
    };
  }, [wardrobeItems, gender]);

  useEffect(() => {
    let cancelled = false;
    if (!tryOnOutfit) {
      setTryOnGarments({ gender, garments: [] });
      return;
    }
    sourcesToStudioGarments(recommendationToSources(tryOnOutfit, wardrobeItems), gender).then(
      (garments) => {
        if (!cancelled) setTryOnGarments({ gender, garments });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [tryOnOutfit, wardrobeItems, gender]);

  return (
    <div className="studio-embed relative h-[calc(100dvh-9rem)] min-h-[560px] w-full overflow-hidden rounded-3xl border border-line shadow-sm">
      <MannequinStudioApp
        // Đổi giới tính: dựng lại studio từ đầu. Studio chỉ gộp thêm đồ vào kho và giữ đồ đang mặc,
        // nên nếu không dựng lại thì đồ nữ cũ còn trên ma-nơ-canh nam (và ngược lại).
        key={gender}
        embedded
        weatherContext={weather}
        initialBody={initialBody}
        wardrobeGarments={wardrobeGarments}
        tryOnGarments={tryOnGarments}
        onSaveOutfit={onSaveOutfit}
      />
    </div>
  );
}
