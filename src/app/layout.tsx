import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { businessName, whatsappNumber } from '@/lib/wa';
import ConsentBanner from '@/components/ConsentBanner';
import Analytics from '@/components/Analytics';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${businessName()} — Clima y riego orientativo para tu finca`,
    template: `%s · ${businessName()}`,
  },
  description:
    'Información local de clima y riego orientativo para fincas del Altiplano y la Costa Tropical de Granada. Avisos agrícolas, sensores y recomendaciones sencillas.',
  applicationName: businessName(),
  alternates: { canonical: SITE_URL },
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
      { url: '/brand-square.png', sizes: '512x512', type: 'image/png' },
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
    images: [
      {
         url: '/brand-square.png',
        width: 512,
        height: 512,
        alt: businessName(),
      },
    ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: businessName(),
              description:
                'Información local de clima y riego orientativo para fincas del Altiplano y la Costa Tropical de Granada.',
              url: SITE_URL,
              telephone: process.env.BUSINESS_PHONE || '',
              email: process.env.BUSINESS_EMAIL || '',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Granada',
                addressRegion: 'Granada',
                addressCountry: 'ES',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 37.18,
                longitude: -3.6,
              },
              areaServed: [
                {
                  '@type': 'Place',
                  name: 'Altiplano de Granada',
                },
                {
                  '@type': 'Place',
                  name: 'Costa Tropical de Granada',
                },
              ],
              priceRange: '€€',
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '18:00',
              },
            }),
          }}
        />
        {GA_MEASUREMENT_ID && (
          <Analytics measurementId={GA_MEASUREMENT_ID} />
        )}
      </head>
      <body>
        {children}
        <PwaInstallPrompt />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              });
            }
          `}
        </Script>
        {GA_MEASUREMENT_ID && (
          <ConsentBanner
            onAccept={() => {
              console.log('Analytics consent accepted');
            }}
            onReject={() => {
              console.log('Analytics consent rejected');
            }}
          />
        )}
      </body>
    </html>
  );
}
