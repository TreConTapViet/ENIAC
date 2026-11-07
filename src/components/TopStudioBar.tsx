import React from 'react';
import {
  Box,
  Camera,
  Columns2,
  Download,
  History,
  Shuffle,
  Video,
} from 'lucide-react';
import { ActiveDockTab } from '../types/studio';

interface TopStudioBarProps {
  activeTab: ActiveDockTab;
  onSelectTab: (tab: ActiveDockTab) => void;
  showMeasurementTape: boolean;
  onToggleMeasurementTape: () => void;
  isSplitCompareMode?: boolean;
  onToggleSplitCompareMode?: () => void;
  isArMode?: boolean;
  onToggleArMode?: () => void;
  onResetAll: () => void;
  onTriggerVideoWalkthrough?: () => void;
  onTriggerExportGlb?: () => void;
  onTriggerExportUsdz?: () => void;
  outfitHistoryCount?: number;
  onToggleHistoryModal?: () => void;
  onRandomShuffleOutfit?: () => void;
}

export const TopStudioBar: React.FC<TopStudioBarProps> = ({
  activeTab,
  onSelectTab,
  showMeasurementTape,
  onToggleMeasurementTape,
  isSplitCompareMode = false,
  onToggleSplitCompareMode,
  isArMode = false,
  onToggleArMode,
  onResetAll,
  onTriggerVideoWalkthrough,
  onTriggerExportGlb,
  onTriggerExportUsdz,
  outfitHistoryCount = 0,
  onToggleHistoryModal,
  onRandomShuffleOutfit,
}) => {
  return (
    <header className="flex items-center justify-between gap-3 md:gap-5 px-4 md:px-6 py-2.5 bg-white border-b border-slate-200 z-20 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#studio"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('body');
        }}
        className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
      >
        Smart Wardrobe
      </a>

      {/* Zone 2: Concise single-line text navigation links */}
      <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-slate-600">
        <button
          type="button"
          onClick={() => onSelectTab('body')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
            activeTab === 'body'
              ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Số đo Hình thể
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('wardrobe')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
            activeTab === 'wardrobe'
              ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Tủ đồ &amp; Phối màu AI
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('accessories')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
            activeTab === 'accessories'
              ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Phụ kiện 3D
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('pose')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
            activeTab === 'pose'
              ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Tư thế &amp; Cử động
        </button>
        <button
          type="button"
          onClick={onToggleMeasurementTape}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
            showMeasurementTape
              ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Thước đo 3D
        </button>
      </nav>

      {/* Zone 3: Random Shuffle + History Drawer + Video 360 + 3D Export (.GLB/.USDZ) + Split-Screen + AR Mode + Reset */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
        {onRandomShuffleOutfit && (
          <button
            type="button"
            onClick={onRandomShuffleOutfit}
            title="Phối ngẫu nhiên trang phục từ kho đồ có sẵn và các món đồ bạn đã upload"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-2xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 shrink-0" />
            <span>Phối Ngẫu Nhiên</span>
          </button>
        )}

        {onToggleHistoryModal && (
          <button
            type="button"
            onClick={onToggleHistoryModal}
            title="Xem lại các bộ trang phục đã phối và xoá bớt những bộ không thích"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50/90 text-indigo-900 hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Lịch sử đã phối</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-600 text-white">
              {outfitHistoryCount}
            </span>
          </button>
        )}

        {onTriggerVideoWalkthrough && (
          <button
            type="button"
            onClick={onTriggerVideoWalkthrough}
            title="Quay Video Walkthrough 360° xoay quanh mannequin với tư thế hiện tại"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span>Video 360°</span>
          </button>
        )}

        {(onTriggerExportGlb || onTriggerExportUsdz) && (
          <div className="flex items-center rounded-lg border border-emerald-300 bg-emerald-50/90 p-0.5">
            <span className="hidden md:flex items-center gap-1 px-1.5 text-[11px] font-semibold text-emerald-950">
              <Box className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Xuất 3D AR:</span>
            </span>
            {onTriggerExportGlb && (
              <button
                type="button"
                onClick={onTriggerExportGlb}
                title="Xuất model 3D hiện tại ra tệp .GLB để xem AR trên Android / WebXR / Blender"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-white hover:bg-emerald-600 text-emerald-900 hover:text-white border border-emerald-200 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>.GLB</span>
              </button>
            )}
            {onTriggerExportUsdz && (
              <button
                type="button"
                onClick={onTriggerExportUsdz}
                title="Xuất model 3D hiện tại ra tệp .USDZ để mở AR Quick Look trên iPhone / iPad"
                className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-white hover:bg-teal-600 text-teal-900 hover:text-white border border-teal-200 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>.USDZ</span>
              </button>
            )}
          </div>
        )}

        {onToggleSplitCompareMode && (
          <button
            type="button"
            onClick={onToggleSplitCompareMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSplitCompareMode
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">
              {isSplitCompareMode ? 'Thoát So Sánh (A|B)' : 'So Sánh (A|B)'}
            </span>
          </button>
        )}

        {onToggleArMode && (
          <button
            type="button"
            onClick={onToggleArMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isArMode
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="inline md:hidden">
              {isArMode ? 'Thoát AR' : 'AR Camera'}
            </span>
            <span className="hidden md:inline">
              {isArMode ? 'Thoát AR Camera' : 'Thực tế ảo (AR)'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetAll}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Đặt lại
        </button>
      </div>
    </header>
  );
};

