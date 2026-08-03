import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';
import AdminIcon, { type AdminIconName } from './AdminIcon';
import './AdminDashboard.css';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type NavigationItem = {
  label: string;
  icon: AdminIconName;
  path: string;
  end?: boolean;
};

type AdminLayoutData = {
  admin: {
    id: string;
    email: string;
    role: 'admin';
    fullName: string;
  };
  shop: {
    name: string | null;
  };
  counters: {
    pendingAppointments: number;
    unreadNotifications: number;
  };
};

type AdminLayoutResponse = {
  success: boolean;
  message?: string;
  data?: AdminLayoutData;
};

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/administrator', end: true },
  { label: 'Revenue', icon: 'revenue', path: '/administrator/revenue' },
  { label: 'Users', icon: 'customers', path: '/administrator/users' },
  { label: 'Barbers', icon: 'barbers', path: '/administrator/barbers' },
  { label: 'Appointments', icon: 'appointments', path: '/administrator/appointments' },
  { label: 'Payments', icon: 'payments', path: '/administrator/payments' },
  { label: 'Services', icon: 'services', path: '/administrator/services' },
  { label: 'Schedules', icon: 'calendar', path: '/administrator/schedules' },
  { label: 'Reports', icon: 'reports', path: '/administrator/reports' },
];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return 'AD';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [layoutData, setLayoutData] = useState<AdminLayoutData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLayoutData() {
      try {
        const response = await fetch(`${API_BASE_URL}/administrator/profile`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as AdminLayoutResponse;

        if (response.status === 401) return navigate('/login', { replace: true });
        if (response.status === 403) return navigate('/', { replace: true });

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load administrator data.');
        }

        setLayoutData(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Load administrator layout failed:', error);
      }
    }

    void loadLayoutData();
    return () => controller.abort();
  }, [navigate]);

  const adminName = user?.fullName.trim() || user?.email.split('@')[0] || 'Administrator';
  const shopName = layoutData?.shop.name?.trim() || 'Barbershop';
  const pendingAppointments = layoutData?.counters.pendingAppointments ?? 0;
  const unreadNotifications = layoutData?.counters.unreadNotifications ?? 0;

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${isSidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <NavLink className="admin-brand" to="/administrator" onClick={closeSidebar}>
          <img src="/images/logo.png" alt={`${shopName} logo`} />
          <div>
            <strong>{shopName}</strong>
            <span>ADMINISTRATION</span>
            <small>MANAGEMENT PORTAL</small>
          </div>
        </NavLink>

        <div className="admin-sidebar__label">MANAGEMENT</div>

        <nav className="admin-navigation" aria-label="Administrator navigation">
          {navigationItems.map((item) => {
            const badge = item.path === '/administrator/appointments' ? pendingAppointments : 0;

            return (
              <NavLink
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                end={item.end}
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
              >
                <AdminIcon name={item.icon} />
                <span>{item.label}</span>
                {badge > 0 && <b>{badge}</b>}
              </NavLink>
            );
          })}
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
            <button
              aria-label={`${unreadNotifications} unread notifications`}
              className="admin-notification-button"
              type="button"
            >
              <AdminIcon name="bell" />
              {unreadNotifications > 0 && <span />}
            </button>

            <div className="admin-profile">
              <div className="admin-avatar">{getInitials(adminName)}</div>
              <div className="admin-profile__copy">
                <strong>{adminName}</strong>
                <span>Administrator</span>
              </div>
              <AdminIcon name="chevronDown" size={17} />
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />

          <footer className="admin-footer">
            <span>© {new Date().getFullYear()} {shopName}. Administrator portal.</span>
            <span>{user?.email ?? ''}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}