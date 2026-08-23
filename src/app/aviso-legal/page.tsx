import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Información legal y condiciones de uso de TecRural.',
  alternates: { canonical: `${SITE_URL}/aviso-legal` },
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Aviso legal">
      <h2>Identificación</h2>
      <p>
        Este sitio web es titularidad de Manuel Carrasco García, NIF 76143911L,
        que opera bajo el nombre TecRural. Domicilio: Barrio Los Reyes 113,
        18830 Huéscar (Granada). Para cualquier consulta puedes escribir a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>Objeto</h2>
      <p>
        TecRural ofrece información meteorológica, avisos agrícolas y
        recomendaciones orientativas para fincas del Altiplano y la Costa
        Tropical de Granada.
      </p>
      <h2>Condiciones de uso</h2>
      <p>
        El uso de esta web implica la aceptación de este aviso. La información
        publicada es orientativa y no sustituye el criterio profesional ni la
        comprobación de las condiciones reales de cada finca.
      </p>
      <h2>Propiedad intelectual</h2>
      <p>
        Los textos, diseños, marcas y demás contenidos de este sitio pertenecen
        a TecRural o a sus licenciantes. No se permite su reproducción o
        distribución sin autorización, salvo en los casos permitidos por la ley.
      </p>
      <h2>Responsabilidad</h2>
      <p>
        TecRural procura mantener la información actualizada, pero no garantiza
        la disponibilidad continua ni la ausencia de errores. El usuario es
        responsable del uso que haga de la información.
      </p>
    </LegalPage>
  );
}
