import Image from 'next/image';
import { businessName } from '@/lib/wa';

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <a className="brand" href="/#inicio" aria-label={`${businessName()} — inicio`}>
          <Image
            className="brand-logo"
            src="/brand-mark.png"
            alt=""
            width={40}
            height={40}
          />
          <span>
            <span className="brand-name">{businessName()}</span>
            <span className="brand-tag">Clima y riego para tu finca</span>
          </span>
        </a>
        <nav className="nav" aria-label="Principal">
          <a className="nav-link" href="/#consulta">
            Consulta
          </a>
          <a className="nav-link" href="/#servicios">
            Servicios
          </a>
          <a className="nav-link" href="/#contacto">
            Contacto
          </a>
        </nav>
      </div>
    </header>
  );
}
