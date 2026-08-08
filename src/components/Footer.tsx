import { businessName } from '@/lib/wa';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <strong>{businessName()}</strong> — Tecnología al servicio del campo
          </div>
          <div>
            <a href="#servicios">Servicios</a> ·{' '}
            <a href="#contacto">Contacto</a> ·{' '}
            <a href="/admin">Área privada</a>
          </div>
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
