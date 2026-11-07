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
import { calculateRecommendedSize } from '../../constants';
import { styleLabel } from '../../../shared/styles';
import { UserProfile, WardrobeItem, WeatherContextData } from '../../types';

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
  open: boolean;
  /** Mép đang đặt bong bóng: khung chat mở về phía đó */
  side: 'left' | 'right';
  /** Thu gọn về bong bóng */
  onMinimize: () => void;
  /** Ẩn hẳn Aura (bật lại ở thanh bên hoặc Hồ sơ) */
  onHide: () => void;
  /** Aura vừa trả lời (để hiện chấm tin mới nếu khung chat đã đóng) */
  onReply?: () => void;
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

export const AuraChatPanel: React.FC<AuraChatWidgetProps> = ({
  profile,
  wardrobeItems,
  weather,
  selectedOccasion,
  open: isOpen,
  side,
  onMinimize,
  onHide,
  onReply,
}) => {
  const sizeInfo = calculateRecommendedSize(profile);
  const styleBadges =
    (profile.favoriteStyles || []).map((s) => styleLabel(s, 'short')).slice(0, 3).join(', ') ||
    'Dark Coquette, Minimalist';

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Lời chào dựng từ hồ sơ + thời tiết hiện tại; tự cập nhật khi chúng đổi (nếu chưa trò chuyện)
  const isMale = profile.gender === 'Nam';
  const formula = isMale ? 'Áo + Quần + Giày + Phụ kiện' : 'Áo + Chân váy/Quần + Giày + Phụ kiện';
  const welcomeText = `Xin chào ${profile.displayName}! Mình là **Aura** — Stylist AI thông minh độc quyền của ứng dụng Smart Wardrobe.\n\n• **Chỉ số của bạn**: ${sizeInfo.heightCm}cm, ${sizeInfo.weightKg}kg, Size ${sizeInfo.shortSize} (${sizeInfo.bustCm}-${sizeInfo.waistCm}-${sizeInfo.hipCm}cm)\n• **Bối cảnh thực tế**: ${weather.city} (${weather.temp}°C, ${weather.condition.toLowerCase()}) · Dịp: **${selectedOccasion}**\n• **Tủ đồ cá nhân**: ${wardrobeItems.length} món (${styleBadges})\n\nBạn muốn Aura lên công thức phối cụ thể (**${formula}**) kèm lý do tôn dáng cho hôm nay chứ?`;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: welcomeText, timestamp: 'Vừa xong' },
  ]);
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === 'welcome' && prev[0].text !== welcomeText
        ? [{ ...prev[0], text: welcomeText }]
        : prev
    );
  }, [welcomeText]);

  const scrollRef = useRef<HTMLDivElement>(null);

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
      onReply?.();
    } catch (_error: any) {
      const sampleTop =
        wardrobeItems.find((i) => i.category === 'Áo')?.name ||
        (isMale ? 'Áo phông trắng cổ tròn' : 'Áo blouse trơn màu kem');
      const sampleBottom =
        wardrobeItems.find(
          (i) =>
            i.category === 'Quần' ||
            (!isMale && (i.category === 'Chân váy' || i.category === 'Quần & Chân váy'))
        )?.name || (isMale ? 'Quần jeans slim xanh' : 'Chân váy denim chữ A');

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
      {/* Expandable Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Trò chuyện với Aura"
            className={`fixed bottom-4 z-[62] w-[calc(100vw-2rem)] sm:w-110 h-152.5 max-h-[84vh] bg-surface text-fg rounded-panel shadow-pop border border-line flex flex-col overflow-hidden ${side === 'left' ? 'left-4' : 'right-4'}`}
          >
            {/* Chat Header */}
            <div className="px-5 py-4 bg-surface-2 text-fg border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center text-accent-text shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight truncate">
                    Aura — Stylist AI Độc Quyền
                  </h3>
                  <p className="text-xs text-fg-muted font-mono tabular-nums truncate">
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
                  aria-label="Làm mới hội thoại"
                  className="grid h-9 w-9 place-items-center rounded-xl text-fg-muted hover:bg-surface hover:text-fg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onMinimize}
                  title="Thu gọn"
                  aria-label="Thu gọn về bong bóng"
                  className="grid h-9 w-9 place-items-center rounded-xl text-fg-muted hover:bg-surface hover:text-fg transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onHide}
                  title="Ẩn Aura (bật lại ở thanh bên hoặc Hồ sơ)"
                  aria-label="Ẩn Aura"
                  className="grid h-9 w-9 place-items-center rounded-xl text-fg-muted hover:bg-surface hover:text-fg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-canvas"
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
                        ? 'bg-accent text-accent-fg rounded-br-xs'
                        : 'bg-surface text-fg border border-line rounded-bl-xs'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>
                  <span className="text-xs text-fg-subtle mt-1 px-1 font-mono tabular-nums">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2">
                  <div className="bg-surface border border-line rounded-2xl px-4 py-3 text-xs text-fg-muted">
                    Aura đang phân tích số đo ({sizeInfo.heightCm}cm, {sizeInfo.weightKg}kg), thời tiết ({weather.temp}°C) & tủ đồ...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="px-3.5 py-2.5 bg-surface border-t border-line flex gap-2 overflow-x-auto">
              {quickChips.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => sendPromptToAura(chip.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-line text-fg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-accent-text" />
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
              className="p-3 bg-surface border-t border-line flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Hỏi Aura công thức phối đồ (${formula})...`}
                aria-label="Tin nhắn cho Aura"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Gửi"
                className="p-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-fg disabled:opacity-40 transition-colors cursor-pointer shrink-0"
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
