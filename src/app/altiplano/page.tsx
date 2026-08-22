import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeadForm from '@/components/LeadForm';
import { businessName } from '@/lib/wa';
import { MUNICIPALITIES } from '@/lib/municipalities';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tecrural.es';
const altiplano = MUNICIPALITIES.filter((m) => m.zone === 'altiplano');

export const metadata: Metadata = {
  title: `Clima y riego en el Altiplano de Granada — ${businessName()}`,
  description:
    'Información meteorológica y recomendaciones de riego para agricultores del Altiplano de Granada: Huéscar, Baza, Guadix, Cúllar, Orce, Galera y más municipios.',
  openGraph: {
    title: `Clima y riego en el Altiplano de Granada — ${businessName()}`,
    description:
      'Consulta el tiempo local y recibe recomendaciones de riego para tu finca en el Altiplano de Granada.',
    url: `${SITE_URL}/altiplano`,
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  alternates: { canonical: `${SITE_URL}/altiplano` },
};

export default function AltiplanoPage() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="container">
            <span className="badge">Altiplano de Granada</span>
            <h1>Clima y riego para tu finca en el Altiplano</h1>
            <p className="lead">
              Recibe avisos de helada, viento, lluvia y riego por WhatsApp para
              agricultores del Altiplano de Granada.
            </p>
            <a className="btn btn-primary btn-lg" href="#contacto">
              Recibir avisos por WhatsApp
            </a>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Municipios del Altiplano</h2>
              <p>
                {businessName()} cubre los principales municipios del Altiplano
                de Granada con datos meteorológicos precisos y recomendaciones de
                riego adaptadas a cada zona.
              </p>
            </div>
            <div className="municipality-grid">
              {altiplano.map((m) => (
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
              <h2>¿Qué ofrecemos en el Altiplano?</h2>
            </div>
            <div className="services-list">
              <div className="service">
                <div className="service-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <div>
                  <h4>Avisos de heladas y temperaturas extremas</h4>
                  <p>
                    El Altiplano de Granada es una zona de interior con inviernos
                    fríos. Recibe alertas de heladas, olas de frío y temperaturas
                    extremas directamente por WhatsApp.
                  </p>
                </div>
              </div>
              <div className="service">
                <div className="service-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                </div>
                <div>
                  <h4>Recomendaciones de riego para cultivos de secano</h4>
                  <p>
                    Orientación de riego para olivar, almendro, pistacho y otros
                    cultivos habituales del Altiplano, teniendo en cuenta la
                    sequía y las condiciones locales.
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
              <h2>Recibir avisos del Altiplano por WhatsApp</h2>
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
