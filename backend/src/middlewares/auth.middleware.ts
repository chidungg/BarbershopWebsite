import type { NextFunction, Request, RequestHandler, Response,} from "express";
import {createSupabaseAdminClient, createSupabaseAuthClient,} from "../lib/supabase";
export type AppRole = "admin" | "barber" | "user";
export type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
};
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function normalizeRole(role: unknown): AppRole | null {
  if (typeof role !== "string") {
    return null;
  }
  const normalizedRole = role.trim().toLowerCase();

  if ( normalizedRole !== "admin" &&normalizedRole !== "barber" && normalizedRole !== "user")  return null;
  return normalizedRole;
}
function getAccessToken(request: Request): string | null {
  const cookieToken = request.cookies?.["sb-access-token"];
  if (typeof cookieToken === "string" && cookieToken.trim())  return cookieToken.trim();

  const authorizationHeader = request.headers.authorization;
  if (typeof authorizationHeader !== "string" ||!authorizationHeader.startsWith("Bearer "))  return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token || null;
}

export async function getRoleByEmail(
  email: string,
): Promise<AppRole | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const supabaseAdminClient = createSupabaseAdminClient();
  const { data, error } = await supabaseAdminClient
    .from("accounts")
    .select("role")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (error) {
    console.error("Get role by email error:", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw new Error(`Unable to retrieve user role: ${error.message}`);
  }
  return normalizeRole(data?.role);
}

export const getRoleByUser: RequestHandler = async ( request: Request, response: Response, next: NextFunction): Promise<void> => {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    response.status(401).json({
      success: false,
      code: "authentication_required",
      message: "You must sign in to access this resource",
    });
    return;
  }
  try {
    const supabaseAuthClient = createSupabaseAuthClient();
    const { data: { user }, error } = await supabaseAuthClient.auth.getUser(accessToken);
    if (error || !user) {
      response.status(401).json({
        success: false,
        code: "invalid_or_expired_token",
        message: "Your session is invalid or has expired",
      });
      return;
    }
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      response.status(403).json({
        success: false,
        code: "user_email_not_found",
        message: "The authenticated user does not have an email address",
      });
      return;
    }
    const role = await getRoleByEmail(email);
    if (!role) {
      response.status(403).json({
        success: false,
        code: "user_role_not_found",
        message: "This account does not have a valid role",
      });
      return;
    }
    request.authUser = {
      id: user.id,
      email,
      role,
      fullName:
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name.trim()
          : "",
      phone:
        typeof user.user_metadata.phone === "string"
          ? user.user_metadata.phone.trim()
          : "",
      avatarUrl:
        typeof user.user_metadata.avatar_url === "string"
          ? user.user_metadata.avatar_url.trim() || null
          : null,
    };
    next();
  } catch (error) {
    console.error("Get role by user middleware error:", error);
    response.status(500).json({
      success: false,
      code: "role_check_failed",
      message: "Unable to verify user permissions",
    });
  }
};

function requireRoles(...allowedRoles: AppRole[]): RequestHandler {
  return ( request: Request, response: Response, next: NextFunction,): void => {
    const authUser = request.authUser;
    if (!authUser) {
      response.status(401).json({
        success: false,
        code: "authentication_required",
        message: "User authentication information is missing",
      });
      return;
    }
    if (!allowedRoles.includes(authUser.role)) {
      response.status(403).json({
        success: false,
        code: "permission_denied",
        message: "You do not have permission to access this resource",
      });
      return;
    }
    next();
  };
}

export const isAdmin: RequestHandler = requireRoles("admin");
export const isBarber: RequestHandler = requireRoles("barber");
export const isUser: RequestHandler = requireRoles("user");
export const isAdminOrBarber: RequestHandler = requireRoles( "admin","barber");
