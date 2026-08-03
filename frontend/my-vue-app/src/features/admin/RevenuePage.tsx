import { useEffect, useState } from 'react';

import AdminIcon from './AdminIcon';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
] as const;

const DONUT_COLORS = [
  'var(--admin-gold)',
  'var(--admin-green)',
  'var(--admin-blue)',
  'var(--admin-purple)',
];

const DOT_CLASSES = ['is-gold', 'is-green', 'is-blue', 'is-purple'];

type RevenuePeriod = (typeof PERIOD_OPTIONS)[number]['value'];
type RevenueMetric = { value: number; growth: number };

type RevenueData = {
  period: RevenuePeriod;
  currency: string;
  metrics: {
    grossRevenue: RevenueMetric;
    netRevenue: RevenueMetric;
    refunded: RevenueMetric;
    averageOrder: RevenueMetric;
  };
  trend: {
    label: string;
    current: number;
    previous: number;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  services: {
    name: string;
    amount: number;
    percentage: number;
  }[];
  barbers: {
    id: string;
    name: string;
    isActive: boolean;
    bookings: number;
    revenue: number;
    growth: number;
  }[];
};

type RevenueResponse = {
  success: boolean;
  message?: string;
  data?: RevenueData;
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatCompactCurrency(value: number, currency: string) {
  const compactValue = new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

  return currency === 'VND' ? `₫${compactValue}` : `${compactValue} ${currency}`;
}

function formatGrowth(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getDonutBackground(methods: RevenueData['paymentMethods']) {
  const total = methods.reduce((sum, item) => sum + item.amount, 0);
  if (!total) return '#eee9e1';

  let cursor = 0;

  const segments = methods.map((item, index) => {
    const start = cursor;
    cursor = index === methods.length - 1
      ? 100
      : cursor + (item.amount / total) * 100;

    return `${DONUT_COLORS[index]} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

export default function RevenuePage() {
  const [period, setPeriod] = useState<RevenuePeriod>('month');
  const [data, setData] = useState<RevenueData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    setData(null);
    setError('');

    async function loadRevenue() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/administrator/revenue?period=${period}`,
          {
            credentials: 'include',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as RevenueResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load revenue data.');
        }

        setData(payload.data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load revenue data.',
        );
      }
    }

    void loadRevenue();
    return () => controller.abort();
  }, [period]);

  const metrics = data
    ? [
        { label: 'Gross revenue', metric: data.metrics.grossRevenue, tone: 'gold' },
        { label: 'Net revenue', metric: data.metrics.netRevenue, tone: 'green' },
        { label: 'Refunded', metric: data.metrics.refunded, tone: 'red' },
        { label: 'Average order', metric: data.metrics.averageOrder, tone: 'blue' },
      ]
    : [];

  const maxTrend = data
    ? Math.max(1, ...data.trend.flatMap((item) => [item.current, item.previous]))
    : 1;

  const maxServiceRevenue = data
    ? Math.max(1, ...data.services.map((service) => service.amount))
    : 1;

  return (
    <>
      <AdminPageHeader
        eyebrow="FINANCIAL MANAGEMENT"
        title="Revenue analytics"
        description="Track gross revenue, refunds, net revenue, and average order value."
        actions={
          <>
            <label className="admin-period-select">
              <AdminIcon name="calendar" size={18} />

              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as RevenuePeriod)}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <AdminIcon name="chevronDown" size={15} />
            </label>

            <button className="admin-primary-button" type="button">
              Export report
            </button>
          </>
        }
      />

      {error && (
        <section className="admin-panel admin-module-panel">
          <strong>{error}</strong>
        </section>
      )}

      {!data && !error && (
        <section className="admin-panel admin-module-panel">
          <span>Loading revenue data...</span>
        </section>
      )}

      {data && (
        <>
          <section className="admin-module-metrics admin-module-metrics--four">
            {metrics.map(({ label, metric, tone }) => (
              <article className={`admin-module-metric is-${tone}`} key={label}>
                <span>{label}</span>
                <strong>{formatCurrency(metric.value, data.currency)}</strong>
                <em>{formatGrowth(metric.growth)} from previous period</em>
              </article>
            ))}
          </section>

          <section className="admin-module-grid admin-module-grid--revenue">
            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>REVENUE TREND</p>
                  <h2>Period performance</h2>
                </div>

                <div className="admin-chart-legend">
                  <span><i className="is-current" />Current period</span>
                  <span><i className="is-previous" />Previous period</span>
                </div>
              </header>

              <div
                className="admin-bar-chart"
                aria-label="Revenue trend"
                style={{
                  gridTemplateColumns: `repeat(${data.trend.length}, minmax(28px, 1fr))`,
                }}
              >
                {data.trend.map((item) => (
                  <div className="admin-bar-chart__column" key={item.label}>
                    <div className="admin-bar-chart__bars">
                      <i
                        style={{
                          height: `${(item.previous / maxTrend) * 100}%`,
                          opacity: item.previous ? 1 : 0,
                        }}
                      />

                      <b
                        style={{
                          height: `${(item.current / maxTrend) * 100}%`,
                          opacity: item.current ? 1 : 0,
                        }}
                      />
                    </div>

                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>PAYMENT MIX</p>
                  <h2>By payment method</h2>
                </div>
              </header>

              <div
                className="admin-payment-donut"
                style={{ background: getDonutBackground(data.paymentMethods) }}
              >
                <div>
                  <strong>
                    {formatCompactCurrency(
                      data.metrics.grossRevenue.value,
                      data.currency,
                    )}
                  </strong>
                  <span>Total</span>
                </div>
              </div>

              <div className="admin-breakdown-list">
                {data.paymentMethods.length ? (
                  data.paymentMethods.map((item, index) => (
                    <div key={item.method}>
                      <span>
                        <i className={DOT_CLASSES[index]} />
                        {item.method}
                      </span>
                      <strong>{item.percentage.toFixed(1)}%</strong>
                    </div>
                  ))
                ) : (
                  <span>No paid transactions in this period.</span>
                )}
              </div>
            </article>
          </section>

          <section className="admin-module-grid admin-module-grid--equal">
            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>SERVICE CONTRIBUTION</p>
                  <h2>Revenue by service</h2>
                </div>
              </header>

              <div className="admin-ranked-list">
                {data.services.length ? (
                  data.services.map((service, index) => (
                    <div className="admin-ranked-list__item" key={service.name}>
                      <span className="admin-ranked-list__number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div>
                        <strong>{service.name}</strong>
                        <span>
                          <i
                            style={{
                              width: `${(service.amount / maxServiceRevenue) * 100}%`,
                            }}
                          />
                        </span>
                      </div>

                      <div>
                        <strong>{formatCurrency(service.amount, data.currency)}</strong>
                        <em>{service.percentage.toFixed(1)}%</em>
                      </div>
                    </div>
                  ))
                ) : (
                  <span>No service revenue in this period.</span>
                )}
              </div>
            </article>

            <article className="admin-panel admin-table-panel">
              <header className="admin-panel__header admin-panel__header--table">
                <div>
                  <p>BARBER PERFORMANCE</p>
                  <h2>Revenue leaderboard</h2>
                </div>
              </header>

              <div className="admin-table-scroll">
                <table className="admin-table admin-module-table">
                  <thead>
                    <tr>
                      <th>Barber</th>
                      <th>Bookings</th>
                      <th>Revenue</th>
                      <th>Growth</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.barbers.length ? (
                      data.barbers.map((barber) => (
                        <tr key={barber.id}>
                          <td>
                            <div className="admin-customer-cell">
                              <span>{getInitials(barber.name)}</span>

                              <div>
                                <strong>{barber.name}</strong>
                                <small>
                                  {barber.isActive
                                    ? 'Active barber'
                                    : 'Inactive barber'}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>{barber.bookings}</td>

                          <td className="admin-amount-cell">
                            {formatCurrency(barber.revenue, data.currency)}
                          </td>

                          <td>
                            <span
                              className={
                                barber.growth >= 0
                                  ? 'admin-positive-text'
                                  : undefined
                              }
                            >
                              {formatGrowth(barber.growth)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>No barber revenue in this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}