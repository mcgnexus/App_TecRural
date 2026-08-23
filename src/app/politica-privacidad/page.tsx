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
        Manuel Carrasco García trata los datos que nos facilitas a través del
        formulario para gestionar la suscripción a avisos agrícolas y, solo si
        lo autorizas por separado, enviarte comunicaciones comerciales.
      </p>
      <h2>Responsable y contacto</h2>
      <p>
        Responsable: Manuel Carrasco García, NIF 76143911L. Nombre comercial:
        TecRural. Domicilio: Barrio Los Reyes 113, 18830 Huéscar (Granada).
        Contacto: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>Datos que tratamos</h2>
      <p>
        Nombre, teléfono, municipio y, si decides facilitarlos, cultivo, tamaño
        de la finca e interés principal. No solicitamos datos especialmente
        protegidos.
      </p>
      <h2>Finalidad y base legal</h2>
      <p>
        Para gestionar los avisos agrícolas por WhatsApp tratamos tus datos con
        base en tu solicitud y consentimiento expreso. Esta autorización es
        necesaria para prestarte el servicio de avisos y puedes retirarla en
        cualquier momento.
      </p>
      <p>
        Las comunicaciones comerciales tienen una finalidad independiente y
        solo se enviarán si marcas su casilla específica. Son opcionales y no
        condicionan la recepción de avisos agrícolas. Puedes retirar esta
        autorización en cualquier momento.
      </p>
      <h2>Comunicaciones por WhatsApp</h2>
      <p>
        Los mensajes se enviarán al número que facilites y únicamente para las
        finalidades que hayas autorizado. Puedes solicitar la baja escribiendo
        por WhatsApp o contactando con {CONTACT_EMAIL}.
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
