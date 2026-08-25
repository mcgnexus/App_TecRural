import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Services from '@/components/Services';
import LeadForm from '@/components/LeadForm';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Servicios agrícolas',
  description: 'Avisos agrícolas, seguimiento de parcelas, sensores y orientación de riego.',
  alternates: { canonical: `${SITE_URL}/servicios` },
};

export default function ServiciosPage() {
  return (
    <>
      <Header />
      <main>
        <Services />
        <section id="contacto" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Solicitar información</h2>
              <p>Cuéntanos tu municipio, cultivo y necesidades.</p>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
