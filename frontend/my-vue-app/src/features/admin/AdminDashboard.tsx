import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';
import AdminIcon, { type AdminIconName } from './AdminIcon';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
] as const;

type DashboardPeriod = (typeof PERIOD_OPTIONS)[number]['value'];

type DashboardData = {
  period: DashboardPeriod;
  timeZone: string;
  currency: string;
  summary: {
    revenue: { value: number; growth: number };
    users: { value: number; growth: number; newCount: number };
    activeBarbers: { value: number; growth: number; newCount: number };
    appointmentsToday: { value: number; growth: number };
  };
  revenue: {
    value: number;
    growth: number;
    series: { label: string; value: number }[];
    previousSeries: { label: string; value: number }[];
  };
  appointmentStatuses: {
    total: number;
    items: { key: string; label: string; count: number; percentage: number }[];
  };
  recentAppointments: {
    id: string;
    bookingCode: string;
    customerName: string;
    customerAvatarUrl: string | null;
    barberName: string;
    services: string[];
    startAt: string;
    amount: number;
    currency: string;
    status: string;
  }[];
  topBarbers: {
    id: string;
    name: string;
    avatarUrl: string | null;
    experienceYears: number;
    rating: number;
    reviewCount: number;
    bookings: number;
    revenue: number;
  }[];
  insights: {
    successfulPayments: { amount: number; rate: number };
    newCustomers: { count: number; growth: number };
    averageRating: { value: number; reviews: number };
    completionRate: { value: number; completed: number };
  };
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  data?: DashboardData;
};

type StatCard = {
  title: string;
  value: string;
  change: number;
  comparison: string;
  icon: AdminIconName;
  tone: 'gold' | 'green' | 'blue' | 'purple';
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatCompactCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatGrowth(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getChartPoints(values: number[], maximum: number) {
  if (!values.length) return '';

  return values.map((value, index) => {
    const x = values.length === 1 ? 550 : (index / (values.length - 1)) * 1100;
    const y = 245 - (value / maximum) * 220;
    return `${x},${y}`;
  }).join(' ');
}

function getDonutBackground(items: DashboardData['appointmentStatuses']['items']) {
  const colors: Record<string, string> = {
    completed: 'var(--admin-green)',
    confirmed: 'var(--admin-blue)',
    pending: 'var(--admin-orange)',
    cancelled: 'var(--admin-red)',
  };

  let cursor = 0;

  const segments = items.map((item) => {
    const start = cursor;
    cursor += item.percentage;
    return `${colors[item.key] ?? '#aaa'} ${start}% ${cursor}%`;
  });

  return segments.length ? `conic-gradient(${segments.join(', ')})` : '#eee9e1';
}

function CustomerAvatar({ appointment }: { appointment: DashboardData['recentAppointments'][number] }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [appointment.customerAvatarUrl]);

  return (
    <span>
      {appointment.customerAvatarUrl && !failed
        ? <img src={appointment.customerAvatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : getInitials(appointment.customerName)}
    </span>
  );
}

function BarberAvatar({ barber }: { barber: DashboardData['topBarbers'][number] }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [barber.avatarUrl]);

  return (
    <span className="admin-barber-avatar">
      {barber.avatarUrl && !failed
        ? <img src={barber.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : getInitials(barber.name)}
    </span>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/administrator/dashboard?period=${period}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as DashboardResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load dashboard.');
        }

        setData(payload.data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard.');
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [period]);

  const adminName = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Administrator';

  const statCards: StatCard[] = data ? [
    {
      title: 'Total revenue',
      value: formatCurrency(data.summary.revenue.value, data.currency),
      change: data.summary.revenue.growth,
      comparison: 'vs. previous period',
      icon: 'revenue',
      tone: 'gold',
    },
    {
      title: 'Total users',
      value: data.summary.users.value.toLocaleString('en-US'),
      change: data.summary.users.growth,
      comparison: `${data.summary.users.newCount} new this period`,
      icon: 'customers',
      tone: 'blue',
    },
    {
      title: 'Active barbers',
      value: data.summary.activeBarbers.value.toLocaleString('en-US'),
      change: data.summary.activeBarbers.growth,
      comparison: `${data.summary.activeBarbers.newCount} new this period`,
      icon: 'barbers',
      tone: 'purple',
    },
    {
      title: 'Appointments today',
      value: data.summary.appointmentsToday.value.toLocaleString('en-US'),
      change: data.summary.appointmentsToday.growth,
      comparison: 'vs. yesterday',
      icon: 'appointments',
      tone: 'green',
    },
  ] : [];

  const chartMaximum = useMemo(() => {
    if (!data) return 1;

    return Math.max(
      1,
      ...data.revenue.series.map((item) => item.value),
      ...data.revenue.previousSeries.map((item) => item.value),
    );
  }, [data]);

  const currentPoints = data ? getChartPoints(data.revenue.series.map((item) => item.value), chartMaximum) : '';
  const previousPoints = data ? getChartPoints(data.revenue.previousSeries.map((item) => item.value), chartMaximum) : '';
  const areaPoints = currentPoints ? `0,260 ${currentPoints} 1100,260` : '';
  const axisMaximum = Math.ceil(chartMaximum / 1_000_000) * 1_000_000 || 1_000_000;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p>OVERVIEW</p>
          <h1>{getGreeting()}, {adminName}.</h1>
          <span>Here is what is happening at your barbershop today.</span>
        </div>

        <div className="admin-heading-actions">
          <label className="admin-period-select">
            <AdminIcon name="calendar" size={18} />

            <select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>
              {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <AdminIcon name="chevronDown" size={15} />
          </label>

          <Link className="admin-primary-button admin-button-link" to="/administrator/reports">
            View reports
          </Link>
        </div>
      </section>

      {error && <section className="admin-panel admin-module-panel"><strong>{error}</strong></section>}
      {!data && !error && <section className="admin-panel admin-module-panel"><span>Loading dashboard...</span></section>}

      {data && !error && (
        <>
          <section className="admin-stat-grid" aria-label="Business overview">
            {statCards.map((card) => {
              const direction = card.change >= 0 ? 'up' : 'down';

              return (
                <article className="admin-stat-card" key={card.title}>
                  <div className={`admin-stat-card__icon is-${card.tone}`}><AdminIcon name={card.icon} /></div>
                  <div className="admin-stat-card__menu"><AdminIcon name="more" size={19} /></div>

                  <p>{card.title}</p>
                  <strong>{card.value}</strong>

                  <div className={`admin-stat-card__trend is-${direction}`}>
                    <span>
                      <AdminIcon name={direction === 'up' ? 'trendUp' : 'trendDown'} size={14} />
                      {formatGrowth(card.change)}
                    </span>
                    {card.comparison}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="admin-dashboard-grid">
            <article className="admin-panel admin-revenue-panel">
              <header className="admin-panel__header">
                <div><p>REVENUE ANALYTICS</p><h2>Revenue performance</h2></div>
                <Link className="admin-text-button" to="/administrator/revenue">View details</Link>
              </header>

              <div className="admin-revenue-summary">
                <strong>{formatCurrency(data.revenue.value, data.currency)}</strong>
                <span className={data.revenue.growth < 0 ? 'is-negative' : undefined}>
                  <AdminIcon name={data.revenue.growth >= 0 ? 'trendUp' : 'trendDown'} size={14} />
                  {formatGrowth(data.revenue.growth)}
                </span>
              </div>

              <div className="admin-chart" aria-label="Revenue chart">
                <div className="admin-chart__axis">
                  {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                    <span key={ratio}>{formatCompactCurrency(axisMaximum * ratio, data.currency)}</span>
                  ))}
                </div>

                <div className="admin-chart__plot">
                  <div className="admin-chart__gridlines" aria-hidden="true"><span /><span /><span /><span /><span /></div>

                  <svg aria-hidden="true" className="admin-chart__line" preserveAspectRatio="none" viewBox="0 0 1100 260">
                    <defs>
                      <linearGradient id="dashboardRevenueArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#bb8c51" stopOpacity="0.27" />
                        <stop offset="100%" stopColor="#bb8c51" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {areaPoints && <polygon className="admin-chart__area" points={areaPoints} style={{ fill: 'url(#dashboardRevenueArea)' }} />}
                    {previousPoints && <polyline className="admin-chart__previous-line" points={previousPoints} />}
                    {currentPoints && <polyline className="admin-chart__current-line" points={currentPoints} />}
                  </svg>

                  <div
                    className="admin-chart__months"
                    style={{ gridTemplateColumns: `repeat(${Math.max(1, data.revenue.series.length)}, 1fr)` }}
                  >
                    {data.revenue.series.map((item) => <span key={item.label}>{item.label}</span>)}
                  </div>
                </div>
              </div>
            </article>

            <article className="admin-panel admin-appointments-summary">
              <header className="admin-panel__header">
                <div><p>APPOINTMENT STATUS</p><h2>Selected period</h2></div>
                <Link className="admin-text-button" to="/administrator/appointments">View all</Link>
              </header>

              <div className="admin-donut-wrap">
                <div
                  className="admin-donut"
                  style={{ background: getDonutBackground(data.appointmentStatuses.items) }}
                >
                  <div>
                    <strong>{data.appointmentStatuses.total}</strong>
                    <span>Total bookings</span>
                  </div>
                </div>
              </div>

              <div className="admin-status-list">
                {data.appointmentStatuses.items.map((item) => (
                  <div key={item.key}>
                    <span><i className={`is-${item.key}`} />{item.label}</span>
                    <strong>{item.count}</strong>
                    <em>{item.percentage.toFixed(1)}%</em>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="admin-lower-grid">
            <article className="admin-panel admin-table-panel">
              <header className="admin-panel__header admin-panel__header--table">
                <div><p>RECENT ACTIVITY</p><h2>Today&apos;s appointments</h2></div>
                <Link className="admin-text-button" to="/administrator/appointments">View all appointments <span>→</span></Link>
              </header>

              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr><th>Customer</th><th>Service</th><th>Barber</th><th>Date & time</th><th>Amount</th><th>Status</th></tr>
                  </thead>

                  <tbody>
                    {data.recentAppointments.length ? data.recentAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <div className="admin-customer-cell">
                            <CustomerAvatar appointment={appointment} />
                            <div><strong>{appointment.customerName}</strong><small>#{appointment.bookingCode}</small></div>
                          </div>
                        </td>

                        <td>{appointment.services.length ? appointment.services.join(', ') : 'No service'}</td>
                        <td>{appointment.barberName}</td>

                        <td>
                          <div className="admin-date-cell">
                            <strong>{formatDate(appointment.startAt, data.timeZone)}</strong>
                            <span>{formatTime(appointment.startAt, data.timeZone)}</span>
                          </div>
                        </td>

                        <td className="admin-amount-cell">{formatCurrency(appointment.amount, appointment.currency)}</td>

                        <td>
                          <span className={`admin-status-badge is-${appointment.status.replace(/_/g, '-')}`}>
                            {formatStatus(appointment.status)}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6}>No appointments today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="admin-panel admin-barber-panel">
              <header className="admin-panel__header">
                <div><p>PERFORMANCE</p><h2>Top barbers</h2></div>
                <Link className="admin-text-button" to="/administrator/barbers">View all</Link>
              </header>

              <div className="admin-barber-list">
                {data.topBarbers.length ? data.topBarbers.map((barber, index) => (
                  <div className="admin-barber-row" key={barber.id}>
                    <span className="admin-barber-rank">{String(index + 1).padStart(2, '0')}</span>
                    <BarberAvatar barber={barber} />

                    <div className="admin-barber-copy">
                      <strong>{barber.name}</strong>
                      <span>{barber.experienceYears ? `${barber.experienceYears} years experience` : 'New barber'}</span>
                    </div>

                    <div className="admin-barber-rating">
                      <AdminIcon name="star" size={14} />
                      <strong>{barber.rating.toFixed(1)}</strong>
                      <span>{barber.bookings} bookings</span>
                    </div>

                    <strong className="admin-barber-revenue">{formatCompactCurrency(barber.revenue, data.currency)}</strong>
                  </div>
                )) : <span>No barber performance data.</span>}
              </div>
            </article>
          </section>

          <section className="admin-quick-insights">
            <article>
              <div className="admin-quick-insights__icon"><AdminIcon name="payments" /></div>
              <div><span>Successful payments</span><strong>{formatCurrency(data.insights.successfulPayments.amount, data.currency)}</strong></div>
              <em>{data.insights.successfulPayments.rate.toFixed(1)}%</em>
            </article>

            <article>
              <div className="admin-quick-insights__icon"><AdminIcon name="customers" /></div>
              <div><span>New customers</span><strong>{data.insights.newCustomers.count}</strong></div>
              <em>{formatGrowth(data.insights.newCustomers.growth)}</em>
            </article>

            <article>
              <div className="admin-quick-insights__icon"><AdminIcon name="star" /></div>
              <div><span>Average rating</span><strong>{data.insights.averageRating.value.toFixed(1)} / 5</strong></div>
              <em>{data.insights.averageRating.reviews} reviews</em>
            </article>

            <article>
              <div className="admin-quick-insights__icon"><AdminIcon name="appointments" /></div>
              <div><span>Completion rate</span><strong>{data.insights.completionRate.value.toFixed(1)}%</strong></div>
              <em>{data.insights.completionRate.completed} completed</em>
            </article>
          </section>
        </>
      )}
    </>
  );
}