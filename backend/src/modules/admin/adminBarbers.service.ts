import { createSupabaseAdminClient } from "../../lib/supabase";

const BARBER_STATUSES = ["all", "active", "inactive"] as const;
const HCM_OFFSET_MS = 7 * 60 * 60 * 1000;
const BUSY_APPOINTMENT_STATUSES = ["confirmed", "checked_in", "in_progress"];

export type BarberStatusFilter = (typeof BARBER_STATUSES)[number];

type BarberRow = {
  id: string;
  account_id: string;
  display_name: string;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  experience_years: number;
  hired_at: string | null;
  is_active: boolean;
  rating_average: number | string;
  review_count: number;
};

type ServiceRow = { id: string; name: string; is_active: boolean };
type BarberServiceRow = { barber_id: string; service_id: string; is_active: boolean };
type AppointmentRow = { id: string; barber_id: string; start_at: string; end_at: string; status: string };
type ScheduleRow = { barber_id: string; start_time: string; end_time: string; valid_from: string; valid_to: string | null };
type ExceptionRow = { barber_id: string; is_working: boolean; start_time: string | null; end_time: string | null };
type TimeOffRow = { barber_id: string; starts_at: string; ends_at: string };
type PaymentRow = {
  amount: number | string;
  refunded_amount: number | string | null;
  appointment: { barber_id: string } | { barber_id: string }[] | null;
};

type GetBarbersInput = { search: string; status: BarberStatusFilter; serviceId: string };
type Shift = { start: string; end: string };

export type AdminBarberCreateInput = {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  bio: string;
  avatarUrl: string;
  experienceYears: number;
  hiredAt: string | null;
  serviceIds: string[];
};

export function isBarberStatusFilter(value: string): value is BarberStatusFilter {
  return (BARBER_STATUSES as readonly string[]).includes(value);
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toHcmDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - HCM_OFFSET_MS);
}

function getHcmParts(date: Date) {
  const local = new Date(date.getTime() + HCM_OFFSET_MS);

  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    dayOfWeek: local.getUTCDay(),
    time: `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}:${String(local.getUTCSeconds()).padStart(2, "0")}`,
  };
}

function getSingle<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function calculateGrowth(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function isWithinShift(time: string, shift: Shift) {
  return shift.start <= shift.end ? time >= shift.start && time < shift.end : time >= shift.start || time < shift.end;
}

function formatShift(shifts: Shift[]) {
  if (!shifts.length) return "No shift";
  return shifts.map((shift) => `${shift.start.slice(0, 5)} - ${shift.end.slice(0, 5)}`).join(", ");
}

export async function getAdminBarbers(input: GetBarbersInput) {
  const now = new Date();
  const local = getHcmParts(now);
  const today = formatDate(local.year, local.month, local.day);
  const currentMonthStart = toHcmDate(local.year, local.month, 1);
  const nextMonthStart = toHcmDate(local.year, local.month + 1, 1);
  const previousMonthStart = toHcmDate(local.year, local.month - 1, 1);
  const todayStart = toHcmDate(local.year, local.month, local.day);
  const tomorrowStart = toHcmDate(local.year, local.month, local.day + 1);
  const supabase = createSupabaseAdminClient();

  const [
    barbersResult,
    servicesResult,
    assignmentsResult,
    appointmentsResult,
    currentAppointmentsResult,
    paymentsResult,
    schedulesResult,
    exceptionsResult,
    timeOffResult,
    settingsResult,
  ] = await Promise.all([
    supabase.from("barbers").select("id, account_id, display_name, bio, phone, avatar_url, experience_years, hired_at, is_active, rating_average, review_count"),
    supabase.from("services").select("id, name, is_active").order("display_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("barber_services").select("barber_id, service_id, is_active").eq("is_active", true),
    supabase.from("appointments").select("id, barber_id, start_at, end_at, status").gte("start_at", previousMonthStart.toISOString()).lt("start_at", nextMonthStart.toISOString()),
    supabase.from("appointments").select("id, barber_id, start_at, end_at, status").in("status", BUSY_APPOINTMENT_STATUSES).lte("start_at", now.toISOString()).gt("end_at", now.toISOString()),
    supabase.from("payments").select("amount, refunded_amount, appointment:appointments!payments_appointment_id_fkey(barber_id)").not("paid_at", "is", null).gte("paid_at", currentMonthStart.toISOString()).lt("paid_at", nextMonthStart.toISOString()),
    supabase.from("barber_schedules").select("barber_id, start_time, end_time, valid_from, valid_to").eq("day_of_week", local.dayOfWeek).eq("is_active", true),
    supabase.from("barber_schedule_exceptions").select("barber_id, is_working, start_time, end_time").eq("exception_date", today),
    supabase.from("barber_time_off").select("barber_id, starts_at, ends_at").eq("status", "approved").lt("starts_at", tomorrowStart.toISOString()).gt("ends_at", todayStart.toISOString()),
    supabase.from("shop_settings").select("currency").eq("id", 1).maybeSingle(),
  ]);

  const error = barbersResult.error ?? servicesResult.error ?? assignmentsResult.error ?? appointmentsResult.error ?? currentAppointmentsResult.error ?? paymentsResult.error ?? schedulesResult.error ?? exceptionsResult.error ?? timeOffResult.error ?? settingsResult.error;
  if (error) throw error;

  const barbers = (barbersResult.data ?? []) as BarberRow[];
  const services = (servicesResult.data ?? []) as ServiceRow[];
  const assignments = (assignmentsResult.data ?? []) as BarberServiceRow[];
  const appointments = (appointmentsResult.data ?? []) as AppointmentRow[];
  const currentAppointments = (currentAppointmentsResult.data ?? []) as AppointmentRow[];
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[];
  const schedules = (schedulesResult.data ?? []) as ScheduleRow[];
  const exceptions = (exceptionsResult.data ?? []) as ExceptionRow[];
  const timeOff = (timeOffResult.data ?? []) as TimeOffRow[];

  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const servicesByBarber = new Map<string, ServiceRow[]>();

  assignments.forEach((assignment) => {
    const service = serviceMap.get(assignment.service_id);
    if (!service || !service.is_active) return;
    servicesByBarber.set(assignment.barber_id, [...(servicesByBarber.get(assignment.barber_id) ?? []), service]);
  });

  const currentBookings = new Map<string, number>();
  const previousBookings = new Map<string, number>();

  appointments.forEach((appointment) => {
    if (appointment.status === "cancelled") return;

    const startAt = new Date(appointment.start_at).getTime();
    const target = startAt >= currentMonthStart.getTime() ? currentBookings : previousBookings;

    target.set(appointment.barber_id, (target.get(appointment.barber_id) ?? 0) + 1);
  });

  const revenueByBarber = new Map<string, number>();

  payments.forEach((payment) => {
    const appointment = getSingle(payment.appointment);
    if (!appointment) return;

    const netRevenue = Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
    revenueByBarber.set(appointment.barber_id, (revenueByBarber.get(appointment.barber_id) ?? 0) + netRevenue);
  });

  const busyBarbers = new Set(currentAppointments.map((appointment) => appointment.barber_id));
  const timeOffByBarber = new Map<string, TimeOffRow[]>();

  timeOff.forEach((item) => {
    timeOffByBarber.set(item.barber_id, [...(timeOffByBarber.get(item.barber_id) ?? []), item]);
  });

  const exceptionByBarber = new Map(exceptions.map((item) => [item.barber_id, item]));

  const items = barbers.map((barber) => {
    const exception = exceptionByBarber.get(barber.id);

    const regularShifts = schedules
      .filter((schedule) => schedule.barber_id === barber.id && schedule.valid_from <= today && (!schedule.valid_to || schedule.valid_to >= today))
      .map((schedule) => ({ start: schedule.start_time, end: schedule.end_time }));

    const shifts = exception
      ? exception.is_working && exception.start_time && exception.end_time
        ? [{ start: exception.start_time, end: exception.end_time }]
        : []
      : regularShifts;

    const barberTimeOff = timeOffByBarber.get(barber.id) ?? [];
    const isOffNow = barberTimeOff.some((item) => new Date(item.starts_at) <= now && new Date(item.ends_at) > now);
    const scheduledToday = barber.is_active && shifts.length > 0 && barberTimeOff.length === 0;

    let availability = "off_shift";

    if (!barber.is_active) availability = "inactive";
    else if (isOffNow) availability = "time_off";
    else if (busyBarbers.has(barber.id)) availability = "in_service";
    else if (!shifts.length) availability = "day_off";
    else if (shifts.some((shift) => isWithinShift(local.time, shift))) availability = "available";

    return {
      id: barber.id,
      accountId: barber.account_id,
      displayName: barber.display_name,
      bio: barber.bio ?? "",
      phone: barber.phone ?? "",
      avatarUrl: barber.avatar_url?.trim() || null,
      experienceYears: barber.experience_years,
      hiredAt: barber.hired_at,
      isActive: barber.is_active,
      ratingAverage: toNumber(barber.rating_average),
      reviewCount: barber.review_count,
      assignedServices: servicesByBarber.get(barber.id) ?? [],
      monthlyBookings: currentBookings.get(barber.id) ?? 0,
      monthlyRevenue: Math.round(revenueByBarber.get(barber.id) ?? 0),
      availability,
      todayShift: formatShift(shifts),
      scheduledToday,
    };
  });

  const activeBarbers = items.filter((barber) => barber.isActive).length;
  const availableToday = items.filter((barber) => barber.scheduledToday).length;
  const totalReviews = items.reduce((total, barber) => total + barber.reviewCount, 0);
  const weightedRating = items.reduce((total, barber) => total + barber.ratingAverage * barber.reviewCount, 0);
  const monthlyBookings = [...currentBookings.values()].reduce((total, count) => total + count, 0);
  const previousMonthlyBookings = [...previousBookings.values()].reduce((total, count) => total + count, 0);
  const normalizedSearch = input.search.trim().toLowerCase();

  const filteredItems = items
    .filter((barber) => {
      const matchesStatus = input.status === "all" || (input.status === "active" ? barber.isActive : !barber.isActive);
      const matchesService = !input.serviceId || barber.assignedServices.some((service) => service.id === input.serviceId);
      const searchable = `${barber.displayName} ${barber.phone} ${barber.assignedServices.map((service) => service.name).join(" ")}`.toLowerCase();

      return matchesStatus && matchesService && (!normalizedSearch || searchable.includes(normalizedSearch));
    })
    .sort((first, second) => Number(second.isActive) - Number(first.isActive) || first.displayName.localeCompare(second.displayName));

  return {
    currency: String(settingsResult.data?.currency ?? "VND").trim(),
    metrics: {
      totalBarbers: items.length,
      activeBarbers,
      availableToday,
      availablePercentage: activeBarbers ? Math.round((availableToday / activeBarbers) * 1000) / 10 : 0,
      averageRating: totalReviews ? Math.round((weightedRating / totalReviews) * 100) / 100 : 0,
      totalReviews,
      monthlyBookings,
      monthlyBookingsGrowth: calculateGrowth(monthlyBookings, previousMonthlyBookings),
    },
    services: services.filter((service) => service.is_active).map(({ id, name }) => ({ id, name })),
    items: filteredItems.map(({ scheduledToday, ...barber }) => barber),
  };
}
async function cleanupCreatedBarber(supabase: ReturnType<typeof createSupabaseAdminClient>, accountId: string, barberId?: string) {
  if (barberId) {
    await supabase.from("barber_services").delete().eq("barber_id", barberId);
    await supabase.from("barbers").delete().eq("id", barberId);
  }

  await supabase.from("users").delete().eq("id", accountId);
  await supabase.from("accounts").delete().eq("id", accountId);
  await supabase.auth.admin.deleteUser(accountId);
}

export async function createAdminBarber(input: AdminBarberCreateInput) {
  const supabase = createSupabaseAdminClient();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const serviceIds = [...new Set(input.serviceIds)];

  const { data: existingAccount, error: accountCheckError } = await supabase.from("accounts").select("id").eq("email", email).maybeSingle();
  if (accountCheckError) throw accountCheckError;
  if (existingAccount) return { conflict: "email" as const, barber: null };

  if (phone) {
    const { data: existingUser, error: phoneCheckError } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle();
    if (phoneCheckError) throw phoneCheckError;
    if (existingUser) return { conflict: "phone" as const, barber: null };
  }

  if (serviceIds.length) {
    const { data: services, error } = await supabase.from("services").select("id").in("id", serviceIds).eq("is_active", true);
    if (error) throw error;
    if ((services ?? []).length !== serviceIds.length) return { conflict: "service" as const, barber: null };
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.displayName,
      phone,
      avatar_url: input.avatarUrl || null,
    },
  });

  if (authError) {
    const message = authError.message.toLowerCase();
    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      return { conflict: "email" as const, barber: null };
    }
    throw authError;
  }

  if (!authData.user) throw new Error("Supabase did not return the created user");

  const accountId = authData.user.id;
  let barberId = "";

  try {
    const { data: account, error: roleError } = await supabase.from("accounts")
      .update({ role: "barber", status: "active", updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .select("id")
      .maybeSingle();

    if (roleError || !account) throw roleError ?? new Error("Barber account was not created");

    const { data: barber, error: barberError } = await supabase.from("barbers").insert({
      account_id: accountId,
      display_name: input.displayName,
      bio: input.bio || null,
      phone: phone || null,
      avatar_url: input.avatarUrl || null,
      experience_years: input.experienceYears,
      hired_at: input.hiredAt,
      is_active: true,
    }).select("id").single();

    if (barberError) throw barberError;
    barberId = barber.id;

    if (serviceIds.length) {
      const { error: servicesError } = await supabase.from("barber_services").insert(
        serviceIds.map((serviceId) => ({ barber_id: barberId, service_id: serviceId, is_active: true })),
      );
      if (servicesError) throw servicesError;
    }

    const { error: userDeleteError } = await supabase.from("users").delete().eq("id", accountId);
    if (userDeleteError) throw userDeleteError;

    return { conflict: null, barber: { id: barberId, accountId } };
  } catch (error) {
    await cleanupCreatedBarber(supabase, accountId, barberId || undefined);
    throw error;
  }
}