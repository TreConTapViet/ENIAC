
import { motion } from 'motion/react';
import {
  OCCASION_TYPES,
} from '../constants';
import {
  SavedOutfit,
} from '../types';

import {
  Trash2,
  Search,
  Check,
  UserCheck,
  History,
} from 'lucide-react';

import type { ActiveSection, AccentTheme, Setter } from './types';

// Tách nguyên văn từ App.tsx (Giai đoạn 2, không đổi hành vi)
export interface HistorySectionProps {
  accent: AccentTheme;
  activeSection: ActiveSection;
  handleDeleteSavedOutfit: (id: string) => Promise<void>;
  historyOccasionFilter: string;
  historySearchQuery: string;
  historySortBy: 'newest' | 'oldest' | 'occasion';
  isLightMode: boolean;
  savedOutfits: SavedOutfit[];
  setActiveSection: Setter<ActiveSection>;
  setHistoryOccasionFilter: Setter<string>;
  setHistorySearchQuery: Setter<string>;
  setHistorySortBy: Setter<'newest' | 'oldest' | 'occasion'>;
  sortedAndFilteredHistory: SavedOutfit[];
}

export function HistorySection({
  accent,
  activeSection,
  handleDeleteSavedOutfit,
  historyOccasionFilter,
  historySearchQuery,
  historySortBy,
  isLightMode,
  savedOutfits,
  setActiveSection,
  setHistoryOccasionFilter,
  setHistorySearchQuery,
  setHistorySortBy,
  sortedAndFilteredHistory,
}: HistorySectionProps) {
  return (
    <>
            {/* TAB 4: OUTFIT HISTORY & SAVED COLLECTION */}
            {activeSection === 'history' && (
              <motion.section
                key="section-history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      Lịch Sử Phối Đồ ({sortedAndFilteredHistory.length}/{savedOutfits.length})
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Các bộ đồ bạn đã lưu từ Gợi ý phối đồ và Ma-nơ-canh 3D
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('mannequin')}
                    className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 ${accent.bgClass}`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Phối trên ma-nơ-canh</span>
                  </button>
                </div>

                {/* Sorting & Occasion Filtering Toolbar */}
                {savedOutfits.length > 0 && (
                  <div
                    className={`rounded-2xl border p-4 space-y-3.5 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                          Sắp xếp theo:
                        </span>
                        {[
                          { id: 'newest', label: 'Thời gian gần nhất' },
                          { id: 'occasion', label: 'Theo dịp sử dụng' },
                          { id: 'oldest', label: 'Thời gian cũ nhất' },
                        ].map((opt) => {
                          const active = historySortBy === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setHistorySortBy(opt.id as 'newest' | 'oldest' | 'occasion')
                              }
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                active
                                  ? `${accent.bgClass} text-white shadow-xs`
                                  : `${accent.softBgClass} ${accent.textClass} hover:opacity-90`
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative min-w-[220px]">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          placeholder="Tìm tên outfit, món đồ, dịp..."
                          className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                            isLightMode
                              ? 'bg-stone-50 border-stone-200 text-stone-900'
                              : 'bg-stone-950 border-stone-800 text-stone-100'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">
                        Lọc theo dịp:
                      </span>
                      {['Tất cả', ...OCCASION_TYPES].map((occ) => {
                        const active = historyOccasionFilter === occ;
                        return (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => setHistoryOccasionFilter(occ)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? `${accent.bgClass} text-white`
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                            }`}
                          >
                            {occ}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {savedOutfits.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <History className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-base font-bold">Chưa có lịch sử phối đồ nào</h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Lưu một bộ đồ từ Gợi ý phối đồ hoặc bấm “Lưu phối đồ” trên ma-nơ-canh 3D.
                    </p>
                  </div>
                ) : sortedAndFilteredHistory.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-10 text-center space-y-2.5 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <p className="text-sm font-bold">
                      Không tìm thấy bộ trang phục nào khớp với bộ lọc hiện tại
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOccasionFilter('Tất cả');
                        setHistorySearchQuery('');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${accent.softBgClass} ${accent.textClass}`}
                    >
                      Đặt lại bộ lọc tìm kiếm
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sortedAndFilteredHistory.map((saved, idx) => (
                      <motion.div
                        key={saved.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 shadow-xs ${
                          isLightMode
                            ? 'bg-white border-stone-200'
                            : 'bg-stone-900 border-stone-800'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg font-semibold ${accent.softBgClass} ${accent.textClass}`}
                              >
                                {saved.occasion}
                              </span>
                              <span className="text-stone-500 dark:text-stone-400">
                                {saved.weatherNote}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedOutfit(saved.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Xóa khỏi lịch sử"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="text-lg font-bold text-stone-900 dark:text-white">
                            {saved.title}
                          </h4>

                          <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                            {saved.items.map((it, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className={`w-3.5 h-3.5 shrink-0 ${accent.textClass}`} />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>

                          <p className="text-xs text-stone-500 dark:text-stone-400 italic pt-2 border-t border-stone-100 dark:border-stone-800">
                            "{saved.auraAdvice}"
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

    </>
  );
}
