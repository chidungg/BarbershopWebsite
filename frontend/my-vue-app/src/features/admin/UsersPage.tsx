import { useEffect, useState } from 'react';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const PAGE_SIZE = 10;

type UserStatusFilter = 'all' | 'active' | 'inactive' | 'blocked';
type UserSort = 'newest' | 'oldest' | 'spending';

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  appointments: number;
  spending: number;
  joinedAt: string;
  status: string;
};

type UsersData = {
  currency: string;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    activePercentage: number;
    newThisMonth: number;
    newUsersGrowth: number;
    blockedUsers: number;
    blockedPercentage: number;
  };
  users: UserRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type UsersResponse = {
  success: boolean;
  message?: string;
  data?: UsersData;
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '--';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatStatus(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
}

function formatGrowth(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const count = Math.min(3, totalPages);
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

function UserAvatar({ user }: { user: UserRow }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => setImageError(false), [user.avatarUrl]);

  return (
    <span>
      {user.avatarUrl && !imageError ? (
        <img src={user.avatarUrl} alt={`${user.name} avatar`} referrerPolicy="no-referrer" onError={() => setImageError(true)} />
      ) : (
        getInitials(user.name)
      )}
    </span>
  );
}

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<UserStatusFilter>('all');
  const [sort, setSort] = useState<UserSort>('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setError('');

      try {
        const params = new URLSearchParams({
          query: debouncedQuery,
          status,
          sort,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        const response = await fetch(`${API_BASE_URL}/administrator/users?${params}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as UsersResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load users.');
        }

        setData(payload.data);
        if (payload.data.pagination.page !== page) setPage(payload.data.pagination.page);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load users.');
      }
    }

    void loadUsers();
    return () => controller.abort();
  }, [debouncedQuery, page, sort, status]);

  const metrics = data
    ? [
        { label: 'Total users', value: data.metrics.totalUsers.toLocaleString('en-US'), detail: 'Customer accounts', tone: 'gold' },
        { label: 'Active users', value: data.metrics.activeUsers.toLocaleString('en-US'), detail: `${data.metrics.activePercentage.toFixed(1)}% of total`, tone: 'green' },
        { label: 'New this month', value: data.metrics.newThisMonth.toLocaleString('en-US'), detail: `${formatGrowth(data.metrics.newUsersGrowth)} from last month`, tone: 'blue' },
        { label: 'Blocked accounts', value: data.metrics.blockedUsers.toLocaleString('en-US'), detail: `${data.metrics.blockedPercentage.toFixed(1)}% of total`, tone: 'red' },
      ]
    : [];

  const pagination = data?.pagination;
  const firstResult = pagination?.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastResult = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  return (
    <>
      <AdminPageHeader
        eyebrow="CUSTOMER MANAGEMENT"
        title="Users"
        description="Manage customer accounts, activity, booking history, and account status."
        actions={<button className="admin-primary-button" type="button">+ Add new user</button>}
      />

      {error && <section className="admin-panel admin-module-panel"><strong>{error}</strong></section>}
      {!data && !error && <section className="admin-panel admin-module-panel"><span>Loading users...</span></section>}

      {data && (
        <>
          <section className="admin-module-metrics admin-module-metrics--four">
            {metrics.map((metric) => (
              <article className={`admin-module-metric is-${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span><strong>{metric.value}</strong><em>{metric.detail}</em>
              </article>
            ))}
          </section>

          <section className="admin-panel admin-management-panel">
            <div className="admin-toolbar">
              <div className="admin-toolbar__search">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or phone..." type="search" />
              </div>

              <div className="admin-toolbar__filters">
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as UserStatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>

                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as UserSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="spending">Highest spending</option>
                </select>

                <button className="admin-secondary-button" type="button">Export CSV</button>
              </div>
            </div>

            <div className="admin-table-scroll">
              <table className="admin-table admin-module-table">
                <thead>
                  <tr>
                    <th>User</th><th>Contact</th><th>Appointments</th><th>Total spending</th><th>Joined</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {data.users.length ? (
                    data.users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-customer-cell">
                            <UserAvatar user={user} />
                            <div><strong>{user.name}</strong><small>{user.id.slice(0, 8).toUpperCase()}</small></div>
                          </div>
                        </td>

                        <td>
                          <div className="admin-contact-cell">
                            <strong>{user.email || 'No email'}</strong>
                            <span>{user.phone || 'No phone number'}</span>
                          </div>
                        </td>

                        <td>{user.appointments}</td>
                        <td className="admin-amount-cell">{formatCurrency(user.spending, data.currency)}</td>
                        <td>{formatDate(user.joinedAt)}</td>
                        <td><span className={`admin-status-badge is-${user.status}`}>{formatStatus(user.status)}</span></td>

                        <td>
                          <div className="admin-row-actions">
                            <button type="button">View</button>
                            <button type="button">Edit</button>
                            <button className="is-danger" type="button">{user.status === 'blocked' ? 'Unblock' : 'Block'}</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7}>No users match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>Showing {firstResult}–{lastResult} of {pagination?.total ?? 0} users</span>

              <div>
                <button type="button" disabled={!pagination || pagination.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>←</button>

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
          </section>
        </>
      )}
    </>
  );
}