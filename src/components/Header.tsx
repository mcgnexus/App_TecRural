'use client';

import Image from 'next/image';
import { useState } from 'react';
import { businessName } from '@/lib/wa';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="main-navigation" className={`nav${menuOpen ? ' nav-open' : ''}`} aria-label="Principal">
          <a className="nav-link" href="/consulta" onClick={() => setMenuOpen(false)}>
            Consulta
          </a>
          <a className="nav-link" href="/servicios" onClick={() => setMenuOpen(false)}>
            Servicios
          </a>
          <a className="nav-link" href="/#contacto" onClick={() => setMenuOpen(false)}>
            Contacto
          </a>
        </nav>
      </div>
    </header>
  );
}
