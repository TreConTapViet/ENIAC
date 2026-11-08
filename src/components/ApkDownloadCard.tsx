import React from 'react';
import { Download, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ApkDownloadCard() {
  const apkDownloadUrl = 'https://www.pwabuilder.com/download?siteUrl=' + encodeURIComponent('https://ais-pre-6qptewqjy5un4hfmjet4ch-747123600806.asia-east1.run.app') + '&platform=android';

  return (
    <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-5 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-black text-base sm:text-lg">
            <Smartphone className="h-6 w-6 text-amber-300 shrink-0" />
            <span>TẢI FILE CÀI ĐẶT ANDROID (.APK)</span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-white/95 leading-relaxed">
            Nhấn nút để tải tệp cài đặt ứng dụng Android. Mở tệp tải về trên điện thoại để cài đặt và sử dụng ngay lập tức như ứng dụng gốc!
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-amber-200 font-semibold">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Không cần qua Google Play</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Hoạt động offline mượt mà</span>
          </div>
        </div>
        <a
          href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent('https://ais-pre-6qptewqjy5un4hfmjet4ch-747123600806.asia-east1.run.app')}`}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-xl transition hover:bg-emerald-50 hover:scale-105 active:scale-95 cursor-pointer justify-center w-full sm:w-auto"
        >
          <Download className="h-5 w-5 text-emerald-600 animate-bounce" />
          <span>TẢI FILE CÀI ĐẶT .APK</span>
        </a>
      </div>
    </div>
  );
}
