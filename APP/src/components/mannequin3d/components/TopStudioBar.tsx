import React, { useState } from 'react';
import {
  Box,
  Camera,
  ChevronRight,
  ChevronLeft,
  Columns2,
  Download,
  History,
  Move3d,
  RotateCcw,
  Ruler,
  Share2,
  Shirt,
  ShoppingBag,
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
  onTriggerSocialShare?: () => void;
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
  onTriggerSocialShare,
  onTriggerExportGlb,
  onTriggerExportUsdz,
  outfitHistoryCount = 0,
  onToggleHistoryModal,
  onRandomShuffleOutfit,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <header className="flex items-center justify-between gap-2 md:gap-4 px-3 md:px-5 py-2 bg-white border-b border-slate-200 z-20 shrink-0 min-w-0 w-full overflow-hidden">
      {/* Title + Toggle Button */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('body');
          }}
          className="text-sm md:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap font-display"
        >
          Smart Wardrobe
        </a>

        {/* Toggle Button for Collapsible Feature Bar */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          title={isExpanded ? 'Thu gọn thanh tính năng' : 'Mở rộng toàn bộ tính năng'}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs border ${
            isExpanded
              ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
              : 'bg-gradient-to-r from-rose-500 to-amber-500 border-rose-500 text-white hover:opacity-95'
          }`}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Thu gọn</span>
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>&gt; kéo thêm tính năng</span>
            </>
          )}
        </button>
      </div>

      {/* Collapsible Horizontal Scrollable Feature Bar */}
      {isExpanded ? (
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin py-0.5 px-1 min-w-0 flex-1 animate-fadeIn">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('body')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'body'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Ruler className="w-3 h-3" />
              <span>Số đo</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('wardrobe')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'wardrobe'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Shirt className="w-3 h-3" />
              <span>Tủ đồ AI</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('accessories')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'accessories'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Phụ kiện 3D</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('pose')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'pose'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Move3d className="w-3 h-3" />
              <span>Tư thế</span>
            </button>
            <button
              type="button"
              onClick={onToggleMeasurementTape}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                showMeasurementTape
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Thước 3D</span>
            </button>
          </div>

          {/* Action Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onTriggerSocialShare && (
              <button
                type="button"
                onClick={onTriggerSocialShare}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-2xs transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>Chia sẻ 2D</span>
              </button>
            )}

            {onRandomShuffleOutfit && (
              <button
                type="button"
                onClick={onRandomShuffleOutfit}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 shrink-0" />
                <span>Phối ngẫu nhiên</span>
              </button>
            )}

            {onToggleHistoryModal && (
              <button
                type="button"
                onClick={onToggleHistoryModal}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Lịch sử ({outfitHistoryCount})</span>
              </button>
            )}

            {onTriggerVideoWalkthrough && (
              <button
                type="button"
                onClick={onTriggerVideoWalkthrough}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 shrink-0" />
                <span>Video 360°</span>
              </button>
            )}

            {(onTriggerExportGlb || onTriggerExportUsdz) && (
              <div className="flex items-center rounded-lg border border-emerald-300 bg-emerald-50 p-0.5 shrink-0">
                <span className="flex items-center gap-1 px-1.5 text-[11px] font-semibold text-emerald-950">
                  <Box className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>3D:</span>
                </span>
                {onTriggerExportGlb && (
                  <button
                    type="button"
                    onClick={onTriggerExportGlb}
                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-emerald-900 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition cursor-pointer"
                  >
                    .GLB
                  </button>
                )}
                {onTriggerExportUsdz && (
                  <button
                    type="button"
                    onClick={onTriggerExportUsdz}
                    className="ml-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-teal-900 hover:bg-teal-600 hover:text-white border border-teal-200 transition cursor-pointer"
                  >
                    .USDZ
                  </button>
                )}
              </div>
            )}

            {onToggleSplitCompareMode && (
              <button
                type="button"
                onClick={onToggleSplitCompareMode}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isSplitCompareMode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isSplitCompareMode ? 'Thoát So sánh' : 'So sánh A|B'}</span>
              </button>
            )}

            {onToggleArMode && (
              <button
                type="button"
                onClick={onToggleArMode}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isArMode
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>{isArMode ? 'Thoát AR' : 'AR Camera'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onResetAll}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      ) : (
        /* Compact Default View: Only show essential quick buttons */
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          {onRandomShuffleOutfit && (
            <button
              type="button"
              onClick={onRandomShuffleOutfit}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition whitespace-nowrap cursor-pointer"
            >
              <Shuffle className="w-3 h-3" />
              <span>Phối ngẫu nhiên</span>
            </button>
          )}
          <button
            type="button"
            onClick={onResetAll}
            className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition whitespace-nowrap cursor-pointer"
          >
            Đặt lại
          </button>
        </div>
      )}
    </header>
  );
};


