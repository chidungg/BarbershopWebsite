import { Router, type Request, type Response } from "express";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { getRoleByUser, isAdmin } from "../../middlewares/auth.middleware";
import { getRevenueData, isRevenuePeriod } from "./adminRevenue.service";
import { getAdminUsers, isUserSort, isUserStatusFilter } from "./adminUsers.service";
import { getAdminBarbers, isBarberStatusFilter } from "./adminBarbers.service";
import { getAdminAppointments, isAppointmentStatusFilter, isValidAppointmentDate } from "./adminAppointments.service";
import { getAdminPayments, isPaymentMethodFilter, isPaymentStatusFilter, isValidPaymentDate } from "./adminPayments.service";
import { getAdminServices, isServiceStatusFilter } from "./adminServices.service";
import {getAdminSchedules, getScheduleWeekStart, isValidScheduleDate,} from "./adminSchedules.service";
import { getAdminReports, isReportPeriod } from "./adminReports.service";

const adminRouter = Router();

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

export default adminRouter;