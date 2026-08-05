import { useEffect, useState } from 'react';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const PAGE_SIZE = 10;

type AppointmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type StatusFilter = 'all' | AppointmentStatus;
type ViewMode = 'table' | 'calendar';
type BarberOption = { id: string; name: string; avatarUrl: string | null; isActive: boolean };

type AppointmentItem = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAvatarUrl: string | null;
  barberId: string;
  barberName: string;
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  source: string;
  services: string[];
  amount: number;
  currency: string;
  paymentStatus: string;
};

type AppointmentsData = {
  date: string;
  timeZone: string;
  slotMinutes: number;
  statuses: AppointmentStatus[];
  metrics: {
    total: number;
    remaining: number;
    pending: number;
    completed: number;
    completedPercentage: number;
    cancelled: number;
    cancelledPercentage: number;
  };
  barbers: BarberOption[];
  items: AppointmentItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  calendar: {
    barbers: { id: string; name: string }[];
    slots: string[];
    appointments: AppointmentItem[];
  };
};

type AppointmentsResponse = {
  success: boolean;
  message?: string;
  data?: AppointmentsData;
};

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getSlotKey(time: string, slotMinutes: number) {
  const [hour, minute] = time.split(':').map(Number);
  const total = Math.floor((hour * 60 + minute) / slotMinutes) * slotMinutes;

  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const count = Math.min(3, totalPages);
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - count + 1));

  return Array.from({ length: count }, (_, index) => start + index);
}

function CustomerAvatar({ appointment }: { appointment: AppointmentItem }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => setImageError(false), [appointment.customerAvatarUrl]);

  return (
    <span>
      {appointment.customerAvatarUrl && !imageError ? (
        <img
          src={appointment.customerAvatarUrl}
          alt={`${appointment.customerName} avatar`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : getInitials(appointment.customerName)}
    </span>
  );
}

export default function AppointmentsPage() {
  const [view, setView] = useState<ViewMode>('table');
  const [date, setDate] = useState(getToday);
  const [barberId, setBarberId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AppointmentsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadAppointments() {
      setError('');

      try {
        const params = new URLSearchParams({
          date,
          barberId,
          status,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        const response = await fetch(`${API_BASE_URL}/administrator/appointments?${params}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as AppointmentsResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load appointments.');
        }

        setData(payload.data);

        if (payload.data.pagination.page !== page) {
          setPage(payload.data.pagination.page);
        }
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load appointments.',
        );
      }
    }

    void loadAppointments();
    return () => controller.abort();
  }, [barberId, date, page, status]);

  const pagination = data?.pagination;
  const firstResult = pagination?.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastResult = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;
  const calendarColumns = data?.calendar.barbers.length ?? 0;
  const calendarGrid = `76px repeat(${calendarColumns}, minmax(170px, 1fr))`;

  return (
    <>
      <AdminPageHeader
        eyebrow="BOOKING MANAGEMENT"
        title="Appointments"
        description="Review daily bookings, payment status, assigned barbers, and appointment progress."
        actions={<button className="admin-primary-button" type="button">+ New appointment</button>}
      />

      {error && <section className="admin-panel admin-module-panel"><strong>{error}</strong></section>}
      {!data && !error && <section className="admin-panel admin-module-panel"><span>Loading appointments...</span></section>}

      {data && !error && (
        <>
          <section className="admin-module-metrics admin-module-metrics--four">
            <article className="admin-module-metric is-gold">
              <span>Appointments</span>
              <strong>{data.metrics.total}</strong>
              <em>{data.metrics.remaining} remaining</em>
            </article>

            <article className="admin-module-metric is-orange">
              <span>Pending</span>
              <strong>{data.metrics.pending}</strong>
              <em>Needs action</em>
            </article>

            <article className="admin-module-metric is-green">
              <span>Completed</span>
              <strong>{data.metrics.completed}</strong>
              <em>{data.metrics.completedPercentage.toFixed(1)}% of selected date</em>
            </article>

            <article className="admin-module-metric is-red">
              <span>Cancelled</span>
              <strong>{data.metrics.cancelled}</strong>
              <em>{data.metrics.cancelledPercentage.toFixed(1)}% of selected date</em>
            </article>
          </section>

          <section className="admin-panel admin-management-panel">
            <div className="admin-toolbar">
              <div className="admin-view-switcher">
                <button className={view === 'table' ? 'is-active' : undefined} type="button" onClick={() => setView('table')}>Table</button>
                <button className={view === 'calendar' ? 'is-active' : undefined} type="button" onClick={() => setView('calendar')}>Calendar</button>
              </div>

              <div className="admin-toolbar__filters">
                <input
                  value={date}
                  type="date"
                  onChange={(event) => {
                    setDate(event.target.value);
                    setPage(1);
                  }}
                />

                <select
                  value={barberId}
                  onChange={(event) => {
                    setBarberId(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All barbers</option>

                  {data.barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}{barber.isActive ? '' : ' (Inactive)'}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All statuses</option>
                  {data.statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
                </select>
              </div>
            </div>

            {view === 'table' ? (
              <>
                <div className="admin-table-scroll">
                  <table className="admin-table admin-module-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Barber</th>
                        <th>Date & time</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.items.length ? data.items.map((appointment) => (
                        <tr key={appointment.id}>
                          <td>
                            <div className="admin-customer-cell">
                              <CustomerAvatar appointment={appointment} />

                              <div>
                                <strong>{appointment.customerName}</strong>
                                <small>#{appointment.bookingCode}</small>
                              </div>
                            </div>
                          </td>

                          <td>{appointment.services.length ? appointment.services.join(', ') : 'No service'}</td>
                          <td>{appointment.barberName}</td>

                          <td>
                            <div className="admin-date-cell">
                              <strong>{formatDate(appointment.startAt, data.timeZone)}</strong>
                              <span>{appointment.startTime}–{appointment.endTime}</span>
                            </div>
                          </td>

                          <td className="admin-amount-cell">
                            {formatCurrency(appointment.amount, appointment.currency)}
                          </td>

                          <td>
                            <span className={`admin-status-badge is-${appointment.paymentStatus.replace(/_/g, '-')}`}>
                              {formatLabel(appointment.paymentStatus)}
                            </span>
                          </td>

                          <td>
                            <span className={`admin-status-badge is-${appointment.status.replace(/_/g, '-')}`}>
                              {formatLabel(appointment.status)}
                            </span>
                          </td>

                          <td>
                            <div className="admin-row-actions">
                              <button type="button">View</button>
                              <button type="button">Edit</button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8}>No appointments match the selected filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-pagination">
                  <span>Showing {firstResult}–{lastResult} of {pagination?.total ?? 0} appointments</span>

                  <div>
                    <button
                      type="button"
                      disabled={!pagination || pagination.page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      ←
                    </button>

                    {pagination && getPageNumbers(pagination.page, pagination.totalPages).map((pageNumber) => (
                      <button
                        className={pageNumber === pagination.page ? 'is-active' : undefined}
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={!pagination || pagination.page >= pagination.totalPages}
                      onClick={() => setPage((current) => Math.min(pagination?.totalPages ?? current, current + 1))}
                    >
                      →
                    </button>
                  </div>
                </div>
              </>
            ) : data.calendar.slots.length && data.calendar.barbers.length ? (
              <div className="admin-table-scroll">
                <div
                  className="admin-calendar-preview"
                  style={{ minWidth: Math.max(900, 76 + calendarColumns * 170) }}
                >
                  <div
                    className="admin-calendar-preview__header"
                    style={{ gridTemplateColumns: calendarGrid }}
                  >
                    <span>Time</span>
                    {data.calendar.barbers.map((barber) => <strong key={barber.id}>{barber.name}</strong>)}
                  </div>

                  {data.calendar.slots.map((slot) => (
                    <div
                      className="admin-calendar-preview__row"
                      key={slot}
                      style={{ gridTemplateColumns: calendarGrid }}
                    >
                      <span>{slot}</span>

                      {data.calendar.barbers.map((barber) => {
                        const appointments = data.calendar.appointments.filter((appointment) => {
                          return appointment.barberId === barber.id
                            && getSlotKey(appointment.startTime, data.slotMinutes) === slot;
                        });

                        return (
                          <div key={barber.id}>
                            {appointments.map((appointment) => (
                              <b
                                className={`is-${appointment.status.replace(/_/g, '-')}`}
                                key={appointment.id}
                              >
                                {appointment.services[0] ?? 'Appointment'}
                                <small>{appointment.customerName} · {appointment.startTime}–{appointment.endTime}</small>
                              </b>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="admin-calendar-preview__empty">
                No appointments are available for the selected calendar filters.
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}