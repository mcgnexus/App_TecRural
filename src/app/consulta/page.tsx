import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeatherWidget from '@/components/WeatherWidget';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Consulta meteorológica y riego',
  description: 'Consulta el tiempo local, riesgos y riego orientativo para tu municipio.',
  alternates: { canonical: `${SITE_URL}/consulta` },
};

export default function ConsultaPage() {
  return (
    <>
      <Header />
      <main id="consulta" className="section section-consult">
        <div className="container">
          <div className="section-head">
            <h1>Consulta meteorológica de tu municipio</h1>
            <p>Datos actuales, previsión, riesgos y orientación de riego.</p>
          </div>
          <WeatherWidget />
        </div>
      </main>
      <Footer />
    </>
  );
}
