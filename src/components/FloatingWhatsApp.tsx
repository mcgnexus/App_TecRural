'use client';

import { useEffect, useState } from 'react';
import TrackedWhatsAppLink from './TrackedWhatsAppLink';

interface FloatingWhatsAppProps {
  href: string;
  source: string;
  ariaLabel: string;
  children: React.ReactNode;
}

export default function FloatingWhatsApp({
  href,
  source,
  ariaLabel,
  children,
}: FloatingWhatsAppProps) {
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById('contacto');
    if (!form) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFormVisible(entry.isIntersecting),
      { rootMargin: '-10% 0px -10% 0px' }
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <TrackedWhatsAppLink
      className={`wa-float${formVisible ? ' wa-float-hidden' : ''}`}
      href={href}
      source={source}
      ariaLabel={ariaLabel}
    >
      {children}
    </TrackedWhatsAppLink>
  );
}
