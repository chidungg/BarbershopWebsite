import { createSupabaseAdminClient } from "../../lib/supabase";

const SERVICE_STATUSES = ["all", "active", "inactive"] as const;
const EXCLUDED_APPOINTMENT_STATUSES = new Set(["cancelled", "no_show"]);

export type ServiceStatusFilter = (typeof SERVICE_STATUSES)[number];

type CategoryRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type ServiceRow = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number | string;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  category: CategoryRow | CategoryRow[] | null;
};

type BarberAssignmentRow = {
  barber_id: string;
  service_id: string;
  is_active: boolean;
  barber: { id: string; is_active: boolean } | { id: string; is_active: boolean }[] | null;
};

type AppointmentServiceRow = {
  service_id: string | null;
  quantity: number;
  appointment: { start_at: string; status: string } | { start_at: string; status: string }[] | null;
};

type GetServicesInput = {
  search: string;
  categoryId: string;
  status: ServiceStatusFilter;
};

export function isServiceStatusFilter(value: string): value is ServiceStatusFilter {
  return (SERVICE_STATUSES as readonly string[]).includes(value);
}

function getSingle<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function calculateGrowth(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
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
  ) as Record<string, number>;

  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

function getMonthStart(year: number, month: number, timeZone: string) {
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  const guess = new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth(), 1));
  return new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone));
}

function getCurrentYearMonth(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  return { year: values.year, month: values.month };
}

export async function getAdminServices(input: GetServicesInput) {
  const supabase = createSupabaseAdminClient();
  const settingsResult = await supabase.from("shop_settings").select("timezone, currency").eq("id", 1).maybeSingle();

  if (settingsResult.error) throw settingsResult.error;

  const timeZone = settingsResult.data?.timezone?.trim() || "Asia/Ho_Chi_Minh";
  const currency = String(settingsResult.data?.currency ?? "VND").trim();
  const { year, month } = getCurrentYearMonth(timeZone);
  const previousMonthStart = getMonthStart(year, month - 1, timeZone);
  const currentMonthStart = getMonthStart(year, month, timeZone);
  const nextMonthStart = getMonthStart(year, month + 1, timeZone);

  const [servicesResult, categoriesResult, assignmentsResult, bookingsResult] = await Promise.all([
    supabase
      .from("services")
      .select(`
        id, category_id, name, description, base_price, duration_minutes, image_url, is_active, display_order,
        category:service_categories!services_category_id_fkey(id, name, is_active)
      `)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("service_categories").select("id, name, is_active").order("display_order", { ascending: true }).order("name", { ascending: true }),
    supabase
      .from("barber_services")
      .select(`
        barber_id, service_id, is_active,
        barber:barbers!barber_services_barber_id_fkey(id, is_active)
      `),
    supabase
      .from("appointment_services")
      .select(`
        service_id, quantity,
        appointment:appointments!inner(start_at, status)
      `)
      .gte("appointment.start_at", previousMonthStart.toISOString())
      .lt("appointment.start_at", nextMonthStart.toISOString()),
  ]);

  const databaseError = servicesResult.error ?? categoriesResult.error ?? assignmentsResult.error ?? bookingsResult.error;
  if (databaseError) throw databaseError;

  const services = (servicesResult.data ?? []) as unknown as ServiceRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const assignments = (assignmentsResult.data ?? []) as unknown as BarberAssignmentRow[];
  const bookingRows = (bookingsResult.data ?? []) as unknown as AppointmentServiceRow[];

  const assignedBarbersByService = new Map<string, Set<string>>();

  assignments.forEach((assignment) => {
    const barber = getSingle(assignment.barber);
    if (!assignment.is_active || !barber?.is_active) return;

    const assignedBarbers = assignedBarbersByService.get(assignment.service_id) ?? new Set<string>();
    assignedBarbers.add(assignment.barber_id);
    assignedBarbersByService.set(assignment.service_id, assignedBarbers);
  });

  const currentBookingsByService = new Map<string, number>();
  const previousBookingsByService = new Map<string, number>();

  bookingRows.forEach((row) => {
    const appointment = getSingle(row.appointment);
    if (!row.service_id || !appointment || EXCLUDED_APPOINTMENT_STATUSES.has(appointment.status)) return;

    const appointmentTime = new Date(appointment.start_at).getTime();
    const target = appointmentTime >= currentMonthStart.getTime() ? currentBookingsByService : previousBookingsByService;
    target.set(row.service_id, (target.get(row.service_id) ?? 0) + Math.max(1, row.quantity));
  });

  const items = services.map((service) => {
    const category = getSingle(service.category);

    return {
      id: service.id,
      name: service.name,
      description: service.description?.trim() ?? "",
      basePrice: Math.round(toNumber(service.base_price)),
      durationMinutes: service.duration_minutes,
      imageUrl: service.image_url?.trim() || null,
      isActive: service.is_active,
      displayOrder: service.display_order,
      category: category ? { id: category.id, name: category.name, isActive: category.is_active } : null,
      assignedBarbers: assignedBarbersByService.get(service.id)?.size ?? 0,
      monthlyBookings: currentBookingsByService.get(service.id) ?? 0,
    };
  });

  const activeServices = items.filter((service) => service.isActive);
  const monthlyBookings = [...currentBookingsByService.values()].reduce((total, count) => total + count, 0);
  const previousMonthlyBookings = [...previousBookingsByService.values()].reduce((total, count) => total + count, 0);
  const averagePrice = activeServices.length
    ? activeServices.reduce((total, service) => total + service.basePrice, 0) / activeServices.length
    : 0;

  const mostPopular = items.reduce<(typeof items)[number] | null>((current, service) => {
    if (!current || service.monthlyBookings > current.monthlyBookings) return service;
    return current;
  }, null);

  const normalizedSearch = input.search.trim().toLowerCase();

  const filteredItems = items.filter((service) => {
    const matchesCategory = !input.categoryId || service.category?.id === input.categoryId;
    const matchesStatus = input.status === "all" || (input.status === "active" ? service.isActive : !service.isActive);
    const searchable = `${service.id} ${service.name} ${service.description} ${service.category?.name ?? ""}`.toLowerCase();

    return matchesCategory && matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
  });

  return {
    currency,
    metrics: {
      totalServices: items.length,
      activeServices: activeServices.length,
      monthlyBookings,
      monthlyBookingsGrowth: calculateGrowth(monthlyBookings, previousMonthlyBookings),
      mostPopularService: mostPopular?.monthlyBookings
        ? { id: mostPopular.id, name: mostPopular.name, bookings: mostPopular.monthlyBookings }
        : null,
      averagePrice: Math.round(averagePrice),
    },
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      isActive: category.is_active,
    })),
    items: filteredItems,
  };
}