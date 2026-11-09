import { useState } from 'react';
import { CheckCircle2, CloudOff, ExternalLink, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';

export type SyncStatus =
  | 'signed-out'
  | 'guest'
  | 'unverified'
  | 'missing-web-profile'
  | 'synced'
  | 'error';

export interface SyncInfo {
  status: SyncStatus;
  uid: string | null;
  email: string | null;
  /** favoriteStyles của hồ sơ web, dùng làm styleTag cho món đồ thêm từ app */
  favoriteStyles: unknown;
}

export const SIGNED_OUT_SYNC: SyncInfo = { status: 'signed-out', uid: null, email: null, favoriteStyles: undefined };

/** Trang web Smart Wardrobe nằm ở gốc cùng tên miền */
const WEB_URL = '/';

interface Props {
  sync: SyncInfo;
  onOpenAuth?: () => void;
}

export default function SyncStatusBar({ sync, onOpenAuth }: Props) {
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  async function handleCheckVerified() {
    const user = auth.currentUser;
    if (!user || checking) return;
    setChecking(true);
    setCheckMsg(null);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        // Làm mới token để onIdTokenChanged báo email đã xác thực
        await auth.currentUser.getIdToken(true);
      } else {
        setCheckMsg('Email vẫn chưa được xác thực. Hãy bấm link trong thư rồi thử lại.');
      }
    } catch {
      setCheckMsg('Không kiểm tra được lúc này. Vui lòng thử lại.');
    } finally {
      setChecking(false);
    }
  }

  const webLink = (
    <a
      href={WEB_URL}
      className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-xs font-semibold hover:bg-white"
    >
      Mở web <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );

  if (sync.status === 'synced') {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-xs sm:text-sm text-emerald-800 shadow-sm">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Đang đồng bộ hồ sơ và tủ đồ với web Smart Wardrobe
            {sync.email ? <> · <strong className="font-semibold">{sync.email}</strong></> : null}
          </span>
        </span>
        {webLink}
      </div>
    );
  }

  if (sync.status === 'missing-web-profile') {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs sm:text-sm text-amber-900 shadow-sm">
        <span className="flex items-center gap-2">
          <CloudOff className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Tài khoản này chưa có hồ sơ trên web. Hoàn tất bước đầu trên web để đồng bộ hồ sơ và tủ đồ; trong lúc
            đó app lưu trên máy.
          </span>
        </span>
        {webLink}
      </div>
    );
  }

  if (sync.status === 'unverified') {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs sm:text-sm text-amber-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <MailCheck className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Xác thực email (mở thư Firebase vừa gửi) để đồng bộ với web.</span>
          </span>
          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Tôi đã xác thực
          </button>
        </div>
        {checkMsg && <p className="mt-1.5 text-amber-800">{checkMsg}</p>}
      </div>
    );
  }

  if (sync.status === 'error') {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 text-xs sm:text-sm text-rose-800 shadow-sm">
        <CloudOff className="h-4 w-4 shrink-0 text-rose-600" />
        <span>Không đồng bộ được với web. Kiểm tra mạng rồi tải lại trang.</span>
      </div>
    );
  }

  // Chưa đăng nhập hoặc là khách
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-2.5 text-xs sm:text-sm text-stone-700 shadow-sm">
      <span className="flex items-center gap-2">
        <CloudOff className="h-4 w-4 shrink-0 text-stone-400" />
        <span>Đăng nhập cùng tài khoản với web để đồng bộ hồ sơ và tủ đồ.</span>
      </span>
      {onOpenAuth && (
        <button
          type="button"
          onClick={onOpenAuth}
          className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
        >
          Đăng nhập
        </button>
      )}
    </div>
  );
}
