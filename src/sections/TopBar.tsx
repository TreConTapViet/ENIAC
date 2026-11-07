
import {
  resolveUserAvatar,
} from '../constants';
import { ProvinceSelect } from '../components/ProvinceSelect';
import { styleLabel } from '../../shared/styles';
import {
  UserProfile,
  WeatherContextData,
} from '../types';

import {
  Ruler,
} from 'lucide-react';

import type { AccentTheme, SizeCalculation, Setter } from './types';

// Tách nguyên văn từ App.tsx (Giai đoạn 2, không đổi hành vi)
export interface TopBarProps {
  accent: AccentTheme;
  isLightMode: boolean;
  profile: UserProfile;
  selectedWeather: WeatherContextData;
  provinceId: string;
  weatherLoading: boolean;
  onSelectProvince: (provinceId: string) => void;
  setShowProfileDrawer: Setter<boolean>;
  sizeCalculation: SizeCalculation;
}

export function TopBar({
  accent,
  isLightMode,
  profile,
  selectedWeather,
  provinceId,
  weatherLoading,
  onSelectProvince,
  setShowProfileDrawer,
  sizeCalculation,
}: TopBarProps) {
  return (
    <>
        {/* TOP HEADER: User Avatar, Body Metrics Tag (162cm, 50kg), Local Weather Widget & AI Stylist Aura Badge */}
        <header
          className={`h-16 sm:h-20 px-6 lg:px-8 border-b flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors ${
            isLightMode
              ? 'bg-white/95 border-stone-200'
              : 'bg-[#121118]/90 border-white/10'
          } backdrop-blur-md`}
        >
          {/* Zone 1: User Greeting & Body Metrics Tag (e.g. 162cm, 50kg, Size S) */}
          <div className="truncate">
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-white truncate">
                {profile.displayName}
              </h1>
              <button
                type="button"
                onClick={() => setShowProfileDrawer(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono tabular-nums font-semibold border transition-colors cursor-pointer ${
                  isLightMode
                    ? 'bg-stone-900 text-white border-stone-800 hover:bg-stone-800'
                    : `${accent.softBgClass} ${accent.textClass} border-white/10 hover:brightness-110`
                }`}
                title="Cập nhật số đo"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>
                  {sizeCalculation.heightCm}cm, {sizeCalculation.weightKg}kg · Size{' '}
                  {sizeCalculation.shortSize}
                </span>
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
              Phong cách:{' '}
              {(profile.favoriteStyles || []).map((s) => styleLabel(s, 'short')).join(' · ')}
            </p>
          </div>

          {/* Zone 2: Local Weather Widget, AI Stylist Aura Badge & User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <ProvinceSelect
              provinceId={provinceId}
              weather={selectedWeather}
              loading={weatherLoading}
              onSelect={onSelectProvince}
            />

            <button
              type="button"
              onClick={() => setShowProfileDrawer(true)}
              title="Thông tin cá nhân"
              aria-label="Mở Thông tin cá nhân"
              className="w-10 h-10 rounded-full overflow-hidden shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#121118] ring-stone-300 dark:ring-white/20 hover:scale-105 transition-transform cursor-pointer shrink-0"
            >
              <img
                src={resolveUserAvatar(profile.gender, profile.avatarUrl)}
                alt={profile.displayName || 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>
    </>
  );
}
