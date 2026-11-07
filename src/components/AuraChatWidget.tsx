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
} from 'lucide-react';
import { ACCENT_COLORS } from '../constants';
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

export const AuraChatWidget: React.FC<AuraChatWidgetProps> = ({
  profile,
  wardrobeItems,
  weather,
  selectedOccasion,
  externalOpen,
  onExternalOpenHandled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Xin chào ${profile.displayName}! Mình là **Aura** — trợ lý định hình phong cách cá nhân của bạn. Hôm nay tại ${weather.city} trời ${weather.condition.toLowerCase()} (${weather.temp}°C). Bạn muốn hỏi về thời tiết hôm nay hay cần Aura gợi ý phối đồ cho dịp **${selectedOccasion}** dựa trên phong cách ${(profile.favoriteStyles || []).slice(0, 2).join(', ')}?`,
      timestamp: 'Vừa xong',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const accent = ACCENT_COLORS[profile.accentColor || 'amber'] || ACCENT_COLORS.amber;

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
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: `Aura tạm thời gián đoạn kết nối (${error?.message || 'Vui lòng thử lại'}). Tuy nhiên với thời tiết ${weather.temp}°C (${weather.condition}) hôm nay, bạn nên ưu tiên trang phục thoáng nhẹ theo phong cách ${(profile.favoriteStyles || [])[0] || 'Tối giản'} nhé!`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickChips = [
    {
      icon: CloudSun,
      label: 'Thời tiết hôm nay thế nào & mặc gì?',
      prompt: `Thời tiết hôm nay tại ${weather.city} thế nào và mình nên mặc chất liệu, màu sắc gì cho phù hợp?`,
    },
    {
      icon: Shirt,
      label: `Phối đồ từ tủ đồ (${wardrobeItems.length} món)`,
      prompt: `Hãy giúp mình phối một bộ trang phục thật đẹp từ các món đồ đang có trong tủ đồ của mình theo phong cách ${(profile.favoriteStyles || []).join(', ')}.`,
    },
    {
      icon: CalendarHeart,
      label: `Gợi ý đồ cho dịp ${selectedOccasion}`,
      prompt: `Hôm nay mình có dịp "${selectedOccasion}", Aura gợi ý chi tiết các item Áo, Quần, Giày và Phụ kiện phù hợp với giới tính ${profile.gender} nhé!`,
    },
  ];

  return (
    <>
      {/* Bottom-Right Circular Floating AI Aura Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Trò chuyện với AI Aura"
              className={`group relative w-15 h-15 rounded-full ${accent.bgClass} text-white shadow-2xl flex items-center justify-center border-2 border-white/20 cursor-pointer`}
            >
              <div className="flex flex-col items-center justify-center">
                <Sparkles className="w-6 h-6" />
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
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[420px] h-[580px] max-h-[82vh] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div
              className={`px-5 py-4 ${accent.bgClass} text-white flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight font-sans">
                    AI Aura — Stylist Cá Nhân
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {weather.city} · {weather.temp}°C · {profile.gender}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setMessages([
                      {
                        id: Date.now().toString(),
                        role: 'model',
                        text: `Aura đã làm mới cuộc trò chuyện! Hôm nay trời ${weather.condition.toLowerCase()} (${weather.temp}°C), ${profile.displayName} muốn phối đồ đi đâu nào?`,
                        timestamp: 'Vừa xong',
                      },
                    ])
                  }
                  title="Làm mới hội thoại"
                  className="p-2 rounded-full hover:bg-white/15 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Thu gọn"
                  className="p-2 rounded-full hover:bg-white/15 transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Đóng"
                  className="p-2 rounded-full hover:bg-white/15 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/60 dark:bg-stone-950/50"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? `${accent.bgClass} text-white rounded-br-xs`
                        : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2">
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 text-xs text-stone-500">
                    Aura đang phân tích tủ đồ & thời tiết...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="px-3.5 py-2 bg-white dark:bg-stone-900 border-t border-stone-200/80 dark:border-stone-800 flex gap-1.5 overflow-x-auto">
              {quickChips.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => sendPromptToAura(chip.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
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
              className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi Aura về thời tiết, cách phối đồ..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm focus:outline-none focus:border-stone-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`p-2.5 rounded-xl text-white disabled:opacity-40 transition-all cursor-pointer ${accent.bgClass}`}
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
