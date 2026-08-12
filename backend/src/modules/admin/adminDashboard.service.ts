import { createSupabaseAdminClient } from "../../lib/supabase";

const DASHBOARD_PERIODS = ["week", "month", "quarter", "year"] as const;
const SUCCESS_PAYMENT_STATUSES = new Set(["paid", "partially_refunded", "refunded"]);
const VALID_APPOINTMENTS = new Set(["pending", "confirmed", "checked_in", "in_progress", "completed"]);

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

type BarberRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  experience_years: number;
  rating_average: number | string;
  review_count: number;
  hired_at: string | null;
  is_active: boolean;
};

type UserRow = { avatar_url: string | null };

type AppointmentServiceRow = {
  service_name: string;
  quantity: number;
};

type AppointmentRow = {
  id: string;
  booking_code: string;
  user_id: string | null;
  barber_id: string;
  start_at: string;
  end_at: string;
  status: string;
  customer_name: string;
  total_amount: number | string;
  currency: string;
  user: UserRow | UserRow[] | null;
  barber: Pick<BarberRow, "id" | "display_name"> | Pick<BarberRow, "id" | "display_name">[] | null;
  services: AppointmentServiceRow[] | null;
};

type PaymentAppointmentRow = {
  id: string;
  barber_id: string;
};

type PaymentRow = {
  appointment_id: string;
  amount: number | string;
  refunded_amount: number | string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  appointment: PaymentAppointmentRow | PaymentAppointmentRow[] | null;
};

type AccountRow = {
  id: string;
  created_at: string;
};

type PeriodRange = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

export function isDashboardPeriod(value: string): value is DashboardPeriod {
  return (DASHBOARD_PERIODS as readonly string[]).includes(value);
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

function growth(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return round(((current - previous) / previous) * 100);
}

function percentage(value: number, total: number) {
  return total ? round((value / total) * 100) : 0;
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
  const normalized = new Date(Date.UTC(year, month - 1, day));
  const guess = new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth(), normalized.getUTCDate()));
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

function getPeriodStart(now: Date, period: DashboardPeriod, timeZone: string) {
  const local = getLocalParts(now, timeZone);

  if (period === "week") return localMidnightToUtc(local.year, local.month, local.day - ((local.dayOfWeek + 6) % 7), timeZone);
  if (period === "month") return localMidnightToUtc(local.year, local.month, 1, timeZone);
  if (period === "quarter") return localMidnightToUtc(local.year, Math.floor((local.month - 1) / 3) * 3 + 1, 1, timeZone);
  return localMidnightToUtc(local.year, 1, 1, timeZone);
}

function shiftPeriod(start: Date, period: DashboardPeriod, amount: number, timeZone: string) {
  const local = getLocalParts(start, timeZone);

  if (period === "week") return localMidnightToUtc(local.year, local.month, local.day + amount * 7, timeZone);
  if (period === "month") return localMidnightToUtc(local.year, local.month + amount, 1, timeZone);
  if (period === "quarter") return localMidnightToUtc(local.year, local.month + amount * 3, 1, timeZone);
  return localMidnightToUtc(local.year + amount, 1, 1, timeZone);
}

function getPeriodRange(period: DashboardPeriod, timeZone: string): PeriodRange {
  const currentEnd = new Date();
  const currentStart = getPeriodStart(currentEnd, period, timeZone);
  const previousStart = shiftPeriod(currentStart, period, -1, timeZone);
  const elapsed = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(Math.min(currentStart.getTime(), previousStart.getTime() + elapsed));

  return { currentStart, currentEnd, previousStart, previousEnd };
}

function isInRange(value: string | null, start: Date, end: Date) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function getSeriesLabels(period: DashboardPeriod, start: Date, timeZone: string) {
  if (period === "week") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (period === "month") return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  const count = period === "quarter" ? 3 : 12;
  const startParts = getLocalParts(start, timeZone);
  const formatter = new Intl.DateTimeFormat("en", { month: "short" });

  return Array.from({ length: count }, (_, index) => {
    return formatter.format(new Date(Date.UTC(startParts.year, startParts.month - 1 + index, 1)));
  });
}

function getBucketIndex(value: string, start: Date, period: DashboardPeriod, timeZone: string) {
  const date = new Date(value);
  const local = getLocalParts(date, timeZone);
  const startLocal = getLocalParts(start, timeZone);

  if (period === "week") {
    const localDate = Date.UTC(local.year, local.month - 1, local.day);
    const startDate = Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day);
    return Math.floor((localDate - startDate) / 86_400_000);
  }

  if (period === "month") return Math.floor((local.day - 1) / 7);

  return (local.year - startLocal.year) * 12 + local.month - startLocal.month;
}

function buildRevenueSeries(payments: PaymentRow[], start: Date, period: DashboardPeriod, timeZone: string) {
  const labels = getSeriesLabels(period, start, timeZone);
  const values = Array<number>(labels.length).fill(0);

  payments.forEach((payment) => {
    if (!payment.paid_at) return;

    const index = getBucketIndex(payment.paid_at, start, period, timeZone);
    if (index < 0 || index >= values.length) return;

    values[index] += Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
  });

  return labels.map((label, index) => ({ label, value: Math.round(values[index]) }));
}

function netRevenue(payments: PaymentRow[]) {
  return payments.reduce((total, payment) => {
    return total + Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
  }, 0);
}

export async function getAdminDashboard(period: DashboardPeriod) {
  const supabase = createSupabaseAdminClient();

  const settingsResult = await supabase.from("shop_settings").select("timezone, currency").eq("id", 1).maybeSingle();
  if (settingsResult.error) throw settingsResult.error;

  const timeZone = settingsResult.data?.timezone?.trim() || "Asia/Ho_Chi_Minh";
  const currency = String(settingsResult.data?.currency ?? "VND").trim();
  const range = getPeriodRange(period, timeZone);

  const now = new Date();
  const todayParts = getLocalParts(now, timeZone);
  const todayStart = localMidnightToUtc(todayParts.year, todayParts.month, todayParts.day, timeZone);
  const tomorrowStart = localMidnightToUtc(todayParts.year, todayParts.month, todayParts.day + 1, timeZone);
  const yesterdayStart = localMidnightToUtc(todayParts.year, todayParts.month, todayParts.day - 1, timeZone);

  const [appointmentsResult, todayAppointmentsResult, paymentsResult, paymentAttemptsResult, usersResult, barbersResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, booking_code, user_id, barber_id, start_at, end_at, status, customer_name, total_amount, currency")
      .gte("start_at", range.previousStart.toISOString())
      .lt("start_at", range.currentEnd.toISOString()),

    supabase
      .from("appointments")
      .select(`
        id, booking_code, user_id, barber_id, start_at, end_at, status, customer_name, total_amount, currency,
        user:users!appointments_user_id_fkey(avatar_url),
        barber:barbers!appointments_barber_id_fkey(id, display_name),
        services:appointment_services!appointment_services_appointment_id_fkey(service_name, quantity)
      `)
      .gte("start_at", yesterdayStart.toISOString())
      .lt("start_at", tomorrowStart.toISOString())
      .order("start_at", { ascending: true }),

    supabase
      .from("payments")
      .select("appointment_id, amount, refunded_amount, status, created_at, paid_at, appointment:appointments!payments_appointment_id_fkey(id, barber_id)")
      .not("paid_at", "is", null)
      .gte("paid_at", range.previousStart.toISOString())
      .lt("paid_at", range.currentEnd.toISOString()),

    supabase
      .from("payments")
      .select("appointment_id, amount, refunded_amount, status, created_at, paid_at")
      .gte("created_at", range.currentStart.toISOString())
      .lt("created_at", range.currentEnd.toISOString()),

    supabase.from("accounts").select("id, created_at").eq("role", "user"),

    supabase
      .from("barbers")
      .select("id, display_name, avatar_url, experience_years, rating_average, review_count, hired_at, is_active"),
  ]);

  const databaseError = appointmentsResult.error ?? todayAppointmentsResult.error ?? paymentsResult.error
    ?? paymentAttemptsResult.error ?? usersResult.error ?? barbersResult.error;

  if (databaseError) throw databaseError;

  const appointments = (appointmentsResult.data ?? []) as unknown as AppointmentRow[];
  const todayAndYesterday = (todayAppointmentsResult.data ?? []) as unknown as AppointmentRow[];
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[];
  const paymentAttempts = (paymentAttemptsResult.data ?? []) as unknown as PaymentRow[];
  const users = (usersResult.data ?? []) as AccountRow[];
  const barbers = (barbersResult.data ?? []) as BarberRow[];

  const currentAppointments = appointments.filter((item) => isInRange(item.start_at, range.currentStart, range.currentEnd));
  const previousAppointments = appointments.filter((item) => isInRange(item.start_at, range.previousStart, range.previousEnd));
  const currentPayments = payments.filter((item) => isInRange(item.paid_at, range.currentStart, range.currentEnd));
  const previousPayments = payments.filter((item) => isInRange(item.paid_at, range.previousStart, range.previousEnd));
  const currentRevenue = netRevenue(currentPayments);
  const previousRevenue = netRevenue(previousPayments);

  const todayAppointments = todayAndYesterday.filter((item) => isInRange(item.start_at, todayStart, tomorrowStart));
  const yesterdayAppointments = todayAndYesterday.filter((item) => isInRange(item.start_at, yesterdayStart, todayStart));
  const newUsersCurrent = users.filter((user) => isInRange(user.created_at, range.currentStart, range.currentEnd)).length;
  const newUsersPrevious = users.filter((user) => isInRange(user.created_at, range.previousStart, range.previousEnd)).length;
  const newBarbersCurrent = barbers.filter((barber) => barber.hired_at && isInRange(`${barber.hired_at}T00:00:00Z`, range.currentStart, range.currentEnd)).length;
  const newBarbersPrevious = barbers.filter((barber) => barber.hired_at && isInRange(`${barber.hired_at}T00:00:00Z`, range.previousStart, range.previousEnd)).length;

  const statusCounts = {
    completed: currentAppointments.filter((item) => item.status === "completed").length,
    active: currentAppointments.filter((item) => ["confirmed", "checked_in", "in_progress"].includes(item.status)).length,
    pending: currentAppointments.filter((item) => item.status === "pending").length,
    cancelled: currentAppointments.filter((item) => ["cancelled", "no_show"].includes(item.status)).length,
  };

  const statusTotal = Object.values(statusCounts).reduce((total, value) => total + value, 0);

  const barberPerformance = new Map<string, { bookings: number; revenue: number }>();

  currentAppointments.forEach((appointment) => {
    if (!VALID_APPOINTMENTS.has(appointment.status)) return;

    const item = barberPerformance.get(appointment.barber_id) ?? { bookings: 0, revenue: 0 };
    item.bookings += 1;
    barberPerformance.set(appointment.barber_id, item);
  });

  currentPayments.forEach((payment) => {
    const appointment = getSingle(payment.appointment);
    if (!appointment) return;

    const item = barberPerformance.get(appointment.barber_id) ?? { bookings: 0, revenue: 0 };
    item.revenue += Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
    barberPerformance.set(appointment.barber_id, item);
  });

  const barberMap = new Map(barbers.map((barber) => [barber.id, barber]));

  const topBarbers = [...barberPerformance.entries()]
    .map(([id, performance]) => {
      const barber = barberMap.get(id);

      return {
        id,
        name: barber?.display_name ?? "Unknown barber",
        avatarUrl: barber?.avatar_url?.trim() || null,
        experienceYears: barber?.experience_years ?? 0,
        rating: toNumber(barber?.rating_average ?? 0),
        reviewCount: barber?.review_count ?? 0,
        bookings: performance.bookings,
        revenue: Math.round(performance.revenue),
      };
    })
    .sort((first, second) => second.revenue - first.revenue || second.bookings - first.bookings)
    .slice(0, 3);

  const successfulPaymentAttempts = paymentAttempts.filter((payment) => SUCCESS_PAYMENT_STATUSES.has(payment.status)).length;
  const totalReviews = barbers.reduce((total, barber) => total + barber.review_count, 0);
  const weightedRating = barbers.reduce((total, barber) => total + toNumber(barber.rating_average) * barber.review_count, 0);
  const completedAppointments = currentAppointments.filter((appointment) => appointment.status === "completed").length;

  const recentAppointments = todayAppointments
    .sort((first, second) => new Date(first.start_at).getTime() - new Date(second.start_at).getTime())
    .slice(0, 5)
    .map((appointment) => {
      const user = getSingle(appointment.user);
      const barber = getSingle(appointment.barber);

      return {
        id: appointment.id,
        bookingCode: appointment.booking_code,
        customerName: appointment.customer_name,
        customerAvatarUrl: user?.avatar_url?.trim() || null,
        barberName: barber?.display_name ?? "Unknown barber",
        services: (appointment.services ?? []).map((service) => service.quantity > 1 ? `${service.service_name} ×${service.quantity}` : service.service_name),
        startAt: appointment.start_at,
        amount: Math.round(toNumber(appointment.total_amount)),
        currency: appointment.currency.trim(),
        status: appointment.status,
      };
    });

  return {
    period,
    timeZone,
    currency,

    summary: {
      revenue: {
        value: Math.round(currentRevenue),
        growth: growth(currentRevenue, previousRevenue),
      },
      users: {
        value: users.length,
        growth: growth(newUsersCurrent, newUsersPrevious),
        newCount: newUsersCurrent,
      },
      activeBarbers: {
        value: barbers.filter((barber) => barber.is_active).length,
        growth: growth(newBarbersCurrent, newBarbersPrevious),
        newCount: newBarbersCurrent,
      },
      appointmentsToday: {
        value: todayAppointments.length,
        growth: growth(todayAppointments.length, yesterdayAppointments.length),
      },
    },

    revenue: {
      value: Math.round(currentRevenue),
      growth: growth(currentRevenue, previousRevenue),
      series: buildRevenueSeries(currentPayments, range.currentStart, period, timeZone),
      previousSeries: buildRevenueSeries(previousPayments, range.previousStart, period, timeZone),
    },

    appointmentStatuses: {
      total: statusTotal,
      items: [
        { key: "completed", label: "Completed", count: statusCounts.completed, percentage: percentage(statusCounts.completed, statusTotal) },
        { key: "confirmed", label: "Active / confirmed", count: statusCounts.active, percentage: percentage(statusCounts.active, statusTotal) },
        { key: "pending", label: "Pending", count: statusCounts.pending, percentage: percentage(statusCounts.pending, statusTotal) },
        { key: "cancelled", label: "Cancelled / no-show", count: statusCounts.cancelled, percentage: percentage(statusCounts.cancelled, statusTotal) },
      ],
    },

    recentAppointments,
    topBarbers,

    insights: {
      successfulPayments: {
        amount: Math.round(currentRevenue),
        rate: percentage(successfulPaymentAttempts, paymentAttempts.length),
      },
      newCustomers: {
        count: newUsersCurrent,
        growth: growth(newUsersCurrent, newUsersPrevious),
      },
      averageRating: {
        value: totalReviews ? round(weightedRating / totalReviews) : 0,
        reviews: totalReviews,
      },
      completionRate: {
        value: percentage(completedAppointments, currentAppointments.length),
        completed: completedAppointments,
      },
    },
  };
}