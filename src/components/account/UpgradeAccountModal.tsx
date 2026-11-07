import React, { useRef, useState } from 'react';
import { ArrowLeft, Mail, X } from 'lucide-react';
import { useDialogFocus } from '../ui/useDialogFocus';
import {
  EmailAlreadyRegisteredError,
  signInExistingEmailAndMergeGuest,
  upgradeGuestWithEmail,
  upgradeGuestWithGoogle,
  type UpgradeResult,
} from '../../services/auth';

interface UpgradeAccountModalProps {
  open: boolean;
  /** Tên hiển thị trong hồ sơ khách, gán cho tài khoản mới */
  displayName: string;
  onClose: () => void;
}

type Step = 'choose' | 'email' | 'existing' | 'done';

const inputCls =
  'h-11 w-full rounded-control border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent';
const primaryBtn =
  'h-11 w-full rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60 cursor-pointer';
const secondaryBtn =
  'h-11 w-full rounded-control border border-line bg-surface px-4 text-sm font-semibold text-fg hover:bg-surface-2 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2.5';

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/**
 * Nâng cấp tài khoản khách. Liên kết vào chính uid khách nên tủ đồ trên máy giữ nguyên;
 * nếu Google/email đã có tài khoản thì đăng nhập vào đó và chuyển dữ liệu khách sang.
 */
export function UpgradeAccountModal({ open, displayName, onClose }: UpgradeAccountModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState('');

  const close = () => {
    if (busy) return;
    setStep('choose');
    setPassword('');
    setConfirm('');
    setError(null);
    onClose();
  };
  useDialogFocus(panelRef, open, close);
  if (!open) return null;

  const finish = (result: UpgradeResult, how: 'google' | 'email') => {
    if (result.kind === 'merged-into-existing') {
      setDoneMessage(
        `Đã đăng nhập vào tài khoản ${result.user.email ?? ''} có sẵn. Đồ bạn tự thêm và các bộ đã lưu khi dùng chế độ khách đã được chuyển sang tài khoản này.`
      );
    } else if (how === 'google') {
      setDoneMessage('Đã nâng cấp bằng Google. Tủ đồ của bạn bắt đầu đồng bộ lên mây.');
    } else {
      setDoneMessage(
        `Đã tạo tài khoản và gửi thư xác thực tới ${result.user.email ?? email}. Bấm link trong thư để bật đồng bộ lên mây; trong lúc chờ, dữ liệu vẫn nằm trên máy này.`
      );
    }
    setStep('done');
  };

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      if (err instanceof EmailAlreadyRegisteredError) {
        setStep('existing');
        setPassword('');
      } else {
        setError(err instanceof Error ? err.message : 'Không nâng cấp được tài khoản. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError('Mật khẩu phải có tối thiểu 6 ký tự.');
    if (password !== confirm) return setError('Mật khẩu nhập lại không khớp.');
    void run(async () => finish(await upgradeGuestWithEmail(email, password, displayName), 'email'));
  };

  const submitExisting = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => finish(await signInExistingEmailAndMergeGuest(email, password), 'email'));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-panel border border-line bg-surface text-fg shadow-pop"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            {(step === 'email' || step === 'existing') && (
              <button
                type="button"
                onClick={() => {
                  setStep('choose');
                  setError(null);
                }}
                className="grid h-9 w-9 place-items-center rounded-control text-fg-muted hover:bg-surface-2 cursor-pointer"
                aria-label="Quay lại"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 id="upgrade-title" className="text-base font-semibold">
              {step === 'existing' ? 'Email đã có tài khoản' : 'Nâng cấp tài khoản'}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-control text-fg-muted hover:bg-surface-2 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {step === 'choose' && (
            <>
              <p className="text-sm leading-relaxed text-fg-muted">
                Giữ nguyên tủ đồ và lịch sử phối đồ hiện tại, đồng bộ lên mây và dùng được trên máy khác.
              </p>
              <button
                type="button"
                disabled={busy}
                className={secondaryBtn}
                onClick={() => void run(async () => finish(await upgradeGuestWithGoogle(), 'google'))}
              >
                <GoogleMark />
                {busy ? 'Đang mở Google…' : 'Tiếp tục với Google'}
              </button>
              <button type="button" disabled={busy} className={secondaryBtn} onClick={() => setStep('email')}>
                <Mail className="h-4 w-4" aria-hidden />
                Dùng email và mật khẩu
              </button>
            </>
          )}

          {step === 'email' && (
            <form onSubmit={submitEmail} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-fg-muted">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="ban@gmail.com"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-fg-muted">Mật khẩu (tối thiểu 6 ký tự)</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-fg-muted">Nhập lại mật khẩu</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                />
              </label>
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản và giữ dữ liệu'}
              </button>
            </form>
          )}

          {step === 'existing' && (
            <form onSubmit={submitExisting} className="space-y-3">
              <p className="text-sm leading-relaxed text-fg-muted">
                <strong className="font-semibold text-fg">{email}</strong> đã có tài khoản. Nhập mật khẩu của tài
                khoản đó để đăng nhập; đồ tự thêm và các bộ đã lưu ở chế độ khách sẽ được chuyển sang.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-fg-muted">Mật khẩu tài khoản {email}</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </label>
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy ? 'Đang đăng nhập…' : 'Đăng nhập và chuyển dữ liệu'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <>
              <p className="text-sm leading-relaxed">{doneMessage}</p>
              <button type="button" className={primaryBtn} onClick={close}>
                Xong
              </button>
            </>
          )}

          {error && step !== 'done' && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
