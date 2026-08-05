import { useEffect, useState } from 'react';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type ServiceStatusFilter = 'all' | 'active' | 'inactive';

type ServiceCategory = {
  id: string;
  name: string;
  isActive: boolean;
};

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  category: ServiceCategory | null;
  assignedBarbers: number;
  monthlyBookings: number;
};

type ServicesData = {
  currency: string;
  metrics: {
    totalServices: number;
    activeServices: number;
    monthlyBookings: number;
    monthlyBookingsGrowth: number;
    mostPopularService: { id: string; name: string; bookings: number } | null;
    averagePrice: number;
  };
  categories: ServiceCategory[];
  items: ServiceItem[];
};

type ServicesResponse = {
  success: boolean;
  message?: string;
  data?: ServicesData;
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

function formatGrowth(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function ServiceVisual({ service, index }: { service: ServiceItem; index: number }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => setImageError(false), [service.imageUrl]);

  return (
    <div className={`admin-service-card__visual is-${index % 4}`}>
      {service.imageUrl && !imageError && (
        <img
          src={service.imageUrl}
          alt={service.name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      )}

      <span>{service.category?.name ?? 'Uncategorized'}</span>
    </div>
  );
}

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ServiceStatusFilter>('all');
  const [data, setData] = useState<ServicesData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadServices() {
      setError('');

      try {
        const params = new URLSearchParams({ search: debouncedSearch, categoryId, status });
        const response = await fetch(`${API_BASE_URL}/administrator/services?${params}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as ServicesResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load services.');
        }

        setData(payload.data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load services.');
      }
    }

    void loadServices();
    return () => controller.abort();
  }, [categoryId, debouncedSearch, status]);

  const metrics = data
    ? [
        {
          label: 'Total services',
          value: data.metrics.totalServices.toLocaleString('en-US'),
          detail: `${data.metrics.activeServices} active`,
          tone: 'gold',
        },
        {
          label: 'Monthly bookings',
          value: data.metrics.monthlyBookings.toLocaleString('en-US'),
          detail: `${formatGrowth(data.metrics.monthlyBookingsGrowth)} vs last month`,
          tone: 'green',
        },
        {
          label: 'Most popular',
          value: data.metrics.mostPopularService?.name ?? 'No bookings',
          detail: `${data.metrics.mostPopularService?.bookings ?? 0} bookings`,
          tone: 'blue',
        },
        {
          label: 'Average price',
          value: formatCurrency(data.metrics.averagePrice, data.currency),
          detail: `Across ${data.metrics.activeServices} active services`,
          tone: 'purple',
        },
      ]
    : [];

  return (
    <>
      <AdminPageHeader
        eyebrow="CATALOG MANAGEMENT"
        title="Services"
        description="Configure service information, pricing, duration, availability, and assigned barbers."
        actions={<button className="admin-primary-button" type="button">+ Add service</button>}
      />

      {error && <section className="admin-panel admin-module-panel"><strong>{error}</strong></section>}
      {!data && !error && <section className="admin-panel admin-module-panel"><span>Loading services...</span></section>}

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
                placeholder="Search services..."
                type="search"
              />
            </div>

            <div className="admin-toolbar__filters">
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">All categories</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.isActive ? '' : ' (Inactive)'}
                  </option>
                ))}
              </select>

              <select value={status} onChange={(event) => setStatus(event.target.value as ServiceStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </section>

          {data.items.length ? (
            <section className="admin-service-card-grid">
              {data.items.map((service, index) => (
                <article className="admin-panel admin-service-card" key={service.id}>
                  <ServiceVisual service={service} index={index} />

                  <div className="admin-service-card__body">
                    <div className="admin-service-card__heading">
                      <div>
                        <small>#{service.id.slice(0, 8).toUpperCase()}</small>
                        <h2>{service.name}</h2>
                      </div>

                      <span className={`admin-status-badge is-${service.isActive ? 'active' : 'inactive'}`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p>{service.description || 'No description provided.'}</p>

                    <div className="admin-service-card__meta">
                      <span><strong>{service.durationMinutes} min</strong>Duration</span>
                      <span><strong>{formatCurrency(service.basePrice, data.currency)}</strong>Price</span>
                      <span><strong>{service.assignedBarbers}</strong>Barbers</span>
                      <span><strong>{service.monthlyBookings}</strong>Bookings</span>
                    </div>

                    <div className="admin-card-actions">
                      <button type="button">Edit service</button>
                      <button type="button">Assign barbers</button>
                      <button className={service.isActive ? 'is-danger' : undefined} type="button">
                        {service.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="admin-panel admin-module-panel">
              <span>No services match the current filters.</span>
            </section>
          )}
        </>
      )}
    </>
  );
}