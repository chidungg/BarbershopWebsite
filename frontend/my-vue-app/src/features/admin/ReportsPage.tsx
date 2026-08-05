import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminIcon, { type AdminIconName } from './AdminIcon';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
] as const;

type ReportPeriod = (typeof PERIOD_OPTIONS)[number]['value'];

type ReportsData = {
  period: ReportPeriod;
  currency: string;
  timeZone: string;
  generatedAt: string;

  range: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };

  summary: {
    netRevenue: number;
    revenueGrowth: number;
    appointments: number;
    completedAppointments: number;
    newCustomers: number;
    customerGrowth: number;
    paymentSuccessRate: number;
    failedPayments: number;
    topBarber: { id: string; name: string; bookings: number; revenue: number } | null;
    topService: { id: string; name: string; bookings: number } | null;
  };

  kpis: {
    revenueGrowth: number;
    currentRevenue: number;
    previousRevenue: number;
    repeatBookingRate: number;
    repeatCustomers: number;
    completionRate: number;
    paymentSuccessRate: number;
    averageAppointmentValue: number;
    previousAverageAppointmentValue: number;
    averageAppointmentGrowth: number;
    cancellationRate: number;
    cancelledAppointments: number;
  };

  scope: {
    appointmentsAnalyzed: number;
    previousAppointmentsAnalyzed: number;
    paymentAttempts: number;
    paidTransactions: number;
    serviceLines: number;
    newCustomers: number;
  };
};

type ReportsResponse = {
  success: boolean;
  message?: string;
  data?: ReportsData;
};

type ReportCard = {
  title: string;
  description: string;
  icon: AdminIconName;
  value: string;
  detail: string;
  path: string;
};

type KpiRow = {
  label: string;
  value: string;
  note: string;
  progress: number;
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

function formatPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatDateTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

function formatRange(start: string, end: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function comparisonProgress(current: number, previous: number) {
  const maximum = Math.max(current, previous);
  return maximum ? clamp((current / maximum) * 100) : 0;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setError('');

      try {
        const response = await fetch(
          `${API_BASE_URL}/administrator/reports?period=${period}`,
          {
            credentials: 'include',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as ReportsResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load reports.');
        }

        setData(payload.data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load reports.',
        );
      }
    }

    void loadReports();
    return () => controller.abort();
  }, [period]);

  const cards: ReportCard[] = data ? [
    {
      title: 'Revenue report',
      description: 'Net revenue after refunds for the selected period.',
      icon: 'revenue',
      value: formatCurrency(data.summary.netRevenue, data.currency),
      detail: `${formatPercent(data.summary.revenueGrowth)} vs previous period`,
      path: '/administrator/revenue',
    },
    {
      title: 'Appointment report',
      description: 'Booking volume and completed appointments.',
      icon: 'appointments',
      value: data.summary.appointments.toLocaleString('en-US'),
      detail: `${data.summary.completedAppointments} completed`,
      path: '/administrator/appointments',
    },
    {
      title: 'Barber performance',
      description: 'Top barber based on net revenue and bookings.',
      icon: 'barbers',
      value: data.summary.topBarber?.name ?? 'No data',
      detail: data.summary.topBarber
        ? `${formatCurrency(data.summary.topBarber.revenue, data.currency)} · ${data.summary.topBarber.bookings} bookings`
        : 'No paid barber activity',
      path: '/administrator/barbers',
    },
    {
      title: 'Customer growth',
      description: 'New customer accounts created in the selected period.',
      icon: 'customers',
      value: data.summary.newCustomers.toLocaleString('en-US'),
      detail: `${formatPercent(data.summary.customerGrowth)} vs previous period`,
      path: '/administrator/users',
    },
    {
      title: 'Service popularity',
      description: 'Most frequently booked service by quantity.',
      icon: 'services',
      value: data.summary.topService?.name ?? 'No data',
      detail: `${data.summary.topService?.bookings ?? 0} bookings`,
      path: '/administrator/services',
    },
    {
      title: 'Payment performance',
      description: 'Payment success rate and failed transactions.',
      icon: 'payments',
      value: `${data.summary.paymentSuccessRate.toFixed(1)}%`,
      detail: `${data.summary.failedPayments} failed or cancelled`,
      path: '/administrator/payments',
    },
  ] : [];

  const kpis: KpiRow[] = data ? [
    {
      label: 'Revenue growth',
      value: formatPercent(data.kpis.revenueGrowth),
      note: 'Net revenue compared with the previous period',
      progress: comparisonProgress(data.kpis.currentRevenue, data.kpis.previousRevenue),
    },
    {
      label: 'Repeat booking rate',
      value: `${data.kpis.repeatBookingRate.toFixed(1)}%`,
      note: `${data.kpis.repeatCustomers} customers booked at least twice`,
      progress: data.kpis.repeatBookingRate,
    },
    {
      label: 'Appointment completion',
      value: `${data.kpis.completionRate.toFixed(1)}%`,
      note: 'Completed appointments in the selected period',
      progress: data.kpis.completionRate,
    },
    {
      label: 'Payment success rate',
      value: `${data.kpis.paymentSuccessRate.toFixed(1)}%`,
      note: 'Paid, refunded, and partially refunded payments',
      progress: data.kpis.paymentSuccessRate,
    },
    {
      label: 'Average appointment value',
      value: formatCurrency(data.kpis.averageAppointmentValue, data.currency),
      note: `${formatPercent(data.kpis.averageAppointmentGrowth)} vs previous period`,
      progress: comparisonProgress(
        data.kpis.averageAppointmentValue,
        data.kpis.previousAverageAppointmentValue,
      ),
    },
    {
      label: 'Cancellation rate',
      value: `${data.kpis.cancellationRate.toFixed(1)}%`,
      note: `${data.kpis.cancelledAppointments} cancelled appointments`,
      progress: data.kpis.cancellationRate,
    },
  ] : [];

  return (
    <>
      <AdminPageHeader
        eyebrow="BUSINESS INTELLIGENCE"
        title="Reports"
        description="Review consolidated financial, customer, booking, service, and payment performance."
        actions={
          <select
            className="admin-inline-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />

      {error && (
        <section className="admin-panel admin-module-panel">
          <strong>{error}</strong>
        </section>
      )}

      {!data && !error && (
        <section className="admin-panel admin-module-panel">
          <span>Loading reports...</span>
        </section>
      )}

      {data && !error && (
        <>
          <section className="admin-report-card-grid">
            {cards.map((report) => (
              <article className="admin-panel admin-report-card" key={report.title}>
                <div className="admin-report-card__icon">
                  <AdminIcon name={report.icon} size={24} />
                </div>

                <h2>{report.title}</h2>
                <p>{report.description}</p>
                <strong className="admin-report-card__value">{report.value}</strong>
                <span>{report.detail}</span>

                <div className="admin-card-actions">
                  <button type="button" onClick={() => navigate(report.path)}>
                    View report
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="admin-module-grid admin-module-grid--reports">
            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>KEY PERFORMANCE INDICATORS</p>
                  <h2>Business health</h2>
                </div>
              </header>

              <div className="admin-kpi-list">
                {kpis.map((kpi) => (
                  <div className="admin-kpi-row" key={kpi.label}>
                    <div>
                      <strong>{kpi.label}</strong>
                      <span>{kpi.note}</span>
                    </div>

                    <span>
                      <i style={{ width: `${clamp(kpi.progress)}%` }} />
                    </span>

                    <strong>{kpi.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>REPORT SCOPE</p>
                  <h2>Data included</h2>
                </div>
              </header>

              <div className="admin-opening-hours">
                <div>
                  <span>Current period</span>
                  <strong>{formatRange(data.range.currentStart, data.range.currentEnd, data.timeZone)}</strong>
                </div>

                <div>
                  <span>Previous comparison</span>
                  <strong>{formatRange(data.range.previousStart, data.range.previousEnd, data.timeZone)}</strong>
                </div>

                <div>
                  <span>Appointments analyzed</span>
                  <strong>{data.scope.appointmentsAnalyzed.toLocaleString('en-US')}</strong>
                </div>

                <div>
                  <span>Payment attempts</span>
                  <strong>{data.scope.paymentAttempts.toLocaleString('en-US')}</strong>
                </div>

                <div>
                  <span>Paid transactions</span>
                  <strong>{data.scope.paidTransactions.toLocaleString('en-US')}</strong>
                </div>

                <div>
                  <span>Service lines</span>
                  <strong>{data.scope.serviceLines.toLocaleString('en-US')}</strong>
                </div>

                <div>
                  <span>New customers</span>
                  <strong>{data.scope.newCustomers.toLocaleString('en-US')}</strong>
                </div>

                <div>
                  <span>Generated</span>
                  <strong>{formatDateTime(data.generatedAt, data.timeZone)}</strong>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}