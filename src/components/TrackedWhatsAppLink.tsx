'use client';

import type { ReactNode } from 'react';
import { trackEvent } from './Analytics';

interface TrackedWhatsAppLinkProps {
  href: string;
  source: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}

export default function TrackedWhatsAppLink({
  href,
  source,
  className,
  ariaLabel,
  children,
}: TrackedWhatsAppLinkProps) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={() => trackEvent('whatsapp_click', { source })}
    >
      {children}
    </a>
  );
}
