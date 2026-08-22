'use client';

import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    __tecruralAnalyticsInitialized?: boolean;
  }
}

interface AnalyticsProps {
  measurementId: string;
}

export default function Analytics({ measurementId }: AnalyticsProps) {
  const updateConsent = useCallback((consent: 'granted' | 'denied') => {
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: consent
      });
    }
  }, []);

  const initializeAnalytics = useCallback((id: string) => {
    if (window.__tecruralAnalyticsInitialized) {
      updateConsent('granted');
      return;
    }

    window.dataLayer = window.dataLayer || [];

    function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    }

    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', id, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });

    updateConsent('granted');

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
    window.__tecruralAnalyticsInitialized = true;
  }, [updateConsent]);

  useEffect(() => {
    const hasConsent = localStorage.getItem('analytics-consent');

    if (hasConsent === 'accepted') {
      initializeAnalytics(measurementId);
    } else if (hasConsent === 'rejected') {
      updateConsent('denied');
    }

    const onConsentChanged = () => {
      const nextConsent = localStorage.getItem('analytics-consent');
      if (nextConsent === 'accepted') {
        initializeAnalytics(measurementId);
      } else {
        updateConsent('denied');
      }
    };

    window.addEventListener('analytics-consent-changed', onConsentChanged);

    return () => {
      window.removeEventListener('analytics-consent-changed', onConsentChanged);
      if (window.gtag) {
        updateConsent('denied');
      }
    };
  }, [measurementId, initializeAnalytics, updateConsent]);

  return null;
}

export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag && localStorage.getItem('analytics-consent') === 'accepted') {
    window.gtag('event', eventName, eventParams);
  }
}

export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window !== 'undefined' && window.gtag && localStorage.getItem('analytics-consent') === 'accepted') {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
}
