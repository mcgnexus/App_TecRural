import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { businessName } from '@/lib/wa';
import './globals.css';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${businessName()} — Clima y riego orientativo para tu finca`,
    template: `%s · ${businessName()}`,
  },
  description:
    'Información local de clima y riego orientativo para fincas del Altiplano y la Costa Tropical de Granada. Avisos agrícolas, sensores y recomendaciones sencillas.',
  applicationName: businessName(),
  keywords: [
    'riego',
    'clima',
    'agro',
    'Granada',
    'Altiplano',
    'Costa Tropical',
    'agricultura de precisión',
    'sensores',
    'avisos agrícolas',
  ],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: businessName(),
    title: `${businessName()} — Clima y riego orientativo para tu finca`,
    description:
      'Consulta el tiempo local, revisa riesgos y recibe recomendaciones sencillas para cuidar mejor tu cultivo.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3d7a3f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
