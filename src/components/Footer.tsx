import Image from 'next/image';
import { businessName } from '@/lib/wa';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Image
              src="/brand-mark.png"
              alt="Logo de TecRural"
              width={58}
              height={58}
            />
            <div>
              <strong>{businessName()}</strong>
              <span>Tecnología al servicio del campo</span>
            </div>
          </div>
          <div>
            <a href="/#servicios">Servicios</a> ·{' '}
            <a href="/#contacto">Contacto</a>
          </div>
        </div>
        <div className="footer-legal-links">
          <a href="/politica-privacidad">Política de privacidad</a> ·{' '}
          <a href="/aviso-legal">Aviso legal</a> ·{' '}
          <a href="/politica-cookies">Política de cookies</a>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} {businessName()}. Información de clima y
          riego con fines orientativos. Zonas de trabajo: Altiplano y Costa
          Tropical de Granada.
        </div>
      </div>
    </footer>
  );
}
