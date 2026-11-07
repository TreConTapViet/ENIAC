import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  CloudSun,
  Shirt,
  CalendarHeart,
  Minimize2,
  RotateCcw,
  Ruler,
} from 'lucide-react';
import { ACCENT_COLORS, calculateRecommendedSize, getShortStyleBadge } from '../constants';
import { UserProfile, WardrobeItem, WeatherContextData } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface AuraChatWidgetProps {
  profile: UserProfile;
  wardrobeItems: WardrobeItem[];
  weather: WeatherContextData;
  selectedOccasion: string;
  externalOpen?: boolean;
  onExternalOpenHandled?: () => void;
}

function renderFormattedText(raw: string) {
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-stone-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const AuraChatWidget: React.FC<AuraChatWidgetProps> = ({
  profile,
  wardrobeItems,
  weather,
  selectedOccasion,
  externalOpen,
  onExternalOpenHandled,
}) => {
  const sizeInfo = calculateRecommendedSize(profile);
  const styleBadges =
    (profile.favoriteStyles || []).map((s) => getShortStyleBadge(s)).slice(0, 3).join(', ') ||
    'Dark Coquette, Minimalist';

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Xin chào ${profile.displayName}! Mình là **Aura** — Stylist AI thông minh độc quyền của ứng dụng Smart Wardrobe.\n\n• **Chỉ số của bạn**: ${sizeInfo.heightCm}cm, ${sizeInfo.weightKg}kg, Size ${sizeInfo.shortSize} (${sizeInfo.bustCm}-${sizeInfo.waistCm}-${sizeInfo.hipCm}cm)\n• **Bối cảnh thực tế**: ${weather.city} (${weather.temp}°C, ${weather.condition.toLowerCase()}) · Dịp: **${selectedOccasion}**\n• **Tủ đồ cá nhân**: ${wardrobeItems.length} món (${styleBadges})\n\nBạn muốn Aura lên công thức phối cụ thể (**Áo + Chân váy/Quần + Giày + Phụ kiện**) kèm lý do tôn dáng cho hôm nay chứ?`,
      timestamp: 'Vừa xong',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const accent = ACCENT_COLORS[profile.accentColor || 'violet'] || ACCENT_COLORS.violet;

  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
      onExternalOpenHandled?.();
    }
  }, [externalOpen, onExternalOpenHandled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  const sendPromptToAura = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/aura/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          userProfile: profile,
          wardrobeItems,
          weatherContext: weather,
          occasionContext: selectedOccasion,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi kết nối AI Aura');
      }

      const auraMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, auraMsg]);
    } catch (_error: any) {
      const sampleTop =
        wardrobeItems.find((i) => i.category === 'Áo')?.name ||
        'Áo Corset Nâu Espresso Tay Bồng Cổ Vuông';
      const sampleBottom =
        wardrobeItems.find(
          (i) =>
            i.category === 'Chân váy' ||
            i.category === 'Quần' ||
            i.category === 'Quần & Chân váy'
        )?.name || 'Chân Váy Ngắn Denim Xếp Ly Xanh Đậm';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: `Dựa trên chỉ số **${sizeInfo.heightCm}cm, ${sizeInfo.weightKg}kg (Size ${sizeInfo.shortSize})** và thời tiết **${weather.temp}°C (${weather.condition})** cho dịp **${selectedOccasion}**, Aura gợi ý công thức phối từ tủ đồ của bạn:\n\n• **Áo**: **${sampleTop}** (Size ${sizeInfo.topSize})\n• **Chân váy / Quần**: **${sampleBottom}** (Size ${sizeInfo.bottomSize})\n• **Giày**: Giày Mary Jane đế dày 4cm hoặc Loafer cổ điển\n• **Phụ kiện bổ sung**: Túi kẹp nách da mềm + Dây chuyền bạc mảnh (${styleBadges})\n• **Lý do tôn dáng**: Đường chiết eo cao kết hợp phom cạp cao giúp tôn vòng 2 (${sizeInfo.waistCm}cm) và kéo dài tỷ lệ đôi chân cho chiều cao ${sizeInfo.heightCm}cm.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickChips = [
    {
      icon: Shirt,
      label: `Công thức phối từ Tủ đồ (${wardrobeItems.length} món)`,
      prompt: `Dựa trên chỉ số cơ thể của mình (${sizeInfo.heightCm}cm, ${sizeInfo.weightKg}kg, Size ${sizeInfo.shortSize}, số đo ${sizeInfo.bustCm}-${sizeInfo.waistCm}-${sizeInfo.hipCm}cm) và các món đồ có sẵn trong tủ đồ, hãy lập công thức phối cụ thể (Áo + Chân váy/Quần + Giày + Phụ kiện) kèm lý do tôn dáng theo phong cách ${styleBadges}.`,
    },
    {
      icon: Ruler,
      label: `Phối đồ tôn dáng (${sizeInfo.heightCm}cm, ${sizeInfo.weightKg}kg, Size ${sizeInfo.shortSize})`,
      prompt: `Với chiều cao ${sizeInfo.heightCm}cm, cân nặng ${sizeInfo.weightKg}kg (Size ${sizeInfo.shortSize}), mình nên kết hợp các món nào trong tủ đồ và bổ sung 1-2 phụ kiện gì để tôn vòng eo và kéo dài chân nhất?`,
    },
    {
      icon: CalendarHeart,
      label: `Phối đồ dịp ${selectedOccasion} (${weather.temp}°C)`,
      prompt: `Hôm nay tại ${weather.city} thời tiết ${weather.temp}°C (${weather.condition}), mình chuẩn bị đi "${selectedOccasion}". Aura hãy gợi ý công thức phối hoàn chỉnh từ tủ đồ cá nhân nhé!`,
    },
    {
      icon: CloudSun,
      label: 'Gợi ý bổ sung 1-2 món còn thiếu',
      prompt: `Dựa trên tủ đồ hiện tại và phong cách yêu thích (${styleBadges}), Aura gợi ý giúp mình 1-2 món đồ hoặc phụ kiện còn thiếu đáng sắm thêm để phối được nhiều bộ đẹp hơn nhé!`,
    },
  ];

  return (
    <>
      {/* Bottom-Right Circular Floating AI Aura Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Trò chuyện với Stylist AI Aura"
              className="group relative w-15 h-15 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-600/30 flex items-center justify-center border border-white/25 cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center">
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Aura</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[440px] h-[610px] max-h-[84vh] bg-white dark:bg-[#14131A] text-stone-900 dark:text-stone-100 rounded-3xl shadow-2xl border border-stone-200 dark:border-white/15 flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#1A1625] via-[#221C35] to-[#1A1625] text-white border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center text-violet-300 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight truncate">
                    Aura — Stylist AI Độc Quyền
                  </h3>
                  <p className="text-[11px] text-stone-300 font-mono tabular-nums truncate">
                    {sizeInfo.heightCm}cm · {sizeInfo.weightKg}kg · Size {sizeInfo.shortSize} ·{' '}
                    {weather.temp}°C
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setMessages([
                      {
                        id: Date.now().toString(),
                        role: 'model',
                        text: `Aura đã đồng bộ lại dữ liệu của **${profile.displayName}** (${sizeInfo.heightCm}cm, ${sizeInfo.weightKg}kg, Size ${sizeInfo.shortSize}) · Thời tiết **${weather.city} ${weather.temp}°C** (${weather.condition}). Bạn muốn phối đồ cho dịp **${selectedOccasion}** chứ?`,
                        timestamp: 'Vừa xong',
                      },
                    ])
                  }
                  title="Làm mới hội thoại"
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Thu gọn"
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Đóng"
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/70 dark:bg-[#0E0D12]"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? `${accent.bgClass} text-white rounded-br-xs`
                        : 'bg-white dark:bg-[#191820] text-stone-800 dark:text-stone-200 border border-stone-200/90 dark:border-white/10 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1 font-mono tabular-nums">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2">
                  <div className="bg-white dark:bg-[#191820] border border-stone-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
                    Aura đang phân tích số đo ({sizeInfo.heightCm}cm, {sizeInfo.weightKg}kg), thời tiết ({weather.temp}°C) & tủ đồ...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="px-3.5 py-2.5 bg-white dark:bg-[#14131A] border-t border-stone-200/80 dark:border-white/10 flex gap-2 overflow-x-auto">
              {quickChips.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => sendPromptToAura(chip.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-stone-200 border border-transparent dark:border-white/10 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-violet-500 dark:text-violet-400" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPromptToAura(input);
              }}
              className="p-3 bg-white dark:bg-[#14131A] border-t border-stone-200 dark:border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi Aura công thức phối đồ (Áo + Quần/Váy + Giày + Phụ kiện)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-[#0E0D12] border border-stone-200 dark:border-white/10 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
