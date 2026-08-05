import { createSupabaseAdminClient } from "../../lib/supabase";

const APPOINTMENT_STATUSES = ["pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"] as const;
const ACTIVE_STATUSES = new Set(["pending", "confirmed", "checked_in", "in_progress"]);

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentStatusFilter = "all" | AppointmentStatus;

type BarberRow = { id: string; display_name: string; avatar_url: string | null; is_active: boolean };
type UserRow = { avatar_url: string | null };
type ServiceRow = { service_name: string; quantity: number };
type PaymentRow = { amount: number | string; refunded_amount: number | string | null; status: string; paid_at: string | null };

type AppointmentRow = {
  id: string;
  booking_code: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  status: string;
  source: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  total_amount: number | string;
  currency: string;
  user: UserRow | UserRow[] | null;
  barber: BarberRow | BarberRow[] | null;
  services: ServiceRow[] | null;
  payments: PaymentRow[] | null;
};

type GetAppointmentsInput = {
  date: string;
  barberId: string;
  status: AppointmentStatusFilter;
  page: number;
  pageSize: number;
};

export function isAppointmentStatusFilter(value: string): value is AppointmentStatusFilter {
  return value === "all" || (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

export function isValidAppointmentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
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

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );

  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

function localDateToUtc(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));

  return new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone));
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value: number) {
  const minutes = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function getPaymentStatus(payments: PaymentRow[]) {
  if (!payments.length) return "unpaid";

  const paidPayments = payments.filter((payment) => {
    return payment.paid_at || ["paid", "partially_refunded", "refunded"].includes(payment.status);
  });

  const paidAmount = paidPayments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const refundedAmount = payments.reduce((total, payment) => total + toNumber(payment.refunded_amount), 0);

  if (paidAmount > 0 && refundedAmount >= paidAmount) return "refunded";
  if (refundedAmount > 0) return "partially_refunded";
  if (paidPayments.length) return "paid";
  if (payments.some((payment) => payment.status === "processing")) return "processing";
  if (payments.some((payment) => payment.status === "pending")) return "pending";
  if (payments.some((payment) => payment.status === "failed")) return "failed";
  if (payments.some((payment) => payment.status === "cancelled")) return "cancelled";

  return payments[0].status || "unpaid";
}

export async function getAdminAppointments(input: GetAppointmentsInput) {
  const supabase = createSupabaseAdminClient();

  const [settingsResult, barbersResult] = await Promise.all([
    supabase.from("shop_settings").select("timezone, default_slot_minutes").eq("id", 1).maybeSingle(),
    supabase.from("barbers").select("id, display_name, avatar_url, is_active").order("display_name", { ascending: true }),
  ]);

  const setupError = settingsResult.error ?? barbersResult.error;
  if (setupError) throw setupError;

  const timeZone = settingsResult.data?.timezone?.trim() || "Asia/Ho_Chi_Minh";
  const slotMinutes = Number(settingsResult.data?.default_slot_minutes ?? 30);
  const rangeStart = localDateToUtc(input.date, timeZone);
  const rangeEnd = localDateToUtc(addDays(input.date, 1), timeZone);

  const appointmentsResult = await supabase
    .from("appointments")
    .select(`
      id, booking_code, barber_id, start_at, end_at, status, source, customer_name, customer_phone, customer_email, total_amount, currency,
      user:users!appointments_user_id_fkey(avatar_url),
      barber:barbers!appointments_barber_id_fkey(id, display_name, avatar_url, is_active),
      services:appointment_services!appointment_services_appointment_id_fkey(service_name, quantity),
      payments:payments!payments_appointment_id_fkey(amount, refunded_amount, status, paid_at)
    `)
    .gte("start_at", rangeStart.toISOString())
    .lt("start_at", rangeEnd.toISOString())
    .order("start_at", { ascending: true });

  if (appointmentsResult.error) throw appointmentsResult.error;

  const rows = (appointmentsResult.data ?? []) as unknown as AppointmentRow[];

  const appointments = rows.map((row) => {
    const user = getSingle(row.user);
    const barber = getSingle(row.barber);
    const startTime = formatTime(row.start_at, timeZone);
    const endTime = formatTime(row.end_at, timeZone);

    return {
      id: row.id,
      bookingCode: row.booking_code,
      customerName: row.customer_name,
      customerPhone: row.customer_phone ?? "",
      customerEmail: row.customer_email ?? "",
      customerAvatarUrl: user?.avatar_url?.trim() || null,
      barberId: row.barber_id,
      barberName: barber?.display_name ?? "Unknown barber",
      startAt: row.start_at,
      endAt: row.end_at,
      startTime,
      endTime,
      status: row.status,
      source: row.source,
      services: (row.services ?? []).map((service) => {
        return service.quantity > 1 ? `${service.service_name} ×${service.quantity}` : service.service_name;
      }),
      amount: Math.round(toNumber(row.total_amount)),
      currency: row.currency.trim(),
      paymentStatus: getPaymentStatus(row.payments ?? []),
    };
  });

  const total = appointments.length;
  const pending = appointments.filter((appointment) => appointment.status === "pending").length;
  const completed = appointments.filter((appointment) => appointment.status === "completed").length;
  const cancelled = appointments.filter((appointment) => appointment.status === "cancelled").length;
  const remaining = appointments.filter((appointment) => {
    return ACTIVE_STATUSES.has(appointment.status) && new Date(appointment.endAt) > new Date();
  }).length;

  const filtered = appointments.filter((appointment) => {
    const matchesBarber = !input.barberId || appointment.barberId === input.barberId;
    const matchesStatus = input.status === "all" || appointment.status === input.status;
    return matchesBarber && matchesStatus;
  });

  const filteredTotal = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const startIndex = (page - 1) * input.pageSize;

  const allBarbers = (barbersResult.data ?? []) as BarberRow[];
  const calendarBarberIds = new Set(filtered.map((appointment) => appointment.barberId));
  const calendarBarbers = allBarbers.filter((barber) => calendarBarberIds.has(barber.id));
  const times = filtered.flatMap((appointment) => [timeToMinutes(appointment.startTime), timeToMinutes(appointment.endTime)]);
  const calendarStart = times.length ? Math.floor(Math.min(...times) / slotMinutes) * slotMinutes : null;
  const calendarEnd = times.length ? Math.ceil(Math.max(...times) / slotMinutes) * slotMinutes : null;

  const slots = calendarStart === null || calendarEnd === null
    ? []
    : Array.from(
        { length: Math.max(1, Math.ceil((calendarEnd - calendarStart) / slotMinutes)) },
        (_, index) => minutesToTime(calendarStart + index * slotMinutes),
      );

  return {
    date: input.date,
    timeZone,
    slotMinutes,
    statuses: APPOINTMENT_STATUSES,
    metrics: {
      total,
      remaining,
      pending,
      completed,
      completedPercentage: total ? Math.round((completed / total) * 1000) / 10 : 0,
      cancelled,
      cancelledPercentage: total ? Math.round((cancelled / total) * 1000) / 10 : 0,
    },
    barbers: allBarbers.map((barber) => ({
      id: barber.id,
      name: barber.display_name,
      avatarUrl: barber.avatar_url?.trim() || null,
      isActive: barber.is_active,
    })),
    items: filtered.slice(startIndex, startIndex + input.pageSize),
    pagination: { page, pageSize: input.pageSize, total: filteredTotal, totalPages },
    calendar: {
      barbers: calendarBarbers.map((barber) => ({ id: barber.id, name: barber.display_name })),
      slots,
      appointments: filtered,
    },
  };
}