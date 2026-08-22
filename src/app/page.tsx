import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeatherWidget from '@/components/WeatherWidget';
import Services from '@/components/Services';
import FAQ from '@/components/FAQ';
import LeadForm from '@/components/LeadForm';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { WhatsAppIcon } from '@/components/icons';
import {
  buildWhatsAppLink,
  businessName,
  defaultWhatsAppMessage,
} from '@/lib/wa';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const waLink = buildWhatsAppLink(defaultWhatsAppMessage('boton flotante'));

  return (
    <>
      <Header />

      <main id="inicio">
        <section className="hero">
          <div className="container">
            <span className="badge">
              Altiplano · Costa Tropical · Granada
            </span>
            <h1>Recibe avisos agrícolas por WhatsApp para tu municipio</h1>
            <p className="lead">
              Alertas de helada, viento, lluvia y riego para el Altiplano y la
              Costa Tropical, sin instalar nada.
            </p>
            <p className="hero-trust">
              Gratis para empezar. Sin app. Respuesta en menos de 24 h.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-lg" href="#contacto">
                Recibir avisos por WhatsApp
              </a>
              <a className="btn btn-ghost btn-lg" href="#consulta">
                Consultar mi municipio
              </a>
            </div>
          </div>
        </section>

        <section id="consulta" className="section section-consult">
          <div className="container">
            <WeatherWidget />
            <div className="lead-shortcut card">
              <div>
                <strong>¿Quieres que te avisemos sin volver a entrar?</strong>
                <p>Déjanos tu teléfono y recibirás los avisos agrícolas por WhatsApp.</p>
              </div>
              <a className="btn btn-wa" href="#contacto">
                Recibir avisos
              </a>
            </div>
          </div>
        </section>

        <Services />

        <FAQ />

        <section className="section trust-section">
          <div className="container">
            <div className="trust-card card">
              <span className="trust-kicker">Quién está detrás</span>
              <h2>Tecnología cercana para agricultores de Granada</h2>
              <p>
                {businessName()} nace para acercar datos útiles de clima, riego y
                avisos agrícolas a fincas del Altiplano y la Costa Tropical, con
                un trato directo por WhatsApp y sin complicaciones técnicas.
              </p>
              <p className="trust-note">
                Revisamos cada solicitud y respondemos en menos de 24 h para
                entender tu municipio, cultivo y necesidades reales.
              </p>
              <p className="local-proof">
                Para agricultores de Baza, Huéscar, Guadix, Motril, Almuñécar y
                otros municipios de Granada.
              </p>
            </div>
          </div>
        </section>

        <section id="contacto" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Recibir avisos por WhatsApp</h2>
              <p>
                Déjanos tus datos y te informaremos de los avisos, planes y
                novedades de {businessName()}.
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

      <FloatingWhatsApp
        href={waLink}
        source="floating_button"
        ariaLabel={`Hablar con ${businessName()} por WhatsApp`}
      >
        <WhatsAppIcon />
        <span className="wa-text">Hablar con {businessName()}</span>
      </FloatingWhatsApp>
    </>
  );
}
