import { useEffect, useState } from 'react';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type ScheduleDay = {
  date: string;
  type: 'work' | 'day_off' | 'leave';
  label: string;
  detail: string;
  note: string;
};

type ScheduleRow = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  experienceYears: number;
  days: ScheduleDay[];
};

type BarberOption = {
  id: string;
  name: string;
};

type LeaveRequest = {
  id: string;
  barberId: string;
  barberName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type DerivedHours = {
  date: string;
  hours: string;
  activeBarbers: number;
};

type SchedulesData = {
  weekStart: string;
  weekEnd: string;
  timeZone: string;

  metrics: {
    activeBarbers: number;
    scheduledShifts: number;
    scheduledHours: number;
    pendingLeaveRequests: number;
    scheduleConflicts: number;
  };

  barbers: BarberOption[];
  rows: ScheduleRow[];
  pendingLeaveRequests: LeaveRequest[];
  derivedShopHours: DerivedHours[];
};

type SchedulesResponse = {
  success: boolean;
  message?: string;
  data?: SchedulesData;
};

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function getWeekStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return addDays(value, -((date.getUTCDay() + 6) % 7));
}

function getToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatWeek(start: string, end: string) {
  const startLabel = formatDate(start, {
    day: '2-digit',
    month: 'short',
  });

  const endLabel = formatDate(end, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `${startLabel} – ${endLabel}`;
}

function formatLeaveRange(request: LeaveRequest, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  return `${formatter.format(new Date(request.startsAt))} – ${formatter.format(new Date(request.endsAt))}`;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function BarberAvatar({ row }: { row: ScheduleRow }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [row.avatarUrl]);

  return (
    <span>
      {row.avatarUrl && !imageError ? (
        <img
          src={row.avatarUrl}
          alt={`${row.displayName} avatar`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        getInitials(row.displayName)
      )}
    </span>
  );
}

export default function SchedulesPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(getToday()));
  const [barberId, setBarberId] = useState('');
  const [data, setData] = useState<SchedulesData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadSchedules() {
      setError('');

      try {
        const params = new URLSearchParams({
          weekStart,
          barberId,
        });

        const response = await fetch(
          `${API_BASE_URL}/administrator/schedules?${params}`,
          {
            credentials: 'include',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as SchedulesResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(
            payload.message ?? 'Unable to load schedules.',
          );
        }

        setData(payload.data);

        if (payload.data.weekStart !== weekStart) {
          setWeekStart(payload.data.weekStart);
        }
      } catch (requestError) {
        if (
          requestError instanceof DOMException
          && requestError.name === 'AbortError'
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load schedules.',
        );
      }
    }

    void loadSchedules();

    return () => controller.abort();
  }, [barberId, weekStart]);

  const metrics = data ? [
    {
      label: 'Active barbers',
      value: data.metrics.activeBarbers,
      detail: barberId ? 'Selected barber' : 'Current workforce',
      tone: 'gold',
    },
    {
      label: 'Scheduled shifts',
      value: data.metrics.scheduledShifts,
      detail: `${data.metrics.scheduledHours.toFixed(1)} scheduled hours`,
      tone: 'green',
    },
    {
      label: 'Leave requests',
      value: data.metrics.pendingLeaveRequests,
      detail: 'Needs review',
      tone: 'orange',
    },
    {
      label: 'Schedule conflicts',
      value: data.metrics.scheduleConflicts,
      detail: data.metrics.scheduleConflicts
        ? 'Needs action'
        : 'No overlaps found',
      tone: 'red',
    },
  ] : [];

  return (
    <>
      <AdminPageHeader
        eyebrow="WORKFORCE PLANNING"
        title="Barber schedules"
        description="Review weekly shifts, schedule exceptions, approved leave, and pending time-off requests."
        actions={
          <button className="admin-primary-button" type="button">
            + Create schedule
          </button>
        }
      />

      {error && (
        <section className="admin-panel admin-module-panel">
          <strong>{error}</strong>
        </section>
      )}

      {!data && !error && (
        <section className="admin-panel admin-module-panel">
          <span>Loading schedules...</span>
        </section>
      )}

      {data && !error && (
        <>
          <section className="admin-module-metrics admin-module-metrics--four">
            {metrics.map((metric) => (
              <article
                className={`admin-module-metric is-${metric.tone}`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.detail}</em>
              </article>
            ))}
          </section>

          <section className="admin-panel admin-schedule-panel">
            <div className="admin-toolbar">
              <div className="admin-schedule-navigation">
                <button
                  type="button"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                >
                  ←
                </button>

                <strong>
                  {formatWeek(data.weekStart, data.weekEnd)}
                </strong>

                <button
                  type="button"
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                >
                  →
                </button>

                <button
                  type="button"
                  onClick={() => setWeekStart(getWeekStart(getToday()))}
                >
                  Today
                </button>
              </div>

              <div className="admin-toolbar__filters">
                <select
                  value={barberId}
                  onChange={(event) => setBarberId(event.target.value)}
                >
                  <option value="">All barbers</option>

                  {data.barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>

                <button
                  className="admin-secondary-button"
                  type="button"
                >
                  Copy previous week
                </button>
              </div>
            </div>

            <div className="admin-table-scroll">
              <div className="admin-schedule-grid">
                <div className="admin-schedule-grid__head">
                  <span>Barber</span>

                  {Array.from(
                    { length: 7 },
                    (_, index) => addDays(data.weekStart, index),
                  ).map((date) => (
                    <strong key={date}>
                      {formatDate(date, {
                        weekday: 'short',
                        day: '2-digit',
                      })}
                    </strong>
                  ))}
                </div>

                {data.rows.map((row) => (
                  <div
                    className="admin-schedule-grid__row"
                    key={row.id}
                  >
                    <div className="admin-schedule-barber">
                      <BarberAvatar row={row} />

                      <div>
                        <strong>{row.displayName}</strong>

                        <small>
                          {row.experienceYears
                            ? `${row.experienceYears} years experience`
                            : 'New barber'}
                        </small>
                      </div>
                    </div>

                    {row.days.map((day) => (
                      <button
                        className={
                          day.type === 'day_off'
                            ? 'is-off'
                            : day.type === 'leave'
                              ? 'is-leave'
                              : undefined
                        }
                        key={`${row.id}-${day.date}`}
                        title={day.note || undefined}
                        type="button"
                      >
                        <strong>{day.label}</strong>

                        {day.detail && (
                          <small>{day.detail}</small>
                        )}

                        {day.note && (
                          <small>{day.note}</small>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-module-grid admin-module-grid--equal">
            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>PENDING REQUESTS</p>
                  <h2>Leave requests</h2>
                </div>
              </header>

              <div className="admin-request-list">
                {data.pendingLeaveRequests.length ? (
                  data.pendingLeaveRequests.map((request) => (
                    <div key={request.id}>
                      <div>
                        <strong>{request.barberName}</strong>

                        <span>
                          {formatLeaveRange(request, data.timeZone)}
                          {' · '}
                          {request.reason}
                        </span>
                      </div>

                      <div>
                        <span className="admin-status-badge is-pending">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <span>No pending leave requests.</span>
                )}
              </div>
            </article>

            <article className="admin-panel admin-module-panel">
              <header className="admin-panel__header">
                <div>
                  <p>DERIVED COVERAGE</p>
                  <h2>Schedule coverage this week</h2>
                </div>
              </header>

              <div className="admin-opening-hours">
                {data.derivedShopHours.map((item) => (
                  <div key={item.date}>
                    <span>
                      {formatDate(item.date, {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>

                    <strong>
                      {item.hours}
                      {item.activeBarbers
                        ? ` · ${item.activeBarbers} barbers`
                        : ''}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}