import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import type { ActiveSection, NavItem } from '../sections/types';

interface MobileTabBarProps {
  navItems: NavItem[];
  activeSection: ActiveSection;
  onSelect: (section: ActiveSection) => void;
  onAddGarment: () => void;
  onOpenAura: () => void;
  auraUnread: boolean;
}

/** Thanh điều hướng dưới đáy cho màn hình < 768px (thay cho thanh bên) */
export function MobileTabBar({ navItems, activeSection, onSelect, onAddGarment, onOpenAura, auraUnread }: MobileTabBarProps) {
  const item = (key: string, label: string, icon: React.ReactNode, active: boolean, onClick: () => void, dot = false) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium cursor-pointer ${
        active ? 'text-accent-text' : 'text-fg-muted'
      }`}
    >
      {icon}
      <span className="max-w-full truncate px-0.5">{label}</span>
      {dot && <span className="absolute right-[calc(50%-14px)] top-2 h-2 w-2 rounded-full bg-rose-500" aria-hidden />}
    </button>
  );
  const short: Record<ActiveSection, string> = {
    discover: 'Gợi ý',
    mannequin: 'Ma-nơ-canh',
    wardrobe: 'Tủ đồ',
    history: 'Lịch sử',
  };
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden phone-land:flex"
    >
      {navItems.slice(0, 2).map((n) => {
        const Icon = n.icon;
        return item(n.id, short[n.id], <Icon className="h-5 w-5" aria-hidden />, activeSection === n.id, () => onSelect(n.id));
      })}
      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onAddGarment}
          aria-label="Thêm trang phục mới"
          className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-fg shadow-pop cursor-pointer"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {navItems.slice(2).map((n) => {
        const Icon = n.icon;
        return item(n.id, short[n.id], <Icon className="h-5 w-5" aria-hidden />, activeSection === n.id, () => onSelect(n.id));
      })}
      {item('aura', 'Aura', <Sparkles className="h-5 w-5" aria-hidden />, false, onOpenAura, auraUnread)}
    </nav>
  );
}
