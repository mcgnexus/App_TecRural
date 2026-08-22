import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Información sobre el tratamiento de datos personales en TecRural.',
  alternates: { canonical: `${SITE_URL}/politica-privacidad` },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        En TecRural tratamos los datos que nos facilitas a través del formulario
        para atender tu solicitud, informarte sobre nuestros avisos agrícolas y
        contactar contigo por WhatsApp cuando lo hayas solicitado.
      </p>
      <h2>Responsable y contacto</h2>
      <p>
        Responsable: TecRural. Contacto: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>Datos que tratamos</h2>
      <p>
        Nombre, teléfono, municipio y, si decides facilitarlos, cultivo, tamaño
        de la finca e interés principal. No solicitamos datos especialmente
        protegidos.
      </p>
      <h2>Finalidad y base legal</h2>
      <p>
        Usamos los datos para responder a tu petición y gestionar el servicio
        solicitado. La base legal es tu consentimiento, que puedes retirar en
        cualquier momento sin que afecte al tratamiento realizado previamente.
      </p>
      <h2>Conservación y destinatarios</h2>
      <p>
        Conservaremos los datos mientras exista una relación o durante el tiempo
        necesario para atender la solicitud y cumplir obligaciones legales. No
        vendemos tus datos. Podrán acceder a ellos proveedores necesarios para
        alojar la aplicación o prestar el servicio de mensajería, con las
        garantías correspondientes.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión, oposición, limitación
        o portabilidad escribiendo a {CONTACT_EMAIL}. También puedes reclamar
        ante la Agencia Española de Protección de Datos.
      </p>
    </LegalPage>
  );
}
