import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminIcon from './AdminIcon';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type BarberStatusFilter = 'all' | 'active' | 'inactive';
type BarberAvailability = 'available' | 'in_service' | 'day_off' | 'off_shift' | 'time_off' | 'inactive';
type AssignedService = { id: string; name: string };

type BarberItem = {
  id: string;
  accountId: string;
  displayName: string;
  bio: string;
  phone: string;
  avatarUrl: string | null;
  experienceYears: number;
  hiredAt: string | null;
  isActive: boolean;
  ratingAverage: number;
  reviewCount: number;
  assignedServices: AssignedService[];
  monthlyBookings: number;
  monthlyRevenue: number;
  availability: BarberAvailability;
  todayShift: string;
};

type BarbersData = {
  currency: string;
  metrics: {
    totalBarbers: number;
    activeBarbers: number;
    availableToday: number;
    availablePercentage: number;
    averageRating: number;
    totalReviews: number;
    monthlyBookings: number;
    monthlyBookingsGrowth: number;
  };
  services: AssignedService[];
  items: BarberItem[];
};

type BarbersResponse = { success: boolean; message?: string; data?: BarbersData };

type CreateBarberForm = {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  experienceYears: string;
  hiredAt: string;
  avatarUrl: string;
  bio: string;
  serviceIds: string[];
};

type CreateBarberResponse = {
  success: boolean;
  message?: string;
  data?: { id: string; accountId: string };
};

const EMPTY_BARBER_FORM: CreateBarberForm = {
  displayName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  experienceYears: '0',
  hiredAt: '',
  avatarUrl: '',
  bio: '',
  serviceIds: [],
};

const availabilityLabels: Record<BarberAvailability, string> = {
  available: 'Available',
  in_service: 'In service',
  day_off: 'Day off',
  off_shift: 'Off shift',
  time_off: 'Time off',
  inactive: 'Inactive',
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatGrowth(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function BarberAvatar({ barber }: { barber: BarberItem }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => setImageError(false), [barber.avatarUrl]);

  return (
    <span className="admin-barber-card__avatar">
      {barber.avatarUrl && !imageError ? (
        <img
          src={barber.avatarUrl}
          alt={`${barber.displayName} avatar`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : getInitials(barber.displayName)}
    </span>
  );
}

export default function BarbersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<BarberStatusFilter>('all');
  const [serviceId, setServiceId] = useState('');
  const [data, setData] = useState<BarbersData | null>(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBarberForm>(EMPTY_BARBER_FORM);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBarbers() {
      setError('');

      try {
        const params = new URLSearchParams({ search: debouncedSearch, status, serviceId });
        const response = await fetch(`${API_BASE_URL}/administrator/barbers?${params}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as BarbersResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load barbers.');
        }

        setData(payload.data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load barbers.');
      }
    }

    void loadBarbers();
    return () => controller.abort();
  }, [debouncedSearch, refreshKey, serviceId, status]);

  function openAddBarber() {
      setCreateForm(EMPTY_BARBER_FORM);
      setModalError('');
      setShowAddModal(true);
    }

    function toggleService(id: string) {
      setCreateForm((form) => ({
        ...form,
        serviceIds: form.serviceIds.includes(id) ? form.serviceIds.filter((serviceId) => serviceId !== id) : [...form.serviceIds, id],
      }));
    }

    async function createBarber(event: SubmitEvent<HTMLFormElement>) {
      event.preventDefault();
      setModalError('');

      if (createForm.password !== createForm.confirmPassword) {
        setModalError('Confirm password does not match.');
        return;
      }

      setSaving(true);

      try {
        const response = await fetch(`${API_BASE_URL}/administrator/barbers`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: createForm.displayName,
            email: createForm.email,
            phone: createForm.phone,
            password: createForm.password,
            experienceYears: Number(createForm.experienceYears),
            hiredAt: createForm.hiredAt || null,
            avatarUrl: createForm.avatarUrl,
            bio: createForm.bio,
            serviceIds: createForm.serviceIds,
          }),
        });

        const payload = (await response.json()) as CreateBarberResponse;
        if (!response.ok || !payload.success) throw new Error(payload.message ?? 'Unable to create barber.');

        setShowAddModal(false);
        setCreateForm(EMPTY_BARBER_FORM);
        setRefreshKey((value) => value + 1);
      } catch (requestError) {
        setModalError(requestError instanceof Error ? requestError.message : 'Unable to create barber.');
      } finally {
        setSaving(false);
      }
    }

  const metrics = data ? [
    {
      label: 'Total barbers',
      value: data.metrics.totalBarbers.toLocaleString('en-US'),
      detail: `${data.metrics.activeBarbers} active`,
      tone: 'gold',
    },
    {
      label: 'Available today',
      value: data.metrics.availableToday.toLocaleString('en-US'),
      detail: `${data.metrics.availablePercentage.toFixed(1)}% of active barbers`,
      tone: 'green',
    },
    {
      label: 'Average rating',
      value: data.metrics.averageRating.toFixed(1),
      detail: `${data.metrics.totalReviews.toLocaleString('en-US')} reviews`,
      tone: 'blue',
    },
    {
      label: 'Monthly bookings',
      value: data.metrics.monthlyBookings.toLocaleString('en-US'),
      detail: `${formatGrowth(data.metrics.monthlyBookingsGrowth)} vs last month`,
      tone: 'purple',
    },
  ] : [];

  return (
    <>
      <AdminPageHeader
        eyebrow="TEAM MANAGEMENT"
        title="Barbers"
        description="Manage barber profiles, assigned services, schedules, and performance."
        actions={<button className="admin-primary-button" type="button" disabled={!data} onClick={openAddBarber}>+ Add barber</button>}
      />

      {error && <section className="admin-panel admin-module-panel"><strong>{error}</strong></section>}
      {!data && !error && <section className="admin-panel admin-module-panel"><span>Loading barbers...</span></section>}

      {data && !error && (
        <>
          <section className="admin-module-metrics admin-module-metrics--four">
            {metrics.map((metric) => (
              <article className={`admin-module-metric is-${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.detail}</em>
              </article>
            ))}
          </section>

          <section className="admin-toolbar admin-toolbar--standalone">
            <div className="admin-toolbar__search">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, phone, or service..."
                type="search"
              />
            </div>

            <div className="admin-toolbar__filters">
              <select value={status} onChange={(event) => setStatus(event.target.value as BarberStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                <option value="">All services</option>
                {data.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>

              <button className="admin-secondary-button" type="button" onClick={() => navigate('/administrator/schedules')}>
                Manage schedules
              </button>
            </div>
          </section>

          {data.items.length ? (
            <section className="admin-barber-card-grid">
              {data.items.map((barber) => (
                <article className="admin-panel admin-barber-card" key={barber.id}>
                  <div className="admin-barber-card__top">
                    <BarberAvatar barber={barber} />
                    <span className={`admin-status-badge is-${barber.isActive ? 'active' : 'inactive'}`}>
                      {barber.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h2>{barber.displayName}</h2>
                  <p>
                    {barber.experienceYears
                      ? `${barber.experienceYears} ${barber.experienceYears === 1 ? 'year' : 'years'} experience`
                      : 'New barber'}
                  </p>

                  <div className="admin-specialty-list">
                    {barber.assignedServices.length
                      ? barber.assignedServices.map((service) => <span key={service.id}>{service.name}</span>)
                      : <span>No services assigned</span>}
                  </div>

                  <div className="admin-barber-card__stats">
                    <div>
                      <AdminIcon name="star" size={15} />
                      <strong>{barber.ratingAverage.toFixed(1)}</strong>
                      <span>{barber.reviewCount} reviews</span>
                    </div>

                    <div>
                      <strong>{barber.monthlyBookings}</strong>
                      <span>Bookings this month</span>
                    </div>

                    <div>
                      <strong>{formatCurrency(barber.monthlyRevenue, data.currency)}</strong>
                      <span>Net revenue</span>
                    </div>
                  </div>

                  <div className="admin-barber-card__availability">
                    <span>Current status</span>

                    <div>
                      <strong className={`is-${barber.availability.replace('_', '-')}`}>
                        {availabilityLabels[barber.availability]}
                      </strong>
                      <small>{barber.todayShift}</small>
                    </div>
                  </div>

                  <div className="admin-card-actions">
                    <button type="button">View profile</button>
                    <button type="button">Edit</button>
                    <button type="button">Schedule</button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="admin-panel admin-module-panel">
              <span>No barbers match the current filters.</span>
            </section>
          )}
        </>
      )}
      {showAddModal && (
      <div className="admin-user-modal-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowAddModal(false);
      }}>
        <section className="admin-user-modal" role="dialog" aria-modal="true" aria-label="Add barber">
          <header>
            <div>
              <span>ADD NEW BARBER</span>
              <h2>Create barber account</h2>
            </div>
            <button type="button" onClick={() => setShowAddModal(false)}>×</button>
          </header>

          {modalError && <div className="admin-user-modal__error">{modalError}</div>}

          <form className="admin-form-grid admin-form-grid--two admin-user-edit-form" onSubmit={createBarber}>
            <label>
              <span>Display name</span>
              <input required minLength={2} maxLength={120} value={createForm.displayName} onChange={(event) => setCreateForm({ ...createForm, displayName: event.target.value })} />
            </label>

            <label>
              <span>Email</span>
              <input required type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} />
            </label>

            <label>
              <span>Phone</span>
              <input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} placeholder="0901234567" />
            </label>

            <label>
              <span>Experience years</span>
              <input required type="number" min="0" step="1" value={createForm.experienceYears} onChange={(event) => setCreateForm({ ...createForm, experienceYears: event.target.value })} />
            </label>

            <label>
              <span>Temporary password</span>
              <input required type="password" minLength={8} autoComplete="new-password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} />
            </label>

            <label>
              <span>Confirm password</span>
              <input required type="password" minLength={8} autoComplete="new-password" value={createForm.confirmPassword} onChange={(event) => setCreateForm({ ...createForm, confirmPassword: event.target.value })} />
            </label>

            <label>
              <span>Hired date</span>
              <input type="date" max={new Date().toISOString().slice(0, 10)} value={createForm.hiredAt} onChange={(event) => setCreateForm({ ...createForm, hiredAt: event.target.value })} />
            </label>

            <label>
              <span>Avatar URL</span>
              <input type="url" value={createForm.avatarUrl} onChange={(event) => setCreateForm({ ...createForm, avatarUrl: event.target.value })} placeholder="https://..." />
            </label>

            <div className="admin-form-field--full admin-barber-services-field">
              <span>Assigned services</span>
              <div className="admin-barber-service-options">
                {(data?.services ?? []).map((service) => (
                  <label key={service.id}>
                    <input type="checkbox" checked={createForm.serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} />
                    <span>{service.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="admin-form-field--full">
              <span>Bio</span>
              <textarea rows={4} maxLength={2000} value={createForm.bio} onChange={(event) => setCreateForm({ ...createForm, bio: event.target.value })} placeholder="Short description about the barber..." />
            </label>

            <div className="admin-user-modal__actions admin-form-field--full">
              <button className="admin-secondary-button" type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create barber'}</button>
            </div>
          </form>
        </section>
      </div>
    )}
    </>
  );
}