import React, { useState } from 'react';
import { CloudOff, HardDrive, MailWarning, X } from 'lucide-react';
import type { SessionUser } from '../../hooks/useUserSession';
import { resendVerificationEmail } from '../../services/integrations';

interface AccountStatusBannerProps {
  user: SessionUser;
  storageWarning: string | null;
  onDismissStorageWarning: () => void;
  onUpgrade: () => void;
  /** Trả về true nếu email đã được xác thực */
  onRefreshVerification: () => Promise<boolean>;
}

const bannerBase =
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card border px-4 py-3 text-sm';
const actionBtn =
  'h-9 rounded-control border border-current/25 px-3 text-xs font-semibold hover:bg-current/10 cursor-pointer';

/**
 * Dải thông báo đầu trang về nơi đang lưu dữ liệu:
 *  - Khách: chỉ lưu trên máy này, mời nâng cấp.
 *  - Email chưa xác thực: chưa đồng bộ lên mây, gửi lại thư / kiểm tra lại.
 *  - Bộ nhớ trình duyệt đầy: thay đổi mới chưa lưu được.
 */
export function AccountStatusBanner({
  user,
  storageWarning,
  onDismissStorageWarning,
  onUpgrade,
  onRefreshVerification,
}: AccountStatusBannerProps) {
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const needsVerify = !user.isAnonymous && !user.emailVerified;

  return (
    <div className="space-y-2">
      {storageWarning && (
        <div role="alert" className={`${bannerBase} border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200`}>
          <span className="flex items-start gap-2">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {storageWarning}
          </span>
          <button type="button" onClick={onDismissStorageWarning} className={actionBtn} aria-label="Ẩn cảnh báo">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {user.isAnonymous && (
        <div role="status" className={`${bannerBase} border-line bg-surface-2 text-fg`}>
          <span className="flex items-start gap-2">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
            <span>
              <strong className="font-semibold">Bạn đang dùng chế độ khách.</strong>{' '}
              <span className="text-fg-muted">
                Tủ đồ chỉ lưu trên trình duyệt này và sẽ mất khi đăng xuất hoặc xoá dữ liệu trình duyệt.
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onUpgrade}
            className="h-9 rounded-control bg-accent px-4 text-xs font-semibold text-accent-fg hover:bg-accent-hover cursor-pointer"
          >
            Nâng cấp tài khoản
          </button>
        </div>
      )}

      {needsVerify && (
        <div
          role="status"
          className={`${bannerBase} border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100`}
        >
          <span className="flex items-start gap-2">
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {verifyNotice ||
              `Xác thực email ${user.email ?? ''} để đồng bộ tủ đồ lên mây. Hiện dữ liệu chỉ lưu trên máy này.`}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              className={actionBtn}
              onClick={() =>
                resendVerificationEmail()
                  .then(() => setVerifyNotice('Đã gửi lại thư xác thực. Kiểm tra hộp thư (cả mục Spam).'))
                  .catch((e: Error) => setVerifyNotice(e.message))
              }
            >
              Gửi lại thư
            </button>
            <button
              type="button"
              disabled={checking}
              className="h-9 rounded-control bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
              onClick={() => {
                setChecking(true);
                onRefreshVerification()
                  .then((ok) =>
                    setVerifyNotice(ok ? null : 'Email chưa được xác thực. Hãy bấm link trong thư rồi thử lại.')
                  )
                  .catch(() => setVerifyNotice('Không kiểm tra được lúc này. Vui lòng thử lại.'))
                  .finally(() => setChecking(false));
              }}
            >
              {checking ? 'Đang kiểm tra…' : 'Tôi đã xác thực'}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
