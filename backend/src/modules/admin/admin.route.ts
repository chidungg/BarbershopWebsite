import { Router, type Request, type Response } from "express";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { getRoleByUser, isAdmin } from "../../middlewares/auth.middleware";
import { getRevenueData, isRevenuePeriod } from "./adminRevenue.service";
import { createAdminUser, getAdminUserDetails, getAdminUsers, getAdminUsersCsv, isUserGender, isUserSort, isUserStatusFilter, setAdminUserBlocked, updateAdminUser } from "./adminUsers.service";
import { createAdminBarber, getAdminBarbers, isBarberStatusFilter } from "./adminBarbers.service";
import { getAdminAppointments, isAppointmentStatusFilter, isValidAppointmentDate } from "./adminAppointments.service";
import { getAdminPayments, isPaymentMethodFilter, isPaymentStatusFilter, isValidPaymentDate } from "./adminPayments.service";
import { getAdminServices, isServiceStatusFilter } from "./adminServices.service";
import {getAdminSchedules, getScheduleWeekStart, isValidScheduleDate,} from "./adminSchedules.service";
import { getAdminReports, isReportPeriod } from "./adminReports.service";
import { getAdminDashboard, isDashboardPeriod } from "./adminDashboard.service";
import { getAdminSettings, updateAdminSettings, type AdminSettingsInput } from "./adminSettings.service";


const adminRouter = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
adminRouter.use(getRoleByUser);
adminRouter.use(isAdmin);

adminRouter.get("/check", (request: Request, response: Response) => {
  return response.status(200).json({
    success: true,
    code: "admin_access_granted",
    message: "Administrator access granted",
    data: { id: request.authUser?.id, email: request.authUser?.email, role: request.authUser?.role },
  });
});

adminRouter.get("/profile", async (request: Request, response: Response) => {
  const authUser = request.authUser;

  if (!authUser) {
    return response.status(401).json({
      success: false,
      code: "authentication_required",
      message: "Authentication is required",
    });
  }

  try {
    const supabaseAdminClient = createSupabaseAdminClient();

    const [shopResult, pendingAppointmentsResult, notificationsResult] = await Promise.all([
      supabaseAdminClient.from("shop_settings").select("shop_name").eq("id", 1).maybeSingle(),
      supabaseAdminClient.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdminClient
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("account_id", authUser.id)
        .is("read_at", null),
    ]);

    const databaseError = shopResult.error ?? pendingAppointmentsResult.error ?? notificationsResult.error;

    if (databaseError) {
      console.error("Get administrator layout data error:", {
        code: databaseError.code,
        message: databaseError.message,
        details: databaseError.details,
      });

      return response.status(500).json({
        success: false,
        code: "admin_profile_failed",
        message: "Unable to load administrator layout data",
      });
    }

    return response.status(200).json({
      success: true,
      code: "admin_profile_success",
      data: {
        admin: {
          id: authUser.id,
          email: authUser.email,
          role: authUser.role,
          fullName: authUser.fullName,
        },
        shop: { name: shopResult.data?.shop_name ?? null },
        counters: {
          pendingAppointments: pendingAppointmentsResult.count ?? 0,
          unreadNotifications: notificationsResult.count ?? 0,
        },
      },
    });
  } catch (error) {
    console.error("Get administrator profile exception:", error);

    return response.status(500).json({
      success: false,
      code: "admin_profile_internal_error",
      message: "An internal error occurred while loading administrator data",
    });
  }
});

adminRouter.get("/revenue", async (request: Request, response: Response) => {
  const period = String(request.query.period ?? "month").toLowerCase();

  if (!isRevenuePeriod(period)) {
    return response.status(400).json({
      success: false,
      code: "invalid_revenue_period",
      message: "Period must be week, month, quarter, or year",
    });
  }

  try {
    const data = await getRevenueData(period);

    return response.status(200).json({
      success: true,
      code: "revenue_loaded",
      data,
    });
  } catch (error) {
    console.error("Get revenue error:", error);

    return response.status(500).json({
      success: false,
      code: "revenue_query_failed",
      message: "Unable to load revenue data",
    });
  }
});

adminRouter.get("/users", async (request: Request, response: Response) => {
  const query = typeof request.query.query === "string" ? request.query.query.trim() : "";
  const status = typeof request.query.status === "string" ? request.query.status.toLowerCase() : "all";
  const sort = typeof request.query.sort === "string" ? request.query.sort.toLowerCase() : "newest";
  const parsedPage = Number.parseInt(String(request.query.page ?? "1"), 10);
  const parsedPageSize = Number.parseInt(String(request.query.pageSize ?? "10"), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = Number.isInteger(parsedPageSize) ? Math.min(100, Math.max(1, parsedPageSize)) : 10;

  if (!isUserStatusFilter(status)) {
    return response.status(400).json({
      success: false,
      code: "invalid_user_status",
      message: "Status must be all, active, inactive, or blocked",
    });
  }

  if (!isUserSort(sort)) {
    return response.status(400).json({
      success: false,
      code: "invalid_user_sort",
      message: "Sort must be newest, oldest, or spending",
    });
  }

  try {
    const data = await getAdminUsers({ query, status, sort, page, pageSize });
    return response.status(200).json({ success: true, code: "admin_users_loaded", data });
  } catch (error) {
    console.error("Get administrator users error:", error);

    return response.status(500).json({
      success: false,
      code: "admin_users_query_failed",
      message: "Unable to load users",
    });
  }
});

adminRouter.post("/users", async (request: Request, response: Response) => {
  const fullName = typeof request.body.fullName === "string" ? request.body.fullName.trim() : "";
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const phone = typeof request.body.phone === "string" ? request.body.phone.trim().replace(/[\s.-]/g, "") : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const dateOfBirth = typeof request.body.dateOfBirth === "string" && request.body.dateOfBirth.trim() ? request.body.dateOfBirth.trim() : null;
  const genderValue = typeof request.body.gender === "string" ? request.body.gender.trim().toLowerCase() : "";
  const gender = genderValue ? (isUserGender(genderValue) ? genderValue : undefined) : null;
  const notes = typeof request.body.notes === "string" ? request.body.notes.trim() : "";

  if (fullName.length < 2 || fullName.length > 100) return response.status(400).json({ success: false, code: "invalid_full_name", message: "Full name must contain between 2 and 100 characters" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ success: false, code: "invalid_email", message: "Email address is invalid" });
  if (phone && !/^(?:\+84|0)\d{9}$/.test(phone)) return response.status(400).json({ success: false, code: "invalid_phone", message: "Phone number is invalid" });
  if (password.length < 8) return response.status(400).json({ success: false, code: "weak_password", message: "Password must contain at least 8 characters" });
  if (gender === undefined) return response.status(400).json({ success: false, code: "invalid_gender", message: "Gender is invalid" });

  if (dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(Date.parse(dateOfBirth)) || new Date(`${dateOfBirth}T00:00:00Z`) > new Date())) {
    return response.status(400).json({ success: false, code: "invalid_date_of_birth", message: "Date of birth is invalid" });
  }

  if (notes.length > 2000) return response.status(400).json({ success: false, code: "notes_too_long", message: "Notes must not exceed 2000 characters" });

  try {
    const result = await createAdminUser({ fullName, email, phone, password, dateOfBirth, gender, notes });

    if (result.conflict === "email") return response.status(409).json({ success: false, code: "email_already_exists", message: "Email address is already registered" });
    if (result.conflict === "phone") return response.status(409).json({ success: false, code: "phone_already_exists", message: "Phone number is already in use" });
    if (!result.user) return response.status(500).json({ success: false, code: "admin_user_create_failed", message: "Unable to create user" });

    return response.status(201).json({
      success: true,
      code: "admin_user_created",
      message: "User created successfully",
      data: result.user,
    });
  } catch (error) {
    console.error("Create administrator user error:", error);

    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return response.status(409).json({ success: false, code: "duplicate_user_data", message: "Email or phone number is already in use" });
    }

    return response.status(500).json({ success: false, code: "admin_user_create_failed", message: "Unable to create user" });
  }
});

adminRouter.get("/users/export", async (request: Request, response: Response) => {
  const query = typeof request.query.query === "string" ? request.query.query.trim() : "";
  const status = typeof request.query.status === "string" ? request.query.status.toLowerCase() : "all";
  const sort = typeof request.query.sort === "string" ? request.query.sort.toLowerCase() : "newest";

  if (!isUserStatusFilter(status) || !isUserSort(sort)) {
    return response.status(400).json({ success: false, code: "invalid_user_export_filter", message: "Invalid user export filters" });
  }

  try {
    const csv = await getAdminUsersCsv({ query, status, sort });
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`);
    return response.status(200).send(csv);
  } catch (error) {
    console.error("Export administrator users error:", error);
    return response.status(500).json({ success: false, code: "admin_users_export_failed", message: "Unable to export users" });
  }
});

adminRouter.get("/users/:userId", async (request: Request, response: Response) => {
  const userId = Array.isArray(request.params.userId) ? request.params.userId[0] ?? "" : request.params.userId ?? "";
  if (!UUID_PATTERN.test(userId)) return response.status(400).json({ success: false, code: "invalid_user_id", message: "Invalid user id" });

  try {
    const data = await getAdminUserDetails(userId);
    if (!data) return response.status(404).json({ success: false, code: "user_not_found", message: "User not found" });
    return response.status(200).json({ success: true, code: "admin_user_loaded", data });
  } catch (error) {
    console.error("Get administrator user error:", error);
    return response.status(500).json({ success: false, code: "admin_user_query_failed", message: "Unable to load user" });
  }
});

adminRouter.patch("/users/:userId", async (request: Request, response: Response) => {
  const userId = Array.isArray(request.params.userId) ? request.params.userId[0] ?? "" : request.params.userId ?? "";
  const fullName = typeof request.body.fullName === "string" ? request.body.fullName.trim() : "";
  const phone = typeof request.body.phone === "string" ? request.body.phone.trim().replace(/[\s.-]/g, "") : "";
  const dateOfBirth = typeof request.body.dateOfBirth === "string" && request.body.dateOfBirth.trim() ? request.body.dateOfBirth.trim() : null;
  const genderValue = typeof request.body.gender === "string" ? request.body.gender.trim().toLowerCase() : "";
  const gender = genderValue ? (isUserGender(genderValue) ? genderValue : undefined) : null;
  const notes = typeof request.body.notes === "string" ? request.body.notes.trim() : "";

  if (!UUID_PATTERN.test(userId)) return response.status(400).json({ success: false, code: "invalid_user_id", message: "Invalid user id" });
  if (fullName.length < 2 || fullName.length > 100) return response.status(400).json({ success: false, code: "invalid_full_name", message: "Full name must contain between 2 and 100 characters" });
  if (phone && !/^(?:\+84|0)\d{9}$/.test(phone)) return response.status(400).json({ success: false, code: "invalid_phone", message: "Phone number is invalid" });
  if (gender === undefined) return response.status(400).json({ success: false, code: "invalid_gender", message: "Gender is invalid" });
  if (dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(Date.parse(dateOfBirth)) || new Date(`${dateOfBirth}T00:00:00Z`) > new Date())) {
    return response.status(400).json({ success: false, code: "invalid_date_of_birth", message: "Date of birth is invalid" });
  }
  if (notes.length > 2000) return response.status(400).json({ success: false, code: "notes_too_long", message: "Notes must not exceed 2000 characters" });

  try {
    const data = await updateAdminUser(userId, { fullName, phone, dateOfBirth, gender, notes });
    if (!data) return response.status(404).json({ success: false, code: "user_not_found", message: "User not found" });
    return response.status(200).json({ success: true, code: "admin_user_updated", message: "User updated successfully", data });
  } catch (error) {
    console.error("Update administrator user error:", error);
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return response.status(409).json({ success: false, code: "phone_already_exists", message: "Phone number is already in use" });
    }
    return response.status(500).json({ success: false, code: "admin_user_update_failed", message: "Unable to update user" });
  }
});

adminRouter.patch("/users/:userId/status", async (request: Request, response: Response) => {
  const userId = Array.isArray(request.params.userId) ? request.params.userId[0] ?? "" : request.params.userId ?? "";
  const blocked = request.body.blocked;

  if (!UUID_PATTERN.test(userId)) return response.status(400).json({ success: false, code: "invalid_user_id", message: "Invalid user id" });
  if (typeof blocked !== "boolean") return response.status(400).json({ success: false, code: "invalid_block_status", message: "Blocked must be true or false" });

  try {
    const data = await setAdminUserBlocked(userId, blocked);
    if (!data) return response.status(404).json({ success: false, code: "user_not_found", message: "User not found" });

    return response.status(200).json({
      success: true,
      code: blocked ? "admin_user_blocked" : "admin_user_unblocked",
      message: blocked ? "User blocked successfully" : "User unblocked successfully",
      data,
    });
  } catch (error) {
    console.error("Change administrator user status error:", error);
    return response.status(500).json({ success: false, code: "admin_user_status_update_failed", message: "Unable to change user status" });
  }
});

adminRouter.get("/barbers", async (request: Request, response: Response) => {
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const status = typeof request.query.status === "string" ? request.query.status.toLowerCase() : "all";
  const serviceId = typeof request.query.serviceId === "string" ? request.query.serviceId.trim() : "";

  if (!isBarberStatusFilter(status)) {
    return response.status(400).json({
      success: false,
      code: "invalid_barber_status",
      message: "Status must be all, active, or inactive",
    });
  }

  try {
    const data = await getAdminBarbers({ search, status, serviceId });
    return response.status(200).json({ success: true, code: "admin_barbers_loaded", data });
  } catch (error) {
    console.error("Get administrator barbers error:", error);

    return response.status(500).json({
      success: false,
      code: "admin_barbers_query_failed",
      message: "Unable to load barbers",
    });
  }
});

adminRouter.post("/barbers", async (request: Request, response: Response) => {
  const displayName = typeof request.body.displayName === "string" ? request.body.displayName.trim() : "";
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const phone = typeof request.body.phone === "string" ? request.body.phone.trim().replace(/[\s.-]/g, "") : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const bio = typeof request.body.bio === "string" ? request.body.bio.trim() : "";
  const avatarUrl = typeof request.body.avatarUrl === "string" ? request.body.avatarUrl.trim() : "";
  const experienceYears = Number(request.body.experienceYears);
  const hiredAt = typeof request.body.hiredAt === "string" && request.body.hiredAt.trim() ? request.body.hiredAt.trim() : null;
  const rawServiceIds: unknown[] = Array.isArray(request.body.serviceIds) ? request.body.serviceIds : [];
  const serviceIds: string[] = rawServiceIds.filter((value): value is string => typeof value === "string").map((value) => value.trim());

  if (displayName.length < 2 || displayName.length > 120) return response.status(400).json({ success: false, code: "invalid_display_name", message: "Display name must contain between 2 and 120 characters" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ success: false, code: "invalid_email", message: "Email address is invalid" });
  if (phone && !/^(?:\+84|0)\d{9}$/.test(phone)) return response.status(400).json({ success: false, code: "invalid_phone", message: "Phone number is invalid" });
  if (password.length < 8) return response.status(400).json({ success: false, code: "weak_password", message: "Password must contain at least 8 characters" });
  if (!Number.isInteger(experienceYears) || experienceYears < 0) return response.status(400).json({ success: false, code: "invalid_experience", message: "Experience years must be a non-negative integer" });
  if (bio.length > 2000) return response.status(400).json({ success: false, code: "bio_too_long", message: "Bio must not exceed 2000 characters" });
  if (serviceIds.length !== rawServiceIds.length || serviceIds.some((id) => !UUID_PATTERN.test(id))) return response.status(400).json({ success: false, code: "invalid_services", message: "One or more selected services are invalid" });

  if (avatarUrl) {
    try {
      new URL(avatarUrl);
    } catch {
      return response.status(400).json({ success: false, code: "invalid_avatar_url", message: "Avatar URL is invalid" });
    }
  }

  if (hiredAt && (!/^\d{4}-\d{2}-\d{2}$/.test(hiredAt) || Number.isNaN(Date.parse(hiredAt)) || new Date(`${hiredAt}T00:00:00Z`) > new Date())) {
    return response.status(400).json({ success: false, code: "invalid_hired_at", message: "Hired date is invalid" });
  }

  try {
    const result = await createAdminBarber({ displayName, email, phone, password, bio, avatarUrl, experienceYears, hiredAt, serviceIds });

    if (result.conflict === "email") return response.status(409).json({ success: false, code: "email_already_exists", message: "Email address is already registered" });
    if (result.conflict === "phone") return response.status(409).json({ success: false, code: "phone_already_exists", message: "Phone number is already in use" });
    if (result.conflict === "service") return response.status(400).json({ success: false, code: "invalid_services", message: "One or more selected services are unavailable" });
    if (!result.barber) return response.status(500).json({ success: false, code: "admin_barber_create_failed", message: "Unable to create barber" });

    return response.status(201).json({
      success: true,
      code: "admin_barber_created",
      message: "Barber created successfully",
      data: result.barber,
    });
  } catch (error) {
    console.error("Create administrator barber error:", error);
    return response.status(500).json({
      success: false,
      code: "admin_barber_create_failed",
      message: error instanceof Error && process.env.NODE_ENV === "development" ? error.message : "Unable to create barber",
    });
  }
});

adminRouter.get("/appointments", async (request: Request, response: Response) => {
  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const date = typeof request.query.date === "string" ? request.query.date.trim() : defaultDate;
  const barberId = typeof request.query.barberId === "string" ? request.query.barberId.trim() : "";
  const status = typeof request.query.status === "string" ? request.query.status.toLowerCase() : "all";
  const parsedPage = Number.parseInt(String(request.query.page ?? "1"), 10);
  const parsedPageSize = Number.parseInt(String(request.query.pageSize ?? "10"), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = Number.isInteger(parsedPageSize) ? Math.min(100, Math.max(1, parsedPageSize)) : 10;

  if (!isValidAppointmentDate(date)) {
    return response.status(400).json({
      success: false,
      code: "invalid_appointment_date",
      message: "Date must use the YYYY-MM-DD format",
    });
  }

  if (!isAppointmentStatusFilter(status)) {
    return response.status(400).json({
      success: false,
      code: "invalid_appointment_status",
      message: "Invalid appointment status",
    });
  }

  try {
    const data = await getAdminAppointments({ date, barberId, status, page, pageSize });
    return response.status(200).json({ success: true, code: "admin_appointments_loaded", data });
  } catch (error) {
    console.error("Get administrator appointments error:", error);

    return response.status(500).json({
      success: false,
      code: "admin_appointments_query_failed",
      message: "Unable to load appointments",
    });
  }
});

adminRouter.get("/payments", async (request: Request, response: Response) => {
  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const date = typeof request.query.date === "string" ? request.query.date.trim() : defaultDate;
  const method = typeof request.query.method === "string" ? request.query.method.toLowerCase() : "all";
  const status = typeof request.query.status === "string" ? request.query.status.toLowerCase() : "all";
  const parsedPage = Number.parseInt(String(request.query.page ?? "1"), 10);
  const parsedPageSize = Number.parseInt(String(request.query.pageSize ?? "10"), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = Number.isInteger(parsedPageSize) ? Math.min(100, Math.max(1, parsedPageSize)) : 10;

  if (!isValidPaymentDate(date)) {
    return response.status(400).json({ success: false, code: "invalid_payment_date", message: "Date must use the YYYY-MM-DD format" });
  }

  if (!isPaymentMethodFilter(method)) {
    return response.status(400).json({ success: false, code: "invalid_payment_method", message: "Invalid payment method" });
  }

  if (!isPaymentStatusFilter(status)) {
    return response.status(400).json({ success: false, code: "invalid_payment_status", message: "Invalid payment status" });
  }

  try {
    const data = await getAdminPayments({ search, date, method, status, page, pageSize });
    return response.status(200).json({ success: true, code: "admin_payments_loaded", data });
  } catch (error) {
    console.error("Get administrator payments error:", error);
    return response.status(500).json({ success: false, code: "admin_payments_query_failed", message: "Unable to load payments" });
  }
});

adminRouter.get("/services", async (request: Request, response: Response) => {
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const categoryId = typeof request.query.categoryId === "string" ? request.query.categoryId.trim() : "";
  const status = typeof request.query.status === "string" ? request.query.status.toLowerCase() : "all";

  if (!isServiceStatusFilter(status)) {
    return response.status(400).json({
      success: false,
      code: "invalid_service_status",
      message: "Status must be all, active, or inactive",
    });
  }

  try {
    const data = await getAdminServices({ search, categoryId, status });
    return response.status(200).json({ success: true, code: "admin_services_loaded", data });
  } catch (error) {
    console.error("Get administrator services error:", error);

    return response.status(500).json({
      success: false,
      code: "admin_services_query_failed",
      message: "Unable to load services",
    });
  }
});

adminRouter.get("/schedules", async (request: Request, response: Response) => {
  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const requestedWeekStart = typeof request.query.weekStart === "string"
    ? request.query.weekStart.trim()
    : defaultDate;

  const barberId = typeof request.query.barberId === "string"
    ? request.query.barberId.trim()
    : "";

  if (!isValidScheduleDate(requestedWeekStart)) {
    return response.status(400).json({
      success: false,
      code: "invalid_schedule_week",
      message: "weekStart must use the YYYY-MM-DD format",
    });
  }

  try {
    const weekStart = getScheduleWeekStart(requestedWeekStart);
    const data = await getAdminSchedules(weekStart, barberId);

    return response.status(200).json({
      success: true,
      code: "admin_schedules_loaded",
      data,
    });
  } catch (error) {
    console.error("Get administrator schedules error:", error);

    return response.status(500).json({
      success: false,
      code: "admin_schedules_query_failed",
      message: "Unable to load barber schedules",
    });
  }
});

adminRouter.get("/reports", async (request: Request, response: Response) => {
  const period = typeof request.query.period === "string"
    ? request.query.period.toLowerCase()
    : "month";

  if (!isReportPeriod(period)) {
    return response.status(400).json({
      success: false,
      code: "invalid_report_period",
      message: "Period must be week, month, quarter, or year",
    });
  }

  try {
    const data = await getAdminReports(period);

    return response.status(200).json({
      success: true,
      code: "admin_reports_loaded",
      data,
    });
  } catch (error) {
    console.error("Get administrator reports error:", error);

    return response.status(500).json({
      success: false,
      code: "admin_reports_query_failed",
      message: "Unable to load reports",
    });
  }
});

adminRouter.get("/dashboard", async (request: Request, response: Response) => {
  const period = typeof request.query.period === "string" ? request.query.period.toLowerCase() : "month";

  if (!isDashboardPeriod(period)) {
    return response.status(400).json({
      success: false,
      code: "invalid_dashboard_period",
      message: "Period must be week, month, quarter, or year",
    });
  }

  try {
    const data = await getAdminDashboard(period);
    return response.status(200).json({ success: true, code: "admin_dashboard_loaded", data });
  } catch (error) {
    console.error("Get administrator dashboard error:", error);
    return response.status(500).json({
      success: false,
      code: "admin_dashboard_query_failed",
      message: "Unable to load dashboard",
    });
  }
});

adminRouter.get("/settings", async (_request: Request, response: Response) => {
  try {
    const data = await getAdminSettings();
    return response.status(200).json({ success: true, code: "admin_settings_loaded", data });
  } catch (error) {
    console.error("Get administrator settings error:", error);
    return response.status(500).json({
      success: false,
      code: "admin_settings_query_failed",
      message: "Unable to load settings",
    });
  }
});

adminRouter.put("/settings", async (request: Request, response: Response) => {
  const body = request.body as Partial<AdminSettingsInput>;

  const input: AdminSettingsInput = {
    shopName: typeof body.shopName === "string" ? body.shopName.trim() : "",
    address: typeof body.address === "string" ? body.address.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    timezone: typeof body.timezone === "string" ? body.timezone.trim() : "",
    currency: typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "",
    bookingAdvanceDays: Number(body.bookingAdvanceDays),
    cancellationNoticeHours: Number(body.cancellationNoticeHours),
    defaultSlotMinutes: Number(body.defaultSlotMinutes),
  };

  if (!input.shopName) {
    return response.status(400).json({ success: false, code: "invalid_shop_name", message: "Business name is required" });
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return response.status(400).json({ success: false, code: "invalid_shop_email", message: "Business email is invalid" });
  }

  if (!/^[A-Z]{3}$/.test(input.currency)) {
    return response.status(400).json({ success: false, code: "invalid_currency", message: "Currency must contain exactly 3 letters" });
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format(new Date());
  } catch {
    return response.status(400).json({ success: false, code: "invalid_timezone", message: "Timezone is invalid" });
  }

  if (!Number.isInteger(input.bookingAdvanceDays) || input.bookingAdvanceDays < 1 || input.bookingAdvanceDays > 365) {
    return response.status(400).json({ success: false, code: "invalid_booking_advance", message: "Booking advance days must be between 1 and 365" });
  }

  if (!Number.isInteger(input.cancellationNoticeHours) || input.cancellationNoticeHours < 0 || input.cancellationNoticeHours > 168) {
    return response.status(400).json({ success: false, code: "invalid_cancellation_notice", message: "Cancellation notice must be between 0 and 168 hours" });
  }

  if (!Number.isInteger(input.defaultSlotMinutes) || input.defaultSlotMinutes < 5 || input.defaultSlotMinutes > 240) {
    return response.status(400).json({ success: false, code: "invalid_slot_minutes", message: "Default slot must be between 5 and 240 minutes" });
  }

  try {
    const data = await updateAdminSettings(input);
    return response.status(200).json({ success: true, code: "admin_settings_updated", message: "Settings updated successfully", data });
  } catch (error) {
    console.error("Update administrator settings error:", error);
    return response.status(500).json({
      success: false,
      code: "admin_settings_update_failed",
      message: "Unable to update settings",
    });
  }
});

export default adminRouter;