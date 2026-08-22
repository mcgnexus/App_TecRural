import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeadForm from '@/components/LeadForm';
import { businessName } from '@/lib/wa';
import { MUNICIPALITIES } from '@/lib/municipalities';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tecrural.es';
const costa = MUNICIPALITIES.filter((m) => m.zone === 'costa');

export const metadata: Metadata = {
  title: `Clima y riego en la Costa Tropical de Granada — ${businessName()}`,
  description:
    'Información meteorológica y recomendaciones de riego para agricultores de la Costa Tropical de Granada: Almuñécar, Motril, Salobreña, Órgiva y más municipios.',
  openGraph: {
    title: `Clima y riego en la Costa Tropical de Granada — ${businessName()}`,
    description:
      'Consulta el tiempo local y recibe recomendaciones de riego para tu finca en la Costa Tropical de Granada.',
    url: `${SITE_URL}/costa`,
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  alternates: { canonical: `${SITE_URL}/costa` },
};

export default function CostaPage() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="container">
            <span className="badge">Costa Tropical de Granada</span>
            <h1>Clima y riego para tu finca en la Costa Tropical</h1>
            <p className="lead">
              Recibe avisos de lluvia, viento, calor y riego por WhatsApp para
              agricultores de la Costa Tropical de Granada.
            </p>
            <a className="btn btn-primary btn-lg" href="#contacto">
              Recibir avisos por WhatsApp
            </a>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Municipios de la Costa Tropical</h2>
              <p>
                {businessName()} cubre los principales municipios de la Costa
                Tropical de Granada con datos meteorológicos precisos y
                recomendaciones de riego adaptadas a cada zona.
              </p>
            </div>
            <div className="municipality-grid">
              {costa.map((m) => (
                <div className="municipality-card" key={m.name}>
                  <strong>{m.name}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>¿Qué ofrecemos en la Costa Tropical?</h2>
            </div>
            <div className="services-list">
              <div className="service">
                <div className="service-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <div>
                  <h4>Avisos de lluvia, viento y temperaturas extremas</h4>
                  <p>
                    La Costa Tropical está expuesta a lluvias intensas, viento
                    de levante y temperaturas extremas. Recibe alertas en tiempo
                    real por WhatsApp.
                  </p>
                </div>
              </div>
              <div className="service">
                <div className="service-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                </div>
                <div>
                  <h4>Recomendaciones de riego para cultivos tropicales</h4>
                  <p>
                    Orientación de riego para aguacate, chirimoyo, mango,
                    vid y otros cultivos de la Costa Tropical, ajustada a la
                    evapotranspiración local.
                  </p>
                </div>
              </div>
              <div className="service">
                <div className="service-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
                </div>
                <div>
                  <h4>Datos meteorológicos locales</h4>
                  <p>
                    Combina datos oficiales de AEMET con modelos de Open-Meteo
                    para ofrecerte información precisa y actualizada de tu zona.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contacto" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Recibir avisos de la Costa Tropical por WhatsApp</h2>
              <p>
                Déjanos tu municipio y teléfono. Te escribimos por WhatsApp, sin
                llamadas comerciales.
              </p>
            </div>
            <LeadForm />
          </div>
        </section>

        <section className="section section-disclaimer">
          <div className="container">
            <div className="disclaimer">
              <strong>Aviso:</strong> las recomendaciones de esta web son
              orientativas y deben contrastarse con la situación real de la
              finca, el tipo de suelo y el estado del cultivo.
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
