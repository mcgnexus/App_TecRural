'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tecrural-pwa-install-dismissed';
const DISMISS_DAYS = 30;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAppleMobile(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if (isAppleMobile()) {
      setIos(true);
      setTimeout(() => setShow(true), 4000);
    }

    const onAppInstalled = () => setShow(false);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShow(false);
  };

  if (!show || (!installEvent && !ios)) return null;

  return (
    <aside className="pwa-install" aria-label="Instalar TecRural">
      <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="Cerrar">
        ×
      </button>
      <strong>Ten TecRural a mano</strong>
      <p>Instala la app para consultar el tiempo y los avisos desde el campo.</p>
      {installEvent ? (
        <button className="btn btn-primary pwa-install-action" type="button" onClick={install}>
          Instalar app
        </button>
      ) : (
        <p className="pwa-install-ios">
          Pulsa <strong>Compartir</strong> y después{' '}
          <strong>“Añadir a pantalla de inicio”</strong>.
        </p>
      )}
    </aside>
  );
}
