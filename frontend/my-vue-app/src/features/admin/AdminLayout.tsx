import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import AdminIcon, { type AdminIconName } from './AdminIcon';
import './AdminDashboard.css';
import './AdminPages.css';

type NavigationItem = {
  label: string;
  icon: AdminIconName;
  path: string;
  end?: boolean;
  badge?: string;
};

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/administrator', end: true },
  { label: 'Revenue', icon: 'revenue', path: '/administrator/revenue' },
  { label: 'Users', icon: 'customers', path: '/administrator/users' },
  { label: 'Barbers', icon: 'barbers', path: '/administrator/barbers' },
  {
    label: 'Appointments',
    icon: 'appointments',
    path: '/administrator/appointments',
    badge: '12',
  },
  { label: 'Payments', icon: 'payments', path: '/administrator/payments' },
  { label: 'Services', icon: 'services', path: '/administrator/services' },
  { label: 'Schedules', icon: 'calendar', path: '/administrator/schedules' },
  { label: 'Reports', icon: 'reports', path: '/administrator/reports' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

  async function handleLogout() {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="admin-dashboard">
      <aside
        className={`admin-sidebar ${isSidebarOpen ? 'admin-sidebar--open' : ''}`}
      >
        <NavLink className="admin-brand" to="/administrator" onClick={closeSidebar}>
          <img src="/images/logo.png" alt="Gentleman's Barbershop logo" />
          <div>
            <strong>GENTLEMAN&apos;S</strong>
            <span>BARBERSHOP</span>
            <small>PREMIUM GROOMING</small>
          </div>
        </NavLink>

        <div className="admin-sidebar__label">MANAGEMENT</div>

        <nav className="admin-navigation" aria-label="Administrator navigation">
          {navigationItems.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              end={item.end}
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
            >
              <AdminIcon name={item.icon} />
              <span>{item.label}</span>
              {item.badge && <b>{item.badge}</b>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <NavLink
            className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            to="/administrator/settings"
            onClick={closeSidebar}
          >
            <AdminIcon name="settings" />
            <span>Settings</span>
          </NavLink>

          <button className="admin-logout" type="button" onClick={handleLogout}>
            <AdminIcon name="logout" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="admin-sidebar-backdrop"
          type="button"
          onClick={closeSidebar}
        />
      )}

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              aria-label="Open navigation"
              className="admin-menu-button"
              type="button"
              onClick={() => setIsSidebarOpen(true)}
            >
              <AdminIcon name="menu" size={22} />
            </button>

            <label className="admin-search">
              <AdminIcon name="search" />
              <input
                aria-label="Search administrator pages"
                placeholder="Search users, bookings, payments..."
                type="search"
              />
              <kbd>⌘ K</kbd>
            </label>
          </div>

          <div className="admin-topbar__actions">
            <button className="admin-notification-button" type="button">
              <AdminIcon name="bell" />
              <span />
            </button>

            <div className="admin-profile">
              <div className="admin-avatar">AD</div>
              <div className="admin-profile__copy">
                <strong>Alex Morgan</strong>
                <span>Administrator</span>
              </div>
              <AdminIcon name="chevronDown" size={17} />
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />

          <footer className="admin-footer">
            <span>© 2026 Gentleman&apos;s Barbershop. Administrator portal.</span>
            <span>Hardcoded interface preview</span>
          </footer>
        </main>
      </div>
    </div>
  );
}