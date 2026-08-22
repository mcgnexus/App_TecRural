import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Información sobre las cookies y tecnologías similares de TecRural.',
  alternates: { canonical: `${SITE_URL}/politica-cookies` },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Política de cookies">
      <h2>Qué son las cookies</h2>
      <p>
        Son pequeños archivos o tecnologías similares que permiten recordar
        preferencias y entender el uso de una web.
      </p>
      <h2>Cookies utilizadas</h2>
      <p>
        TecRural utiliza almacenamiento local para recordar tu elección sobre
        cookies analíticas. Si aceptas, puede cargarse Google Analytics 4 para
        obtener estadísticas de uso. Esta analítica no se carga hasta que prestas
        tu consentimiento.
      </p>
      <h2>Cómo gestionar tu elección</h2>
      <p>
        Puedes rechazar las cookies analíticas desde el aviso inicial. También
        puedes borrar el almacenamiento local del sitio desde la configuración de
        tu navegador para volver a mostrarlo. Las cookies técnicas necesarias
        para el funcionamiento básico no requieren consentimiento.
      </p>
      <h2>Más información</h2>
      <p>
        Para cualquier consulta sobre cookies o privacidad, contacta con TecRural
        a través de <a href="mailto:hola@tecrural.es">hola@tecrural.es</a>.
      </p>
    </LegalPage>
  );
}
