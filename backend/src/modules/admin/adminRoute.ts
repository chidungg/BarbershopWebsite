import { Router, type Request, type Response } from "express";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { getRoleByUser, isAdmin } from "../../middlewares/auth.middleware";
import { getRevenueData, isRevenuePeriod } from "./adminRevenue.service";
import { getAdminUsers, isUserSort, isUserStatusFilter } from "./adminUsers.service";

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


export default adminRouter;