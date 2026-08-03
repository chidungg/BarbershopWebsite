import { createSupabaseAdminClient } from "../../lib/supabase";

const USER_STATUSES = ["all", "active", "inactive", "blocked"] as const;
const USER_SORTS = ["newest", "oldest", "spending"] as const;

export type UserStatusFilter = (typeof USER_STATUSES)[number];
export type UserSort = (typeof USER_SORTS)[number];

type PaymentRow = {
  amount: number | string;
  refunded_amount: number | string | null;
  paid_at: string | null;
};

type AppointmentRow = {
  id: string;
  payments: PaymentRow[] | null;
};

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  appointments: AppointmentRow[] | null;
};

type AccountRow = {
  id: string;
  email: string | null;
  status: string;
  created_at: string;
  profile: ProfileRow | ProfileRow[] | null;
};

type GetUsersInput = {
  query: string;
  status: UserStatusFilter;
  sort: UserSort;
  page: number;
  pageSize: number;
};

export function isUserStatusFilter(value: string): value is UserStatusFilter {
  return (USER_STATUSES as readonly string[]).includes(value);
}

export function isUserSort(value: string): value is UserSort {
  return (USER_SORTS as readonly string[]).includes(value);
}

function toNumber(value: number | string | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getProfile(profile: AccountRow["profile"]) {
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

function calculateGrowth(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function calculateSpending(appointments: AppointmentRow[]) {
  return appointments.reduce((appointmentTotal, appointment) => {
    const paymentTotal = (appointment.payments ?? []).reduce((total, payment) => {
      if (!payment.paid_at) return total;
      return total + Math.max(0, toNumber(payment.amount) - toNumber(payment.refunded_amount));
    }, 0);

    return appointmentTotal + paymentTotal;
  }, 0);
}

export async function getAdminUsers(input: GetUsersInput) {
  const supabaseAdminClient = createSupabaseAdminClient();

  const [accountsResult, settingsResult] = await Promise.all([
    supabaseAdminClient
      .from("accounts")
      .select(`
        id,
        email,
        status,
        created_at,
        profile:users!users_id_fkey(
          full_name,
          phone,
          avatar_url,
          appointments:appointments!appointments_user_id_fkey(
            id,
            payments:payments!payments_appointment_id_fkey(
              amount,
              refunded_amount,
              paid_at
            )
          )
        )
      `)
      .eq("role", "user"),
    supabaseAdminClient.from("shop_settings").select("currency").eq("id", 1).maybeSingle(),
  ]);

  const databaseError = accountsResult.error ?? settingsResult.error;
  if (databaseError) throw databaseError;

  const accounts = (accountsResult.data ?? []) as unknown as AccountRow[];
  const users = accounts.map((account) => {
    const profile = getProfile(account.profile);
    const appointments = profile?.appointments ?? [];
    const email = account.email?.trim() ?? "";
    const name = profile?.full_name?.trim() || email.split("@")[0] || "Unknown user";

    return {
      id: account.id,
      name,
      email,
      phone: profile?.phone?.trim() ?? "",
      avatarUrl: profile?.avatar_url?.trim() || null,
      appointments: appointments.length,
      spending: Math.round(calculateSpending(appointments)),
      joinedAt: account.created_at,
      status: String(account.status).trim().toLowerCase(),
    };
  });

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const activeUsers = users.filter((user) => user.status === "active").length;
  const blockedUsers = users.filter((user) => user.status === "blocked").length;
  const newThisMonth = users.filter((user) => new Date(user.joinedAt) >= currentMonthStart).length;
  const newPreviousMonth = users.filter((user) => {
    const joinedAt = new Date(user.joinedAt);
    return joinedAt >= previousMonthStart && joinedAt < currentMonthStart;
  }).length;

  const normalizedQuery = input.query.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesStatus = input.status === "all" || user.status === input.status;
    const searchableContent = `${user.id} ${user.name} ${user.email} ${user.phone}`.toLowerCase();
    return matchesStatus && (!normalizedQuery || searchableContent.includes(normalizedQuery));
  });

  filteredUsers.sort((first, second) => {
    if (input.sort === "oldest") return new Date(first.joinedAt).getTime() - new Date(second.joinedAt).getTime();
    if (input.sort === "spending") return second.spending - first.spending;
    return new Date(second.joinedAt).getTime() - new Date(first.joinedAt).getTime();
  });

  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const startIndex = (page - 1) * input.pageSize;

  return {
    currency: String(settingsResult.data?.currency ?? "VND").trim(),
    metrics: {
      totalUsers: users.length,
      activeUsers,
      activePercentage: users.length ? Math.round((activeUsers / users.length) * 1000) / 10 : 0,
      newThisMonth,
      newUsersGrowth: calculateGrowth(newThisMonth, newPreviousMonth),
      blockedUsers,
      blockedPercentage: users.length ? Math.round((blockedUsers / users.length) * 1000) / 10 : 0,
    },
    users: filteredUsers.slice(startIndex, startIndex + input.pageSize),
    pagination: { page, pageSize: input.pageSize, total, totalPages },
  };
}