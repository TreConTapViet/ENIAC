import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function getDeferredPwaPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return window.__deferredPwaPrompt || null;
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function bumpManifestVersion(): string {
  const nextVer = 'v' + Date.now();
  try {
    localStorage.setItem('phoido_pwa_ver', nextVer);
    const manifestEl = document.getElementById('app-manifest-link');
    if (manifestEl) {
      manifestEl.setAttribute(
        'href',
        `${import.meta.env.BASE_URL}manifest.json?v=` + encodeURIComponent(nextVer)
      );
    }
  } catch {
    // ignore storage errors
  }
  return nextVer;
}

export function detectDevicePlatform() {
  if (typeof window === 'undefined') {
    return { isAndroid: false, isIOS: false, isInAppWebView: false };
  }
  const ua = window.navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isInAppWebView =
    /FBAN|FBAV|Zalo|Instagram|Line|MicroMessenger|TikTok/i.test(ua);
  return { isAndroid, isIOS, isInAppWebView };
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => getDeferredPwaPrompt());
  const [isStandalone, setIsStandalone] = useState<boolean>(() =>
    isRunningStandalone()
  );
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    const syncPrompt = () => {
      setDeferredPrompt(getDeferredPwaPrompt());
      setIsStandalone(isRunningStandalone());
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__deferredPwaPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      setIsInstalling(false);
      bumpManifestVersion();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPrompt();
      }
    };

    syncPrompt();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-available', syncPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-app-installed', handleAppInstalled);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('pwa-install-available', syncPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-app-installed', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > => {
    const currentPrompt = getDeferredPwaPrompt() || deferredPrompt;
    if (!currentPrompt) {
      return 'unavailable';
    }

    setIsInstalling(true);
    try {
      await currentPrompt.prompt();
      const choice = await currentPrompt.userChoice;
      // Once prompt() is called, the browser consumes the event
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      bumpManifestVersion();

      if (choice.outcome === 'accepted') {
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      bumpManifestVersion();
      return 'unavailable';
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const { isAndroid, isIOS, isInAppWebView } = detectDevicePlatform();

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled: isStandalone,
    isInstalling,
    isAndroid,
    isIOS,
    isInAppWebView,
    triggerInstall,
  };
}
