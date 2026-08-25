import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { CROP_LANDINGS } from '@/lib/crop-landings';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/altiplano`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/costa`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/consulta`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/servicios`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...['politica-privacidad', 'aviso-legal', 'politica-cookies'].map((path) => ({
      url: `${SITE_URL}/${path}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
    ...CROP_LANDINGS.map((landing) => ({
      url: `${SITE_URL}/${landing.zone}/${landing.crop}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
