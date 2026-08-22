import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CropLandingPage from '@/components/CropLandingPage';
import { CROP_LANDINGS, getCropLanding } from '@/lib/crop-landings';
import { SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return CROP_LANDINGS.filter((landing) => landing.zone === 'costa').map(({ crop }) => ({ crop }));
}

export async function generateMetadata({ params }: { params: { crop: string } }): Promise<Metadata> {
  const landing = getCropLanding('costa', params.crop);
  if (!landing) return {};
  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: `${SITE_URL}/costa/${landing.crop}` },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: `${SITE_URL}/costa/${landing.crop}`,
      images: [{ url: '/brand-square.png', width: 512, height: 512, alt: landing.title }],
    },
  };
}

export default function CostaCropPage({ params }: { params: { crop: string } }) {
  const landing = getCropLanding('costa', params.crop);
  if (!landing) notFound();
  return <CropLandingPage landing={landing} />;
}
