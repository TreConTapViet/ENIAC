
import { motion } from 'motion/react';
import { styleLabel, styleTagBadge } from '../../shared/styles';
import {
  AuraOutfitRecommendation,
  GarmentCategory,
  GenderOption,
  WardrobeItem,
} from '../types';

import {
  Shirt,
  Plus,
  Heart,
  Trash2,
  Search,
} from 'lucide-react';

import type { ActiveSection, AccentTheme, SizeCalculation, Setter } from './types';

// Tách nguyên văn từ App.tsx (Giai đoạn 2, không đổi hành vi)
export interface WardrobeSectionProps {
  accent: AccentTheme;
  /** Loại đồ hiện trong bộ lọc (theo giới tính, xem domain/categories.ts) */
  categories: GarmentCategory[];
  /** id phong cách hiện trong bộ lọc (theo giới tính, xem shared/styles.ts) */
  styleFilterIds: string[];
  gender: GenderOption;
  activeSection: ActiveSection;
  filteredWardrobeItems: WardrobeItem[];
  handleDeleteWardrobeItem: (itemId: string) => Promise<void>;
  handleToggleFavoriteItem: (item: WardrobeItem) => Promise<void>;
  isLightMode: boolean;
  searchQuery: string;
  selectedCategory: string;
  setActiveSection: Setter<ActiveSection>;
  setSearchQuery: Setter<string>;
  setSelectedCategory: Setter<string>;
  setShowAddGarmentModal: Setter<boolean>;
  setTryOnOutfitForMannequin: Setter<AuraOutfitRecommendation | null>;
  setWardrobeStyleFilter: Setter<string>;
  sizeCalculation: SizeCalculation;
  wardrobeStyleFilter: string;
}

export function WardrobeSection({
  accent,
  categories,
  styleFilterIds,
  gender,
  activeSection,
  filteredWardrobeItems,
  handleDeleteWardrobeItem,
  handleToggleFavoriteItem,
  isLightMode,
  searchQuery,
  selectedCategory,
  setActiveSection,
  setSearchQuery,
  setSelectedCategory,
  setShowAddGarmentModal,
  setTryOnOutfitForMannequin,
  setWardrobeStyleFilter,
  sizeCalculation,
  wardrobeStyleFilter,
}: WardrobeSectionProps) {
  return (
    <>
            {/* TAB 3: DIGITAL WARDROBE CLOSET — Categorized Grid of Isolated Garments */}
            {activeSection === 'wardrobe' && (
              <motion.section
                key="section-wardrobe"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      Tủ Đồ Cá Nhân ({filteredWardrobeItems.length} món)
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Size đề xuất: {sizeCalculation.shortSize}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên, Dark Coquette, Y2K..."
                        className={`pl-9 pr-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                          isLightMode
                            ? 'bg-white border-stone-200 text-stone-900'
                            : 'bg-stone-900 border-stone-800 text-stone-100'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddGarmentModal(true)}
                      className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap ${accent.bgClass}`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm đồ</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Tabs (Áo, Quần, Chân váy, Đầm & Váy liền, Áo khoác, Giày dép, Phụ kiện) */}
                <div className="flex flex-wrap items-center gap-2">
                  {['Tất cả', ...categories].map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          active
                            ? `${accent.bgClass} text-white shadow-xs`
                            : `${accent.softBgClass} ${accent.textClass} hover:opacity-90`
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Style Tag Filter Bar (Dark Coquette, Y2K, Minimalist, Preppy Goth, Streetwear...) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-stone-400 shrink-0">
                    Phong cách:
                  </span>
                  {['Tất cả', ...styleFilterIds].map((tag) => {
                    const active = wardrobeStyleFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setWardrobeStyleFilter(tag)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-violet-600 text-white font-semibold'
                            : isLightMode
                            ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {tag === 'Tất cả' ? tag : styleLabel(tag, 'short')}
                      </button>
                    );
                  })}
                </div>

                {/* Wardrobe Grid */}
                {filteredWardrobeItems.length === 0 ? (
                  <div
                    className={`rounded-3xl border p-12 text-center space-y-3 ${
                      isLightMode
                        ? 'bg-white border-stone-200'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <Shirt className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-base font-bold">
                      Chưa có trang phục nào trong bộ lọc này
                    </h4>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('Tất cả');
                          setWardrobeStyleFilter('Tất cả');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer"
                      >
                        Xem tất cả tủ đồ
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddGarmentModal(true)}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer ${accent.bgClass}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tải ảnh trang phục mới</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredWardrobeItems.map((item, idx) => {
                      const shortBadge = styleTagBadge(item.styleTag, gender);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileHover={{ y: -4 }}
                          className={`group rounded-3xl border overflow-hidden flex flex-col justify-between transition-all shadow-xs ${
                            isLightMode
                              ? 'bg-[#181512] text-white border-stone-800'
                              : 'bg-[#FAF8F5] text-stone-900 border-stone-200'
                          }`}
                        >
                          <div>
                            {/* Isolated Minimalist Studio Card Frame */}
                            <div className="relative aspect-[4/4.3] w-full bg-white overflow-hidden">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFavoriteItem(item)}
                                  aria-label="Yêu thích"
                                  className="p-2 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors cursor-pointer"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      item.favorite ? 'fill-rose-500 text-rose-500' : 'text-white'
                                    }`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWardrobeItem(item.id)}
                                  aria-label="Xóa trang phục"
                                  className="p-2 rounded-full bg-black/55 text-white/85 hover:text-rose-400 hover:bg-black/75 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="p-4 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] opacity-75">
                                <span className="font-semibold text-violet-500 dark:text-violet-600">
                                  {shortBadge}
                                </span>
                                <span>·</span>
                                <span>{item.category}</span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  Size {sizeCalculation.shortSize}
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-1">
                                {item.name}
                              </h4>

                              <p className="text-[11px] opacity-65 truncate">
                                Màu: {item.color} · {item.occasion}
                              </p>
                            </div>
                          </div>

                          <div className="px-4 pb-4">
                            <button
                              type="button"
                              onClick={() => {
                                setTryOnOutfitForMannequin({
                                  id: `item_${item.id}`,
                                  title: item.name,
                                  styleTag: item.styleTag,
                                  occasion: item.occasion,
                                  weatherNote: item.season,
                                  imageUrl: item.imageUrl,
                                  topImageUrl:
                                    item.category === 'Áo' ||
                                    item.category === 'Áo khoác' ||
                                    item.category === 'Đầm & Váy liền'
                                      ? item.imageUrl
                                      : undefined,
                                  bottomImageUrl:
                                    item.category === 'Quần' ||
                                    item.category === 'Chân váy' ||
                                    item.category === 'Quần & Chân váy'
                                      ? item.imageUrl
                                      : undefined,
                                  topName:
                                    item.category === 'Áo' ||
                                    item.category === 'Áo khoác' ||
                                    item.category === 'Đầm & Váy liền'
                                      ? item.name
                                      : 'Áo phối cùng',
                                  bottomName:
                                    item.category === 'Quần' ||
                                    item.category === 'Chân váy' ||
                                    item.category === 'Quần & Chân váy'
                                      ? item.name
                                      : 'Chân váy / Quần phối cùng',
                                  topColor: item.color,
                                  bottomColor: item.color,
                                  isDressOrSkirt:
                                    item.category === 'Chân váy' ||
                                    item.category === 'Đầm & Váy liền',
                                  items: [item.name],
                                  colorPalette: ['#18181B', '#7C3AED'],
                                  auraAdvice: `Ướm thử ${item.name} (Size ${sizeCalculation.shortSize}) trên ma-nơ-canh 3D.`,
                                });
                                setActiveSection('mannequin');
                              }}
                              className={`w-full py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${accent.borderClass} ${accent.textClass} hover:bg-stone-500/10`}
                            >
                              Ướm thử
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}

    </>
  );
}
