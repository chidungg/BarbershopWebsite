import { useEffect, useState } from 'react';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const PAGE_SIZE = 10;

type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded';
type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'e_wallet' | 'qr';
type StatusFilter = 'all' | PaymentStatus;
type MethodFilter = 'all' | PaymentMethod;

type PaymentItem = {
  id: string;
  appointmentId: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  reference: string;
  createdAt: string;
  paidAt: string | null;
  refundedAmount: number;
  transactionCount: number;
};

type PaymentsData = {
  date: string;
  timeZone: string;
  currency: string;
  statuses: PaymentStatus[];
  methods: PaymentMethod[];
  metrics: {
    totalAmount: number;
    totalCount: number;
    paidAmount: number;
    paidCount: number;
    successRate: number;
    pendingAmount: number;
    pendingCount: number;
    failedAmount: number;
    failedCount: number;
    refundedAmount: number;
    refundedCount: number;
  };
  items: PaymentItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type PaymentsResponse = { success: boolean; message?: string; data?: PaymentsData };

function getToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
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

function getPageNumbers(currentPage: number, totalPages: number) {
  const count = Math.min(3, totalPages);
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [date, setDate] = useState(getToday);
  const [method, setMethod] = useState<MethodFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaymentsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPayments() {
      setError('');

      try {
        const params = new URLSearchParams({
          search: debouncedSearch,
          date,
          method,
          status,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        const response = await fetch(`${API_BASE_URL}/administrator/payments?${params}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as PaymentsResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message ?? 'Unable to load payments.');
        }

        setData(payload.data);
        if (payload.data.pagination.page !== page) setPage(payload.data.pagination.page);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load payments.');
      }
    }

    void loadPayments();
    return () => controller.abort();
  }, [date, debouncedSearch, method, page, status]);

  const metrics = data ? [
    { label: 'Total amount', value: formatCurrency(data.metrics.totalAmount, data.currency), detail: `${data.metrics.totalCount} transactions`, tone: 'gold' },
    { label: 'Paid', value: formatCurrency(data.metrics.paidAmount, data.currency), detail: `${data.metrics.successRate.toFixed(1)}% success rate`, tone: 'green' },
    { label: 'Pending', value: formatCurrency(data.metrics.pendingAmount, data.currency), detail: `${data.metrics.pendingCount} transactions`, tone: 'orange' },
    { label: 'Failed / cancelled', value: formatCurrency(data.metrics.failedAmount, data.currency), detail: `${data.metrics.failedCount} transactions`, tone: 'red' },
    { label: 'Refunded', value: formatCurrency(data.metrics.refundedAmount, data.currency), detail: `${data.metrics.refundedCount} transactions`, tone: 'blue' },
  ] : [];

  const pagination = data?.pagination;
  const firstResult = pagination?.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastResult = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;

  return (
    <>
      <AdminPageHeader
        eyebrow="TRANSACTION MANAGEMENT"
        title="Payments"
        description="Monitor payment status, transaction references, providers, and refunds."
        actions={<button className="admin-primary-button" type="button">Export transactions</button>}
      />

      {error && <section className="admin-panel admin-module-panel"><strong>{error}</strong></section>}
      {!data && !error && <section className="admin-panel admin-module-panel"><span>Loading payments...</span></section>}

      {data && !error && (
        <>
          <section className="admin-module-metrics admin-module-metrics--five">
            {metrics.map((metric) => (
              <article className={`admin-module-metric is-${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.detail}</em>
              </article>
            ))}
          </section>

          <section className="admin-panel admin-management-panel">
            <div className="admin-toolbar">
              <div className="admin-toolbar__search">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search payment, booking, transaction, customer..."
                  type="search"
                />
              </div>

              <div className="admin-toolbar__filters">
                <select
                  value={method}
                  onChange={(event) => {
                    setMethod(event.target.value as MethodFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All methods</option>
                  {data.methods.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
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

                <input
                  value={date}
                  type="date"
                  onChange={(event) => {
                    setDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="admin-table-scroll">
              <table className="admin-table admin-module-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Appointment</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.length ? data.items.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <strong>#{payment.id.slice(0, 8).toUpperCase()}</strong>
                        <small className="admin-payment-subtext">{payment.transactionCount} transaction events</small>
                      </td>

                      <td>#{payment.bookingCode || payment.appointmentId.slice(0, 8).toUpperCase()}</td>

                      <td>
                        <div className="admin-contact-cell">
                          <strong>{payment.customerName}</strong>
                          <span>{payment.customerEmail || 'No email'}</span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-payment-amount">
                          <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                          {payment.refundedAmount > 0 && <small>Refunded {formatCurrency(payment.refundedAmount, payment.currency)}</small>}
                        </div>
                      </td>

                      <td>
                        <div className="admin-contact-cell">
                          <strong>{formatLabel(payment.method)}</strong>
                          <span>{payment.provider || 'No provider'}</span>
                        </div>
                      </td>

                      <td><code className="admin-reference-code">{payment.reference}</code></td>

                      <td>
                        <div className="admin-date-cell">
                          <strong>{formatDateTime(payment.createdAt, data.timeZone)}</strong>
                          <span>{payment.paidAt ? `Paid ${formatDateTime(payment.paidAt, data.timeZone)}` : 'Not paid yet'}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`admin-status-badge is-${payment.status.replace(/_/g, '-')}`}>
                          {formatLabel(payment.status)}
                        </span>
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          <button type="button">Details</button>
                          {['paid', 'partially_refunded', 'refunded'].includes(payment.status) && <button type="button">Receipt</button>}
                          {payment.status === 'pending' && <button type="button">Confirm</button>}
                          {['paid', 'partially_refunded'].includes(payment.status) && <button className="is-danger" type="button">Refund</button>}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9}>No payments match the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>Showing {firstResult}–{lastResult} of {pagination?.total ?? 0} payments</span>

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