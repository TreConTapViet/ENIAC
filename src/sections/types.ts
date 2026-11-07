import type React from 'react';
import type { ACCENT_COLORS, calculateRecommendedSize } from '../constants';
import type { AccentColorKey, GarmentCategory, OccasionType, WeatherSeason } from '../types';

export type ActiveSection = 'discover' | 'mannequin' | 'wardrobe' | 'history';

export type AccentTheme = (typeof ACCENT_COLORS)[AccentColorKey];

export type SizeCalculation = ReturnType<typeof calculateRecommendedSize>;

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export interface NavItem {
  id: ActiveSection;
  label: string;
  icon: React.ElementType;
  count?: number;
}

export interface SaveOutfitInput {
  title: string;
  occasion: string;
  weatherNote: string;
  items: string[];
  auraAdvice: string;
  imageUrl?: string;
  styleTag?: string;
}

export interface AddGarmentInput {
  name: string;
  category: GarmentCategory;
  styleTag: string;
  color: string;
  season: WeatherSeason;
  occasion: OccasionType;
  imageUrl: string;
  favorite: boolean;
}

export type ThemeState = ReturnType<typeof import('../hooks/useThemePrefs').useThemePrefs>;
