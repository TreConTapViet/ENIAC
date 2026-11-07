
import { motion } from 'motion/react';
import {
  ThemeMode,
} from '../types';

import {
  Sparkles,
  Plus,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import type { ActiveSection, AccentTheme, SizeCalculation, Setter, NavItem } from './types';
import type { ThemeState } from './types';

// Tách nguyên văn từ App.tsx (Giai đoạn 2, không đổi hành vi)
export interface SidebarProps {
  accent: AccentTheme;
  auraVisible: boolean;
  auraUnread: boolean;
  onOpenAura: () => void;
  activeSection: ActiveSection;
  handleChangeTheme: (mode: ThemeMode) => void;
  navItems: NavItem[];
  setActiveSection: Setter<ActiveSection>;
  setShowAddGarmentModal: Setter<boolean>;
  setSidebarCollapsed: Setter<boolean>;
  sidebarCollapsed: boolean;
  sizeCalculation: SizeCalculation;
  theme: ThemeState;
}

export function Sidebar({
  accent,
  activeSection,
  handleChangeTheme,
  navItems,
  setActiveSection,
  setShowAddGarmentModal,
  setSidebarCollapsed,
  sidebarCollapsed,
  sizeCalculation,
  theme,
  auraVisible,
  auraUnread,
  onOpenAura,
}: SidebarProps) {
  return (
    <>
      {/* COLLAPSIBLE LEFT SIDEBAR TOOLBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 272 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`hidden md:flex shrink-0 border-r flex-col justify-between p-4 select-none sticky top-0 h-screen z-30 transition-colors bg-surface border-line`}
      >
        <div className="space-y-5 overflow-y-auto overflow-x-hidden pr-0.5">
          {/* Brand Title & Collapse Toggle Button */}
          <div className="flex items-center justify-between gap-2 px-1">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 min-w-0"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${accent.bgClass} flex items-center justify-center shadow-xs shrink-0`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-base font-extrabold tracking-tight block leading-none">
                    Smart Wardrobe
                  </span>
                  <span className="text-xs text-fg-muted ">
                    Size đề xuất: {sizeCalculation.overallSize}
                  </span>
                </div>
              </motion.div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                sidebarCollapsed ? 'mx-auto' : ''
              } bg-surface hover:bg-surface-2 border-line text-fg-muted`}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Primary Quick Add Button */}
          <button
            type="button"
            onClick={() => setShowAddGarmentModal(true)}
            title="Thêm trang phục mới"
            className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${accent.bgClass}`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Thêm trang phục mới</span>}
          </button>

          {/* Left Navigation Links */}
          <nav className="space-y-1.5">
            {!sidebarCollapsed && (
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-fg-subtle  mb-2">
                Không gian chính
              </p>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? `${accent.bgClass} shadow-xs`
                      : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.count !== undefined && (
                    <span
                      className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20'
                          : 'text-fg-subtle '
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Aura: mở khung chat; nếu đã ẩn bong bóng thì bật lại */}
            <button
              type="button"
              onClick={onOpenAura}
              title={sidebarCollapsed ? 'Trợ lý Aura' : undefined}
              aria-label={auraUnread ? 'Trợ lý Aura (có tin mới)' : 'Trợ lý Aura'}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap text-fg-muted hover:bg-surface-2 hover:text-fg`}
            >
              <div className="relative flex items-center gap-3 truncate">
                <Sparkles className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Trợ lý Aura</span>}
                {auraUnread && (
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden />
                )}
              </div>
              {!sidebarCollapsed && !auraVisible && (
                <span className="text-xs font-medium text-fg-subtle ">Đang ẩn</span>
              )}
            </button>
          </nav>

        </div>

        {/* Bottom Light / Dark Mode Toggle — Strictly "Chế độ sáng" / "Chế độ tối" */}
        <div className="pt-4 border-t border-line  space-y-2">
          <button
            type="button"
            onClick={() => handleChangeTheme(theme.mode === 'dark' ? 'light' : 'dark')}
            title={
              theme.mode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'
            }
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
            } rounded-xl text-xs font-medium border transition-colors cursor-pointer border-line text-fg-muted hover:bg-surface-2`}
          >
            <span className="flex items-center gap-2 truncate">
              {theme.mode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-fg-muted shrink-0" />
              )}
              {!sidebarCollapsed && (
                <span className="truncate">
                  {theme.mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                </span>
              )}
            </span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
