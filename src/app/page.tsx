import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeatherWidget from '@/components/WeatherWidget';
import Services from '@/components/Services';
import LeadForm from '@/components/LeadForm';
import { ShieldIcon, WhatsAppIcon } from '@/components/icons';
import {
  buildWhatsAppLink,
  businessName,
  defaultWhatsAppMessage,
} from '@/lib/wa';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const waLink = buildWhatsAppLink(defaultWhatsAppMessage());

  return (
    <>
      <Header />

      <main id="inicio">
        <section className="hero">
          <div className="container">
            <span className="badge">
              Altiplano · Costa Tropical · Granada
            </span>
            <h1>Clima y riego orientativo para tu finca</h1>
            <p className="lead">
              Consulta el tiempo local, revisa riesgos y recibe recomendaciones
              sencillas para cuidar mejor tu cultivo.
            </p>
            <a className="btn btn-primary btn-lg" href="#consulta">
              Consultar mi zona
            </a>
          </div>
        </section>

        <section id="consulta" className="section" style={{ paddingTop: 16 }}>
          <div className="container">
            <WeatherWidget />
          </div>
        </section>

        <Services />

        <section id="contacto" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Recibir avisos agrícolas</h2>
              <p>
                Déjanos tus datos y te informaremos de los avisos, planes y
                novedades de {businessName()}.
              </p>
            </div>
            <LeadForm />
          </div>
        </section>

        <section className="section" style={{ paddingTop: 10 }}>
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

      <a
        className="wa-float"
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Hablar con ${businessName()} por WhatsApp`}
      >
        <WhatsAppIcon />
        <span className="wa-text">Hablar con {businessName()}</span>
      </a>
    </>
  );
}
