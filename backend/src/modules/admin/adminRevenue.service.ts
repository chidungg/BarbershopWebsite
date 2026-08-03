import { createSupabaseAdminClient } from "../../lib/supabase";

const REVENUE_PERIODS = ["week", "month", "quarter", "year"] as const;
const DAY_IN_MS = 86_400_000;

export type RevenuePeriod = (typeof REVENUE_PERIODS)[number];

type ServiceLine = {
  service_name: string;
  unit_price: number | string;
  quantity: number;
};

type RevenuePayment = {
  appointment_id: string;
  amount: number | string;
  refunded_amount: number | string | null;
  method: string;
  paid_at: string;
  appointment: {
    barber: {
      id: string;
      display_name: string;
      is_active: boolean;
    } | null;
    services: ServiceLine[] | null;
  } | null;
};

export function isRevenuePeriod(value: string): value is RevenuePeriod {
  return (REVENUE_PERIODS as readonly string[]).includes(value);
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getPeriodStart(date: Date, period: RevenuePeriod) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "month") start.setDate(1);

  if (period === "quarter") {
    start.setDate(1);
    start.setMonth(Math.floor(start.getMonth() / 3) * 3);
  }

  if (period === "year") start.setMonth(0, 1);
  return start;
}

function shiftPeriod(date: Date, period: RevenuePeriod, amount: number) {
  const shifted = new Date(date);

  if (period === "week") shifted.setDate(shifted.getDate() + amount * 7);
  if (period === "month") shifted.setMonth(shifted.getMonth() + amount);
  if (period === "quarter") shifted.setMonth(shifted.getMonth() + amount * 3);
  if (period === "year") shifted.setFullYear(shifted.getFullYear() + amount);

  return shifted;
}

function getTrendLabels(period: RevenuePeriod, start: Date) {
  if (period === "week") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (period === "month") return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  const monthCount = period === "quarter" ? 3 : 12;
  const formatter = new Intl.DateTimeFormat("en", { month: "short" });

  return Array.from({ length: monthCount }, (_, index) => {
    return formatter.format(new Date(start.getFullYear(), start.getMonth() + index, 1));
  });
}

function getBucketIndex(date: Date, start: Date, period: RevenuePeriod) {
  if (period === "week") return Math.floor((date.getTime() - start.getTime()) / DAY_IN_MS);
  if (period === "month") return Math.floor((date.getDate() - 1) / 7);

  return (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
}

function calculateGrowth(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function getTotals(payments: RevenuePayment[]) {
  const gross = payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const refunded = payments.reduce((total, payment) => total + toNumber(payment.refunded_amount), 0);
  const orderCount = new Set(payments.map((payment) => payment.appointment_id)).size;

  return {
    gross,
    refunded,
    net: gross - refunded,
    averageOrder: orderCount ? gross / orderCount : 0,
  };
}

function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    bank_transfer: "Bank transfer",
    qr: "QR payment",
    qr_payment: "QR payment",
    cash: "Cash",
    card: "Card",
    momo: "MoMo",
    vnpay: "VNPay",
  };

  return labels[method] ?? method
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function getRevenueData(period: RevenuePeriod) {
  const now = new Date();
  const currentStart = getPeriodStart(now, period);
  const previousStart = shiftPeriod(currentStart, period, -1);
  const elapsedTime = now.getTime() - currentStart.getTime();
  const previousEnd = new Date(Math.min(currentStart.getTime(), previousStart.getTime() + elapsedTime));
  const supabaseAdminClient = createSupabaseAdminClient();

  const [paymentsResult, settingsResult] = await Promise.all([
    supabaseAdminClient
      .from("payments")
      .select(`
        appointment_id,
        amount,
        refunded_amount,
        method,
        paid_at,
        appointment:appointments!payments_appointment_id_fkey(
          barber:barbers!appointments_barber_id_fkey(id, display_name, is_active),
          services:appointment_services!appointment_services_appointment_id_fkey(
            service_name,
            unit_price,
            quantity
          )
        )
      `)
      .not("paid_at", "is", null)
      .gte("paid_at", previousStart.toISOString())
      .lte("paid_at", now.toISOString())
      .order("paid_at", { ascending: true }),
    supabaseAdminClient.from("shop_settings").select("currency").eq("id", 1).maybeSingle(),
  ]);

  const databaseError = paymentsResult.error ?? settingsResult.error;
  if (databaseError) throw databaseError;

  const payments = (paymentsResult.data ?? []) as unknown as RevenuePayment[];

  const isInRange = (payment: RevenuePayment, start: Date, end: Date) => {
    const paidAt = new Date(payment.paid_at).getTime();
    return paidAt >= start.getTime() && paidAt < end.getTime();
  };

  const currentPayments = payments.filter((payment) => isInRange(payment, currentStart, now));
  const previousPayments = payments.filter((payment) => isInRange(payment, previousStart, previousEnd));
  const currentTotals = getTotals(currentPayments);
  const previousTotals = getTotals(previousPayments);

  const labels = getTrendLabels(period, currentStart);
  const currentTrend = Array<number>(labels.length).fill(0);
  const previousTrend = Array<number>(labels.length).fill(0);

  currentPayments.forEach((payment) => {
    const index = getBucketIndex(new Date(payment.paid_at), currentStart, period);
    if (index >= 0 && index < currentTrend.length) currentTrend[index] += toNumber(payment.amount);
  });

  previousPayments.forEach((payment) => {
    const index = getBucketIndex(new Date(payment.paid_at), previousStart, period);
    if (index >= 0 && index < previousTrend.length) previousTrend[index] += toNumber(payment.amount);
  });

  const paymentMethodMap = new Map<string, number>();

  currentPayments.forEach((payment) => {
    const currentAmount = paymentMethodMap.get(payment.method) ?? 0;
    paymentMethodMap.set(payment.method, currentAmount + toNumber(payment.amount));
  });

  let paymentMethods = [...paymentMethodMap]
    .map(([method, amount]) => ({ method: formatPaymentMethod(method), amount }))
    .sort((first, second) => second.amount - first.amount);

  if (paymentMethods.length > 4) {
    const otherAmount = paymentMethods.slice(3).reduce((total, item) => total + item.amount, 0);
    paymentMethods = [...paymentMethods.slice(0, 3), { method: "Other", amount: otherAmount }];
  }

  const currentAppointments = new Map<string, { gross: number; payment: RevenuePayment }>();

  currentPayments.forEach((payment) => {
    const existing = currentAppointments.get(payment.appointment_id);

    if (existing) {
      existing.gross += toNumber(payment.amount);
      return;
    }

    currentAppointments.set(payment.appointment_id, {
      gross: toNumber(payment.amount),
      payment,
    });
  });

  const serviceMap = new Map<string, number>();

  currentAppointments.forEach(({ gross, payment }) => {
    const services = payment.appointment?.services ?? [];
    const serviceTotal = services.reduce((total, service) => {
      return total + toNumber(service.unit_price) * service.quantity;
    }, 0);

    if (!serviceTotal) return;

    services.forEach((service) => {
      const lineTotal = toNumber(service.unit_price) * service.quantity;
      const allocatedRevenue = gross * (lineTotal / serviceTotal);
      const currentRevenue = serviceMap.get(service.service_name) ?? 0;

      serviceMap.set(service.service_name, currentRevenue + allocatedRevenue);
    });
  });

  let services = [...serviceMap]
    .map(([name, amount]) => ({ name, amount }))
    .sort((first, second) => second.amount - first.amount);

  if (services.length > 5) {
    const otherAmount = services.slice(4).reduce((total, service) => total + service.amount, 0);
    services = [...services.slice(0, 4), { name: "Other services", amount: otherAmount }];
  }

  const totalServiceRevenue = services.reduce((total, service) => total + service.amount, 0);

  const barberMap = new Map<string, {
    name: string;
    isActive: boolean;
    currentRevenue: number;
    previousRevenue: number;
    bookings: Set<string>;
  }>();

  const addBarberRevenue = (payment: RevenuePayment, isCurrentPeriod: boolean) => {
    const barber = payment.appointment?.barber;
    if (!barber) return;

    const entry = barberMap.get(barber.id) ?? {
      name: barber.display_name,
      isActive: barber.is_active,
      currentRevenue: 0,
      previousRevenue: 0,
      bookings: new Set<string>(),
    };

    if (isCurrentPeriod) {
      entry.currentRevenue += toNumber(payment.amount);
      entry.bookings.add(payment.appointment_id);
    } else {
      entry.previousRevenue += toNumber(payment.amount);
    }

    barberMap.set(barber.id, entry);
  };

  currentPayments.forEach((payment) => addBarberRevenue(payment, true));
  previousPayments.forEach((payment) => addBarberRevenue(payment, false));

  return {
    period,
    currency: String(settingsResult.data?.currency ?? "VND").trim(),
    metrics: {
      grossRevenue: {
        value: Math.round(currentTotals.gross),
        growth: calculateGrowth(currentTotals.gross, previousTotals.gross),
      },
      netRevenue: {
        value: Math.round(currentTotals.net),
        growth: calculateGrowth(currentTotals.net, previousTotals.net),
      },
      refunded: {
        value: Math.round(currentTotals.refunded),
        growth: calculateGrowth(currentTotals.refunded, previousTotals.refunded),
      },
      averageOrder: {
        value: Math.round(currentTotals.averageOrder),
        growth: calculateGrowth(currentTotals.averageOrder, previousTotals.averageOrder),
      },
    },
    trend: labels.map((label, index) => ({
      label,
      current: Math.round(currentTrend[index]),
      previous: Math.round(previousTrend[index]),
    })),
    paymentMethods: paymentMethods.map((item) => ({
      ...item,
      amount: Math.round(item.amount),
      percentage: currentTotals.gross
        ? Math.round((item.amount / currentTotals.gross) * 1000) / 10
        : 0,
    })),
    services: services.map((service) => ({
      ...service,
      amount: Math.round(service.amount),
      percentage: totalServiceRevenue
        ? Math.round((service.amount / totalServiceRevenue) * 1000) / 10
        : 0,
    })),
    barbers: [...barberMap.entries()]
      .filter(([, barber]) => barber.currentRevenue > 0)
      .sort(([, first], [, second]) => second.currentRevenue - first.currentRevenue)
      .slice(0, 4)
      .map(([id, barber]) => ({
        id,
        name: barber.name,
        isActive: barber.isActive,
        bookings: barber.bookings.size,
        revenue: Math.round(barber.currentRevenue),
        growth: calculateGrowth(barber.currentRevenue, barber.previousRevenue),
      })),
  };
}