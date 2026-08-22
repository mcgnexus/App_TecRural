'use client';

import { useState, useEffect } from 'react';

interface ConsentBannerProps {
  onAccept: () => void;
  onReject: () => void;
}

export default function ConsentBanner({ onAccept, onReject }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const hasConsent = localStorage.getItem('analytics-consent');
    if (hasConsent === null) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics-consent', 'accepted');
    window.dispatchEvent(new Event('analytics-consent-changed'));
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onAccept();
    }, 300);
  };

  const handleReject = () => {
    localStorage.setItem('analytics-consent', 'rejected');
    window.dispatchEvent(new Event('analytics-consent-changed'));
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onReject();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`consent-banner ${isAnimating ? 'visible' : ''}`}>
      <div className="consent-content">
        <div className="consent-text">
          <h3>🍪 Cookies y analítica</h3>
          <p>
            Utilizamos cookies analíticas para entender cómo usas nuestra web y mejorarla.
            Tus datos se procesan de forma anónima y cumplimos con el RGPD. Puedes cambiar tu
            preferencia en cualquier momento.
          </p>
        </div>
        <div className="consent-buttons">
          <button
            className="btn btn-ghost consent-btn"
            onClick={handleReject}
          >
            Rechazar
          </button>
          <button
            className="btn btn-primary consent-btn"
            onClick={handleAccept}
          >
            Aceptar
          </button>
        </div>
        <button
          className="consent-close"
          onClick={handleReject}
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
