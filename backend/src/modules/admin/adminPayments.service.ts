import { createSupabaseAdminClient } from "../../lib/supabase";

const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed", "cancelled", "partially_refunded", "refunded"] as const;
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "e_wallet", "qr"] as const;
const SUCCESS_STATUSES = new Set(["paid", "partially_refunded", "refunded"]);
const PENDING_STATUSES = new Set(["pending", "processing"]);
const FAILED_STATUSES = new Set(["failed", "cancelled"]);

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatusFilter = "all" | PaymentStatus;
export type PaymentMethodFilter = "all" | PaymentMethod;

type AppointmentRow = { booking_code: string; customer_name: string; customer_email: string | null };
type TransactionRow = { provider_event_id: string | null; transaction_type: string; status: string | null; created_at: string };

type PaymentRow = {
  id: string;
  appointment_id: string;
  amount: number | string;
  currency: string;
  method: string;
  status: string;
  provider: string | null;
  provider_transaction_id: string | null;
  paid_at: string | null;
  refunded_amount: number | string | null;
  created_at: string;
  appointment: AppointmentRow | AppointmentRow[] | null;
  transactions: TransactionRow[] | null;
};

type GetPaymentsInput = {
  search: string;
  date: string;
  method: PaymentMethodFilter;
  status: PaymentStatusFilter;
  page: number;
  pageSize: number;
};

export function isPaymentStatusFilter(value: string): value is PaymentStatusFilter {
  return value === "all" || (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentMethodFilter(value: string): value is PaymentMethodFilter {
  return value === "all" || (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isValidPaymentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

function localDateToUtc(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));
  return new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone));
}

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

export async function getAdminPayments(input: GetPaymentsInput) {
  const supabase = createSupabaseAdminClient();
  const settingsResult = await supabase.from("shop_settings").select("timezone, currency").eq("id", 1).maybeSingle();

  if (settingsResult.error) throw settingsResult.error;

  const timeZone = settingsResult.data?.timezone?.trim() || "Asia/Ho_Chi_Minh";
  const reportingCurrency = String(settingsResult.data?.currency ?? "VND").trim();
  const rangeStart = localDateToUtc(input.date, timeZone);
  const rangeEnd = localDateToUtc(addDays(input.date, 1), timeZone);

  const paymentsResult = await supabase
    .from("payments")
    .select(`
      id, appointment_id, amount, currency, method, status, provider, provider_transaction_id, paid_at, refunded_amount, created_at,
      appointment:appointments!payments_appointment_id_fkey(booking_code, customer_name, customer_email),
      transactions:payment_transactions!payment_transactions_payment_id_fkey(provider_event_id, transaction_type, status, created_at)
    `)
    .gte("created_at", rangeStart.toISOString())
    .lt("created_at", rangeEnd.toISOString())
    .order("created_at", { ascending: false });

  if (paymentsResult.error) throw paymentsResult.error;

  const rows = (paymentsResult.data ?? []) as unknown as PaymentRow[];

  const payments = rows.map((row) => {
    const appointment = getSingle(row.appointment);
    const transactions = [...(row.transactions ?? [])].sort((first, second) => {
      return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
    });

    return {
      id: row.id,
      appointmentId: row.appointment_id,
      bookingCode: appointment?.booking_code ?? "",
      customerName: appointment?.customer_name ?? "Unknown customer",
      customerEmail: appointment?.customer_email ?? "",
      amount: Math.round(toNumber(row.amount)),
      currency: row.currency.trim(),
      method: row.method,
      status: row.status,
      provider: row.provider?.trim() ?? "",
      reference: row.provider_transaction_id?.trim() || transactions.find((item) => item.provider_event_id)?.provider_event_id || row.provider?.trim() || "Manual",
      createdAt: row.created_at,
      paidAt: row.paid_at,
      refundedAmount: Math.round(toNumber(row.refunded_amount)),
      transactionCount: transactions.length,
    };
  });

  const paidPayments = payments.filter((payment) => SUCCESS_STATUSES.has(payment.status));
  const pendingPayments = payments.filter((payment) => PENDING_STATUSES.has(payment.status));
  const failedPayments = payments.filter((payment) => FAILED_STATUSES.has(payment.status));
  const refundedPayments = payments.filter((payment) => payment.refundedAmount > 0 || payment.status === "refunded" || payment.status === "partially_refunded");
  const sumAmount = (items: typeof payments) => items.reduce((total, payment) => total + payment.amount, 0);

  const normalizedSearch = input.search.trim().toLowerCase();
  const filtered = payments.filter((payment) => {
    const matchesMethod = input.method === "all" || payment.method === input.method;
    const matchesStatus = input.status === "all" || payment.status === input.status;
    const searchable = `${payment.id} ${payment.appointmentId} ${payment.bookingCode} ${payment.customerName} ${payment.customerEmail} ${payment.reference} ${payment.provider}`.toLowerCase();
    return matchesMethod && matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const startIndex = (page - 1) * input.pageSize;

  return {
    date: input.date,
    timeZone,
    currency: reportingCurrency,
    statuses: PAYMENT_STATUSES,
    methods: PAYMENT_METHODS,
    metrics: {
      totalAmount: sumAmount(payments),
      totalCount: payments.length,
      paidAmount: sumAmount(paidPayments),
      paidCount: paidPayments.length,
      successRate: payments.length ? roundPercentage((paidPayments.length / payments.length) * 100) : 0,
      pendingAmount: sumAmount(pendingPayments),
      pendingCount: pendingPayments.length,
      failedAmount: sumAmount(failedPayments),
      failedCount: failedPayments.length,
      refundedAmount: refundedPayments.reduce((total, payment) => total + payment.refundedAmount, 0),
      refundedCount: refundedPayments.length,
    },
    items: filtered.slice(startIndex, startIndex + input.pageSize),
    pagination: { page, pageSize: input.pageSize, total, totalPages },
  };
}