import { useState } from 'react';

import './SiteHeader.css';

type SiteHeaderProps = {
  currentPage?: 'home' | 'services';
  brandName?: string;
};

export default function SiteHeader({
  currentPage = 'home',
  brandName,
}: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHomePage = currentPage === 'home';

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="site-header">
      <a
        className="site-brand"
        href={isHomePage ? '#top' : '/'}
        aria-label={`${brandName ?? 'Barbershop'} home`}
        onClick={closeMenu}
      >
        <img src="/images/logo.png" alt={brandName ?? 'Barbershop'} />
        <span>
          {brandName ?? 'BARBERSHOP'}
          <small>PREMIUM GROOMING</small>
        </span>
      </a>

      <button
        className="menu-button"
        type="button"
        aria-expanded={isMenuOpen}
        aria-controls="site-navigation"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
        <span className="sr-only">Toggle navigation</span>
      </button>

      <nav
        id="site-navigation"
        className={isMenuOpen ? 'site-nav is-open' : 'site-nav'}
      >
        <a href={isHomePage ? '#top' : '/'} onClick={closeMenu}>
          Home
        </a>
        <a
          className={currentPage === 'services' ? 'is-active' : undefined}
          href="/services"
          onClick={closeMenu}
        >
          Services
        </a>
        <a href={isHomePage ? '#barbers' : '/#barbers'} onClick={closeMenu}>
          Barbers
        </a>
        <a href={isHomePage ? '#gallery' : '/#gallery'} onClick={closeMenu}>
          Gallery
        </a>
        <a href={isHomePage ? '#visit' : '/#visit'} onClick={closeMenu}>
          Visit us
        </a>
      </nav>

      <div className="header-actions">
        <a className="sign-in-link" href="/login">
          Sign in
        </a>
        <a
          className="button button--gold button--small"
          href={isHomePage ? '#booking' : '/#booking'}
        >
          Book now
        </a>
      </div>
    </header>
  );
}
