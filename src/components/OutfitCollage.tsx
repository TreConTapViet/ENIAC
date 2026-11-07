import React from 'react';
import type { AuraOutfitRecommendation } from '../types';

type OutfitImages = Pick<AuraOutfitRecommendation, 'imageUrl' | 'title' | 'topImageUrl' | 'bottomImageUrl' | 'outerImageUrl'>;

/**
 * Ảnh của một bộ đồ: ảnh cả bộ nếu có; nếu không (bộ đồ nam, bộ do AI ghép) thì ghép ảnh các món
 * thành lưới 1–3 ô trên nền khung ảnh sáng (đọc rõ ở cả chế độ sáng lẫn tối).
 */
export function OutfitImage({ outfit, className = '' }: { outfit: OutfitImages; className?: string }) {
  if (outfit.imageUrl) {
    return (
      <img
        src={outfit.imageUrl}
        alt={outfit.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`h-full w-full object-contain p-2 ${className}`}
      />
    );
  }
  const images = [outfit.outerImageUrl, outfit.topImageUrl, outfit.bottomImageUrl].filter(
    (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i
  );
  return <OutfitCollage images={images} alt={outfit.title} className={className} />;
}

export function OutfitCollage({ images, alt, className = '' }: { images: string[]; alt: string; className?: string }) {
  if (images.length === 0) {
    return <div role="img" aria-label={alt} className={`h-full w-full bg-photo-well ${className}`} />;
  }
  const cell = 'h-full w-full min-h-0 object-contain bg-white p-1.5';
  return (
    <div
      role="img"
      aria-label={alt}
      className={`grid h-full w-full gap-1 bg-photo-well p-1 ${
        images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
      } ${className}`}
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className={`${cell} rounded-[6px] ${images.length === 3 && i === 0 ? 'row-span-2' : ''}`}
        />
      ))}
    </div>
  );
}
