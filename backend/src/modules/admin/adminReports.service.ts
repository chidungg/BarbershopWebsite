import { createSupabaseAdminClient } from "../../lib/supabase";

const REPORT_PERIODS = ["week", "month", "quarter", "year"] as const;
const SUCCESS_PAYMENTS = new Set(["paid", "partially_refunded", "refunded"]);
const EXCLUDED_APPOINTMENTS = new Set(["cancelled", "no_show"]);

export type ReportPeriod = (typeof REPORT_PERIODS)[number];

type BarberRelation = { id: string; display_name: string };
type AppointmentRelation = { id: string; barber_id: string; barber: BarberRelation | BarberRelation[] | null };
type AppointmentRow = { id: string; user_id: string | null; barber_id: string; status: string; start_at: string; end_at: string; barber: BarberRelation | BarberRelation[] | null };
type PaymentRow = { id: string; appointment_id: string; amount: number | string; refunded_amount: number | string | null; status: string; created_at: string; paid_at: string | null; appointment: AppointmentRelation | AppointmentRelation[] | null };
type AccountRow = { id: string; created_at: string };
type ServiceRow = { service_id: string | null; service_name: string; quantity: number; appointment: { status: string; start_at: string } | { status: string; start_at: string }[] | null };
type PeriodRange = { currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date };

export function isReportPeriod(value: string): value is ReportPeriod {
  return (REPORT_PERIODS as readonly string[]).includes(value);
}

function getSingle<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function percentage(value: number, total: number) {
  return total ? round((value / total) * 100) : 0;
}

function growth(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return round(((current - previous) / previous) * 100);
}

function normalizeLocalDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

function localMidnightToUtc(year: number, month: number, day: number, timeZone: string) {
  const normalized = normalizeLocalDate(year, month, day);
  const guess = new Date(Date.UTC(normalized.year, normalized.month - 1, normalized.day));
  return new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone));
}

function getLocalParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  const dayOfWeek = new Date(Date.UTC(values.year, values.month - 1, values.day)).getUTCDay();
  return { year: values.year, month: values.month, day: values.day, dayOfWeek };
}

function getPeriodStart(now: Date, period: ReportPeriod, timeZone: string) {
  const local = getLocalParts(now, timeZone);

  if (period === "week") return localMidnightToUtc(local.year, local.month, local.day - ((local.dayOfWeek + 6) % 7), timeZone);
  if (period === "month") return localMidnightToUtc(local.year, local.month, 1, timeZone);
  if (period === "quarter") return localMidnightToUtc(local.year, Math.floor((local.month - 1) / 3) * 3 + 1, 1, timeZone);

  return localMidnightToUtc(local.year, 1, 1, timeZone);
}

function getPreviousPeriodStart(currentStart: Date, period: ReportPeriod, timeZone: string) {
  const local = getLocalParts(currentStart, timeZone);

  if (period === "week") return localMidnightToUtc(local.year, local.month, local.day - 7, timeZone);
  if (period === "month") return localMidnightToUtc(local.year, local.month - 1, 1, timeZone);
  if (period === "quarter") return localMidnightToUtc(local.year, local.month - 3, 1, timeZone);

  return localMidnightToUtc(local.year - 1, 1, 1, timeZone);
}

function getPeriodRange(period: ReportPeriod, timeZone: string): PeriodRange {
  const currentEnd = new Date();
  const currentStart = getPeriodStart(currentEnd, period, timeZone);
  const previousStart = getPreviousPeriodStart(currentStart, period, timeZone);
  const previousEnd = new Date(Math.min(currentStart.getTime(), previousStart.getTime() + currentEnd.getTime() - currentStart.getTime()));

  return { currentStart, currentEnd, previousStart, previousEnd };
}

function isInRange(value: string | null, start: Date, end: Date) {
  if (!value) return false;

  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function getNetRevenue(payments: PaymentRow[]) {
  return payments.reduce((total, payment) => {
    return total + Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
  }, 0);
}

export async function getAdminReports(period: ReportPeriod) {
  const supabase = createSupabaseAdminClient();

  const settingsResult = await supabase
    .from("shop_settings")
    .select("timezone, currency")
    .eq("id", 1)
    .maybeSingle();

  if (settingsResult.error) throw settingsResult.error;

  const timeZone = settingsResult.data?.timezone?.trim() || "Asia/Ho_Chi_Minh";
  const currency = String(settingsResult.data?.currency ?? "VND").trim();
  const range = getPeriodRange(period, timeZone);

  const [appointmentsResult, paymentAttemptsResult, paidPaymentsResult, customersResult, servicesResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, user_id, barber_id, status, start_at, end_at, barber:barbers!appointments_barber_id_fkey(id, display_name)")
      .gte("start_at", range.previousStart.toISOString())
      .lt("start_at", range.currentEnd.toISOString()),

    supabase
      .from("payments")
      .select("id, appointment_id, amount, refunded_amount, status, created_at, paid_at, appointment:appointments!payments_appointment_id_fkey(id, barber_id, barber:barbers!appointments_barber_id_fkey(id, display_name))")
      .gte("created_at", range.previousStart.toISOString())
      .lt("created_at", range.currentEnd.toISOString()),

    supabase
      .from("payments")
      .select("id, appointment_id, amount, refunded_amount, status, created_at, paid_at, appointment:appointments!payments_appointment_id_fkey(id, barber_id, barber:barbers!appointments_barber_id_fkey(id, display_name))")
      .not("paid_at", "is", null)
      .gte("paid_at", range.previousStart.toISOString())
      .lt("paid_at", range.currentEnd.toISOString()),

    supabase
      .from("accounts")
      .select("id, created_at")
      .eq("role", "user")
      .gte("created_at", range.previousStart.toISOString())
      .lt("created_at", range.currentEnd.toISOString()),

    supabase
      .from("appointment_services")
      .select("service_id, service_name, quantity, appointment:appointments!appointment_services_appointment_id_fkey!inner(status, start_at)")
      .gte("appointment.start_at", range.currentStart.toISOString())
      .lt("appointment.start_at", range.currentEnd.toISOString()),
  ]);

  const databaseError = appointmentsResult.error
    ?? paymentAttemptsResult.error
    ?? paidPaymentsResult.error
    ?? customersResult.error
    ?? servicesResult.error;

  if (databaseError) throw databaseError;

  const appointments = (appointmentsResult.data ?? []) as unknown as AppointmentRow[];
  const paymentAttempts = (paymentAttemptsResult.data ?? []) as unknown as PaymentRow[];
  const paidPayments = (paidPaymentsResult.data ?? []) as unknown as PaymentRow[];
  const customers = (customersResult.data ?? []) as AccountRow[];
  const serviceRows = (servicesResult.data ?? []) as unknown as ServiceRow[];

  const currentAppointments = appointments.filter((item) => isInRange(item.start_at, range.currentStart, range.currentEnd));
  const previousAppointments = appointments.filter((item) => isInRange(item.start_at, range.previousStart, range.previousEnd));
  const currentPaymentAttempts = paymentAttempts.filter((item) => isInRange(item.created_at, range.currentStart, range.currentEnd));
  const currentPaidPayments = paidPayments.filter((item) => isInRange(item.paid_at, range.currentStart, range.currentEnd));
  const previousPaidPayments = paidPayments.filter((item) => isInRange(item.paid_at, range.previousStart, range.previousEnd));
  const currentCustomers = customers.filter((item) => isInRange(item.created_at, range.currentStart, range.currentEnd));
  const previousCustomers = customers.filter((item) => isInRange(item.created_at, range.previousStart, range.previousEnd));

  const currentRevenue = getNetRevenue(currentPaidPayments);
  const previousRevenue = getNetRevenue(previousPaidPayments);
  const currentPaidAppointments = new Set(currentPaidPayments.map((item) => item.appointment_id)).size;
  const previousPaidAppointments = new Set(previousPaidPayments.map((item) => item.appointment_id)).size;
  const currentAverageOrder = currentPaidAppointments ? currentRevenue / currentPaidAppointments : 0;
  const previousAverageOrder = previousPaidAppointments ? previousRevenue / previousPaidAppointments : 0;
  const completedAppointments = currentAppointments.filter((item) => item.status === "completed").length;
  const cancelledAppointments = currentAppointments.filter((item) => item.status === "cancelled").length;
  const successfulPayments = currentPaymentAttempts.filter((item) => SUCCESS_PAYMENTS.has(item.status)).length;
  const failedPayments = currentPaymentAttempts.filter((item) => item.status === "failed" || item.status === "cancelled").length;

  const customerAppointments = new Map<string, number>();

  currentAppointments.forEach((appointment) => {
    if (!appointment.user_id || EXCLUDED_APPOINTMENTS.has(appointment.status)) return;

    customerAppointments.set(
      appointment.user_id,
      (customerAppointments.get(appointment.user_id) ?? 0) + 1,
    );
  });

  const repeatCustomers = [...customerAppointments.values()].filter((count) => count >= 2).length;
  const barberPerformance = new Map<string, { name: string; bookings: number; revenue: number }>();

  currentAppointments.forEach((appointment) => {
    if (EXCLUDED_APPOINTMENTS.has(appointment.status)) return;

    const barber = getSingle(appointment.barber);
    const item = barberPerformance.get(appointment.barber_id) ?? {
      name: barber?.display_name ?? "Unknown barber",
      bookings: 0,
      revenue: 0,
    };

    item.bookings += 1;
    barberPerformance.set(appointment.barber_id, item);
  });

  currentPaidPayments.forEach((payment) => {
    const appointment = getSingle(payment.appointment);
    if (!appointment) return;

    const barber = getSingle(appointment.barber);
    const item = barberPerformance.get(appointment.barber_id) ?? {
      name: barber?.display_name ?? "Unknown barber",
      bookings: 0,
      revenue: 0,
    };

    item.revenue += Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
    barberPerformance.set(appointment.barber_id, item);
  });

  const topBarber = [...barberPerformance.entries()]
    .sort(([, first], [, second]) => second.revenue - first.revenue || second.bookings - first.bookings)[0];

  const servicePerformance = new Map<string, { name: string; bookings: number }>();

  serviceRows.forEach((row) => {
    const appointment = getSingle(row.appointment);
    if (!appointment || EXCLUDED_APPOINTMENTS.has(appointment.status)) return;

    const key = row.service_id ?? row.service_name;
    const item = servicePerformance.get(key) ?? { name: row.service_name, bookings: 0 };

    item.bookings += Math.max(1, row.quantity);
    servicePerformance.set(key, item);
  });

  const topService = [...servicePerformance.entries()]
    .sort(([, first], [, second]) => second.bookings - first.bookings)[0];

  return {
    period,
    currency,
    timeZone,
    generatedAt: new Date().toISOString(),

    range: {
      currentStart: range.currentStart.toISOString(),
      currentEnd: range.currentEnd.toISOString(),
      previousStart: range.previousStart.toISOString(),
      previousEnd: range.previousEnd.toISOString(),
    },

    summary: {
      netRevenue: Math.round(currentRevenue),
      revenueGrowth: growth(currentRevenue, previousRevenue),
      appointments: currentAppointments.length,
      completedAppointments,
      newCustomers: currentCustomers.length,
      customerGrowth: growth(currentCustomers.length, previousCustomers.length),
      paymentSuccessRate: percentage(successfulPayments, currentPaymentAttempts.length),
      failedPayments,
      topBarber: topBarber
        ? { id: topBarber[0], ...topBarber[1], revenue: Math.round(topBarber[1].revenue) }
        : null,
      topService: topService
        ? { id: topService[0], ...topService[1] }
        : null,
    },

    kpis: {
      revenueGrowth: growth(currentRevenue, previousRevenue),
      currentRevenue: Math.round(currentRevenue),
      previousRevenue: Math.round(previousRevenue),
      repeatBookingRate: percentage(repeatCustomers, customerAppointments.size),
      repeatCustomers,
      completionRate: percentage(completedAppointments, currentAppointments.length),
      paymentSuccessRate: percentage(successfulPayments, currentPaymentAttempts.length),
      averageAppointmentValue: Math.round(currentAverageOrder),
      previousAverageAppointmentValue: Math.round(previousAverageOrder),
      averageAppointmentGrowth: growth(currentAverageOrder, previousAverageOrder),
      cancellationRate: percentage(cancelledAppointments, currentAppointments.length),
      cancelledAppointments,
    },

    scope: {
      appointmentsAnalyzed: currentAppointments.length,
      previousAppointmentsAnalyzed: previousAppointments.length,
      paymentAttempts: currentPaymentAttempts.length,
      paidTransactions: currentPaidPayments.length,
      serviceLines: serviceRows.length,
      newCustomers: currentCustomers.length,
    },
  };
}