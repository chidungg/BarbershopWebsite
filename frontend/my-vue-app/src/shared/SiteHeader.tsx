import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from './AuthContext';
import ProfileIcon from './ProfileIcon';
import './SiteHeader.css';

type SiteHeaderProps = {
  currentPage?: 'home' | 'services' | 'barbers' | 'profile';
  brandName?: string;
};

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0];
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function SiteHeader({
  currentPage = 'home',
  brandName,
}: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();
  const isHomePage = currentPage === 'home';

  useEffect(() => {
    function closeAccount(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeAccount);
    return () => document.removeEventListener('pointerdown', closeAccount);
  }, []);

  function closeMenus() {
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  }

  async function handleLogout() {
    setIsSigningOut(true);
    try {
      await logout();
      closeMenus();
      navigate('/', { replace: true });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Unable to sign out.',
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  const accountDestination =
    user?.role === 'admin'
      ? '/administrator'
      : user?.role === 'user'
        ? '/profile'
        : '/';
  const accountLabel =
    user?.role === 'admin'
      ? 'Administrator dashboard'
      : user?.role === 'user'
        ? 'My profile'
        : 'Account home';

  return (
    <header
      className={`site-header ${currentPage === 'profile' ? 'site-header--solid' : ''}`}
    >
      <a
        className="site-brand"
        href={isHomePage ? '#top' : '/'}
        aria-label={`${brandName ?? 'Barbershop'} home`}
        onClick={closeMenus}
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
        <a href={isHomePage ? '#top' : '/'} onClick={closeMenus}>
          Home
        </a>
        <a
          className={currentPage === 'services' ? 'is-active' : undefined}
          href="/services"
          onClick={closeMenus}
        >
          Services
        </a>
        <a
          className={currentPage === 'barbers' ? 'is-active' : undefined}
          href="/barbers"
          onClick={closeMenus}
        >
          Barbers
        </a>
        <a href={isHomePage ? '#gallery' : '/#gallery'} onClick={closeMenus}>
          Gallery
        </a>
        <a href={isHomePage ? '#visit' : '/#visit'} onClick={closeMenus}>
          Visit us
        </a>
        {user?.role === 'user' && (
          <Link
            className={`site-nav__mobile-account ${currentPage === 'profile' ? 'is-active' : ''}`}
            to="/profile"
            onClick={closeMenus}
          >
            My account
          </Link>
        )}
      </nav>

      <div className="header-actions">
        {status === 'loading' ? (
          <span
            className="header-account-placeholder"
            aria-label="Loading account"
          />
        ) : user ? (
          <div className="header-account" ref={accountRef}>
            <button
              className="header-account__trigger"
              type="button"
              aria-expanded={isAccountOpen}
              aria-controls="account-dropdown"
              onClick={() => setIsAccountOpen((current) => !current)}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="header-account__avatar">
                  {getInitials(user.fullName, user.email)}
                </span>
              )}
              <span className="header-account__name">
                {user.fullName || user.email.split('@')[0]}
              </span>
              <ProfileIcon name="chevron" />
            </button>

            <div
              id="account-dropdown"
              className={`dropdown-menu dropdown-menu-end ${isAccountOpen ? 'show' : ''}`}
            >
              <div className="header-account__identity">
                <strong>{user.fullName || 'Your account'}</strong>
                <span>{user.email}</span>
              </div>
              <Link
                className="dropdown-item"
                to={accountDestination}
                onClick={closeMenus}
              >
                <ProfileIcon name="user" />
                {accountLabel}
              </Link>
              {user.role === 'user' && (
                <Link
                  className="dropdown-item"
                  to="/profile?section=appointments"
                  onClick={closeMenus}
                >
                  <ProfileIcon name="appointments" />
                  My appointments
                </Link>
              )}
              <div className="dropdown-divider" />
              <button
                className="dropdown-item header-account__logout"
                type="button"
                disabled={isSigningOut}
                onClick={() => void handleLogout()}
              >
                <ProfileIcon name="logout" />
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        ) : (
          <Link className="sign-in-link" to="/login" onClick={closeMenus}>
            Sign in
          </Link>
        )}

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
