import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LeadForm from '@/components/LeadForm';
import { businessName } from '@/lib/wa';
import type { CropLanding } from '@/lib/crop-landings';

export default function CropLandingPage({ landing }: { landing: CropLanding }) {
  const zoneLabel = landing.zone === 'altiplano' ? 'Altiplano de Granada' : 'Costa Tropical';

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="container">
            <span className="badge">{zoneLabel} · {landing.cropLabel}</span>
            <h1>{landing.title}</h1>
            <p className="lead">{landing.intro}</p>
            <a className="btn btn-primary btn-lg" href="#contacto">
              Recibir avisos por WhatsApp
            </a>
          </div>
        </section>

        <section className="section">
          <div className="container crop-landing-grid">
            <div>
              <div className="section-head section-head-left">
                <h2>Información para {landing.cropLabel}</h2>
                <p>{landing.description}</p>
              </div>
              <ul className="landing-points">
                {landing.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
            <div className="card landing-local-card">
              <span className="trust-kicker">Cobertura local</span>
              <h2>Tu municipio importa</h2>
              <p>
                Consulta la previsión para {landing.municipalities} y contrástala
                siempre con el estado real de tu finca.
              </p>
              <p className="trust-note">
                {businessName()} ofrece información orientativa, no sustituye el
                criterio técnico ni la observación del cultivo.
              </p>
            </div>
          </div>
        </section>

        <section id="contacto" className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>Recibir avisos para mi {landing.cropLabel}</h2>
              <p>Déjanos tu municipio y teléfono. Solo WhatsApp, sin llamadas comerciales.</p>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
