import { Router, type Request, type Response } from "express";
import type { AuthError } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { createSupabaseOAuthClient } from "../../lib/supabase-oauth";
import { LoginRequestBody, SignupRequestBody, AuthSession, ForgotPasswordCheckEmailBody  } from "./auth.type";
import { createSupabaseAuthClient, createSupabaseAdminClient} from "../../lib/supabase";
import { getRoleByEmail, getRoleByUser } from "../../middlewares/auth.middleware";

export const authRouter = Router();

function buildFrontendRedirect( parameter: "authSuccess" | "authError", value: string,): string {
  const redirectUrl = new URL(env.frontendUrl);
  redirectUrl.searchParams.set(parameter, value);
  return redirectUrl.toString();
}

function setSessionCookies(response: Response, session: AuthSession) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  response.cookie("sb-access-token", session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in * 1000,
  });

  response.cookie("sb-refresh-token", session.refresh_token, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookies(response: Response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  response.clearCookie("sb-access-token", cookieOptions);
  response.clearCookie("sb-refresh-token", cookieOptions);
}

// -----------------------------------LOGIN--------------------------------------
authRouter.post("/api/auth/login", async (request: Request, response: Response) => {
  const body = request.body as LoginRequestBody;
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (!email || !password) {
    return response.status(400).json({
      success: false,
      code: "missing_credentials",
      message: "Email and password are required",
    });
  }

  try {
    const supabaseAuthClient = createSupabaseAuthClient();
    const { data, error } =
      await supabaseAuthClient.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      console.error("Login error:", {
        name: error.name,
        code: error.code,
        message: error.message,
        status: error.status,
      });

      if (error.code === "email_not_confirmed") {
        return response.status(403).json({
          success: false,
          code: "email_not_confirmed",
          message: "Please confirm your email address before signing in",
        });
      }

      if (error.code === "invalid_credentials") {
        return response.status(401).json({
          success: false,
          code: "invalid_credentials",
          message: "Invalid email or password",
        });
      }

      return response.status(error.status ?? 502).json({
        success: false,
        code: "supabase_login_failed",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Supabase could not process the login request",
      });
    }

    if (!data.user || !data.session) {
      return response.status(503).json({
        success: false,
        code: "supabase_service_unavailable",
        message: "Supabase service unavailable. Please try again later.",
      });
    }

    const userEmail = data.user.email?.trim().toLowerCase();

    if (!userEmail) {
      return response.status(403).json({
        success: false,
        code: "user_email_not_found",
        message: "The authenticated account does not have an email",
      });
    }

    let role;

    try {
      role = await getRoleByEmail(userEmail);
    } catch (error) {
      console.error("Role lookup failed during login:", error);

      return response.status(502).json({
        success: false,
        code: "role_lookup_failed",
        message: "Unable to retrieve the account role",
      });
    }

    if (!role) {
      return response.status(403).json({
        success: false,
        code: "user_role_not_found",
        message: "This account does not have a valid role",
      });
    }

    setSessionCookies(response, data.session);

    return response.status(200).json({
      success: true,
      code: "login_success",
      message: "Login successful",
      data: {
        id: data.user.id,
        email: userEmail,
        role,
        redirectTo: role === "admin" ? "/administrator" : "/",
      },
    });
  } catch (error) {
    console.error("Cannot connect to Supabase Authentication:", error);

    return response.status(503).json({
      success: false,
      code: "supabase_service_unavailable",
      message: "Supabase service unavailable. Please try again later.",
    });
  }
});

authRouter.get(
  "/api/auth/me",
  getRoleByUser,
  (request: Request, response: Response) => {
    const authUser = request.authUser;

    if (!authUser) {
      return response.status(401).json({
        success: false,
        code: "authentication_required",
        message: "Authentication is required",
      });
    }

    return response.status(200).json({
      success: true,
      code: "current_user_success",
      data: {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role,
        redirectTo:
          authUser.role === "admin"
            ? "/administrator"
            : "/",
      },
    });
  },
);

authRouter.post(
  "/api/auth/logout",
  (_request: Request, response: Response) => {
    clearSessionCookies(response);

    return response.status(200).json({
      success: true,
      code: "logout_success",
      message: "Logged out successfully",
    });
  },
);

// -----------------------------------SIGNUP-------------------------------------
async function findAuthUserByEmail(email: string) {
  const adminClient = createSupabaseAdminClient();
  const normalizedEmail = email.trim();
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return {
        user: null,
        error,
      };
    }

    const user = data.users.find(
      (currentUser) =>
        currentUser.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (user) {
      return {
        user,
        error: null,
      };
    }

    if (data.users.length < perPage) {
      return {
        user: null,
        error: null,
      };
    }
  }
}

function respondSignupError(response: Response, error: AuthError) {
  console.error("Supabase signup error:", {
    name: error.name,
    code: error.code,
    message: error.message,
    status: error.status,
  });

  if (
    error.code === "email_exists" ||
    error.code === "user_already_exists"
  ) {
    return response.status(409).json({
      success: false,
      code: "email_already_registered",
      message: "This email address is already registered",
    });
  }

  if (error.code === "email_address_not_authorized") {
    return response.status(503).json({
      success: false,
      code: "confirmation_email_not_authorized",
      message:
        "Supabase is not authorized to send email to this address. Configure Custom SMTP or use a project team email.",
    });
  }

  if (error.code === "over_email_send_rate_limit") {
    return response.status(429).json({
      success: false,
      code: "confirmation_email_rate_limited",
      message:
        "The confirmation email rate limit has been exceeded. Please try again later.",
    });
  }

  if (error.code === "weak_password") {
    return response.status(400).json({
      success: false,
      code: "weak_password",
      message: "Password does not meet the security requirements",
    });
  }

  if (
    error.code === "validation_failed" ||
    error.code === "email_address_invalid"
  ) {
    return response.status(400).json({
      success: false,
      code: "invalid_signup_data",
      message: "Signup information is invalid",
    });
  }

  return response.status(error.status ?? 502).json({
    success: false,
    code: "supabase_signup_failed",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Supabase could not process the signup request",
  });
}
authRouter.post("/api/auth/signup", async (request: Request, response: Response) => {
    const body = request.body as SignupRequestBody;
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    const normalizedPhone = phone.replace(/[\s.-]/g, "");

    if (!fullName ||!email || !phone ||!password || !confirmPassword) {
      return response.status(400).json({
        success: false,
        code: "missing_signup_fields",
        message: "All signup fields are required",
      });
    }

    if (fullName.length < 2 || fullName.length > 100) {
      return response.status(400).json({
        success: false,
        code: "invalid_full_name",
        message: "Full name must contain between 2 and 100 characters",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({
        success: false,
        code: "invalid_email",
        message: "Email address is invalid",
      });
    }

    if (!/^(?:\+84|0)\d{9}$/.test(normalizedPhone)) {
      return response.status(400).json({
        success: false,
        code: "invalid_phone",
        message: "Phone number is invalid",
      });
    }

    if (password.length < 8) {
      return response.status(400).json({
        success: false,
        code: "weak_password",
        message: "Password must contain at least 8 characters",
      });
    }

    if (password !== confirmPassword) {
      return response.status(400).json({
        success: false,
        code: "password_mismatch",
        message: "Confirm password does not match",
      });
    }

    const emailRedirectTo = new URL(
      "/login",
      env.frontendUrl,
    ).toString();

    try {
      const lookupResult = await findAuthUserByEmail(email);

      if (lookupResult.error) {
        console.error("Admin user lookup failed:", {
          name: lookupResult.error.name,
          code: lookupResult.error.code,
          message: lookupResult.error.message,
          status: lookupResult.error.status,
        });

        return response.status(502).json({
          success: false,
          code: "admin_user_lookup_failed",
          message:
            process.env.NODE_ENV === "development"
              ? `Unable to check existing email: ${lookupResult.error.message}`
              : "Unable to check whether this email already exists",
        });
      }

      const existingUser = lookupResult.user;
      const supabaseAuthClient = createSupabaseAuthClient();

      if (existingUser?.email_confirmed_at) {
        return response.status(409).json({
          success: false,
          code: "email_already_registered",
          message: "This email address is already registered",
        });
      }

      if (existingUser && !existingUser.email_confirmed_at) {
        const { error: resendError } =
          await supabaseAuthClient.auth.resend({
            type: "signup",
            email,
            options: {
              emailRedirectTo,
            },
          });

        if (resendError) {
          return respondSignupError(response, resendError);
        }

        return response.status(200).json({
          success: true,
          code: "signup_verification_resent",
          message:
            "This account already exists but has not been verified. A new confirmation email was sent.",
          data: {
            id: existingUser.id,
            email: existingUser.email,
            verificationRequired: true,
          },
        });
      }

      const { data, error } =
        await supabaseAuthClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              full_name: fullName,
              phone: normalizedPhone,
            },
          },
        });

      if (error) {
        return respondSignupError(response, error);
      }

      if (!data.user) {
        return response.status(502).json({
          success: false,
          code: "invalid_supabase_response",
          message: "Supabase did not return the created user",
        });
      }

      /*
       * Supabase có thể trả về user giả khi email đã tồn tại
       * và email confirmation đang bật.
       */
      if (data.user.identities?.length === 0) {
        return response.status(409).json({
          success: false,
          code: "email_already_registered",
          message: "This email address is already registered",
        });
      }

      if (!data.session) {
        return response.status(201).json({
          success: true,
          code: "signup_verification_required",
          message:
            "Account created. Please check your email to verify the account.",
          data: {
            id: data.user.id,
            email: data.user.email,
            verificationRequired: true,
          },
        });
      }

      setSessionCookies(response, data.session);

      return response.status(201).json({
        success: true,
        code: "signup_success",
        message: "Account created successfully",
        data: {
          id: data.user.id,
          email: data.user.email,
          verificationRequired: false,
        },
      });
    } catch (error) {
      console.error("Signup internal exception:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unknown signup error";

      return response.status(500).json({
        success: false,
        code: "signup_internal_error",
        message:
          process.env.NODE_ENV === "development"
            ? message
            : "An internal error occurred while creating the account",
      });
    }
  },
);
// -----------------------------------GG OAuth-----------------------------------
authRouter.get("/auth/google", async (request: Request, response: Response) => {
  response.setHeader("Cache-Control", "no-store");
  try {
    const supabase = createSupabaseOAuthClient(request, response);
    const callbackUrl = new URL(
      "/auth/google/callback",
      env.backendUrl,
    ).toString();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      console.error("Google OAuth start error:", error);
      return response.redirect(
        302,
        buildFrontendRedirect("authError", "google_oauth_start_failed"),
      );
    }
    return response.redirect(302, data.url);
  } catch (error) {
    console.error("Google OAuth start exception:", error);
    return response.redirect(
      302,
      buildFrontendRedirect("authError", "google_oauth_start_failed"),
    );
  }
});
authRouter.get("/auth/google/callback", async (request: Request, response: Response) => {
    response.setHeader("Cache-Control", "no-store");
    const providerError = typeof request.query.error === "string" ? request.query.error : "";
    if (providerError) {
      console.error("Google OAuth provider error:", {
        error: providerError,
        errorCode: request.query.error_code,
        errorDescription: request.query.error_description,
      });

      return response.redirect(
        302,
        buildFrontendRedirect("authError", "google_oauth_cancelled"),
      );
    }
    const code = typeof request.query.code === "string" ? request.query.code.trim() : "";
    if (!code) {
      return response.redirect(
        302,
        buildFrontendRedirect("authError", "missing_oauth_code"),
      );
    }
    try {
      const supabase = createSupabaseOAuthClient(request, response);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.user || !data.session) {
        console.error("Google OAuth code exchange error:", error);
        return response.redirect(
          302,
          buildFrontendRedirect(
            "authError",
            "google_oauth_exchange_failed",
          ),
        );
      }

      const userEmail = data.user.email?.trim().toLowerCase();

      if (!userEmail) {
        return response.redirect(
          302,
          buildFrontendRedirect("authError", "user_email_not_found"),
        );
      }

      const role = await getRoleByEmail(userEmail);

      if (!role) {
        return response.redirect(
          302,
          buildFrontendRedirect("authError", "user_role_not_found"),
        );
      }

      setSessionCookies(response, data.session);

      console.log("Google OAuth login successful:", {
        userId: data.user.id,
        email: userEmail,
        role,
      });

      const redirectUrl = new URL(
        role === "admin" ? "/administrator" : "/",
        env.frontendUrl,
      );
      redirectUrl.searchParams.set(
        "authSuccess",
        "google_login_success",
      );

      return response.redirect(302, redirectUrl.toString());
    } catch (error) {
      console.error("Google OAuth callback exception:", error);
      return response.redirect(
        302,
        buildFrontendRedirect(
          "authError",
          "google_oauth_exchange_failed",
        ),
      );
    }
});

// -----------------------------FORGOT PASSWORD-----------------------------------

authRouter.post("/api/auth/forgot-password/check-email", async (request: Request, response: Response) => {
    const body = request.body as ForgotPasswordCheckEmailBody;

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return response.status(400).json({
        success: false,
        code: "missing_email",
        message: "Email address is required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({
        success: false,
        code: "invalid_email",
        message: "Email address is invalid",
      });
    }

try {
    const lookupResult = await findAuthUserByEmail(email);

    if (lookupResult.error) {
        console.error("Forgot-password account lookup failed:", {
        name: lookupResult.error.name,
        code: lookupResult.error.code,
        message: lookupResult.error.message,
        status: lookupResult.error.status,
        });

        return response.status(502).json({
        success: false,
        code: "account_lookup_failed",
        message:
            process.env.NODE_ENV === "development"
            ? lookupResult.error.message
            : "Unable to check this email address",
        });
    }

    const existingUser = lookupResult.user;
    const exists = existingUser !== null;

    console.log("Forgot-password email lookup:", {
        email,
        exists,
        userId: existingUser?.id ?? null,
    });

    if (!exists) {
        return response.status(200).json({
        success: true,
        code: "account_not_found",
        message: "No account is registered with this email address",
        data: {
            exists: false,
        },
        });
    }

    return response.status(200).json({
        success: true,
        code: "account_found",
        message: "An account is registered with this email address",
        data: {
        exists: true,
        },
    });
    } catch (error) {
    console.error("Forgot-password email lookup exception:", error);

    return response.status(500).json({
        success: false,
        code: "account_lookup_failed",
        message:
        process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Unable to check this email address",
    });
    }
  },
);
// ----------SEND OTP
authRouter.post("/api/auth/forgot-password/send-otp", async (request: Request, response: Response) => {
    const body = request.body as {
      email?: unknown;
    };

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return response.status(400).json({
        success: false,
        code: "missing_email",
        message: "Email address is required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({
        success: false,
        code: "invalid_email",
        message: "Email address is invalid",
      });
    }

    try {
      const lookupResult = await findAuthUserByEmail(email);

      if (lookupResult.error) {
        console.error("Forgot-password account lookup failed:", {
          name: lookupResult.error.name,
          code: lookupResult.error.code,
          message: lookupResult.error.message,
          status: lookupResult.error.status,
        });

        return response.status(502).json({
          success: false,
          code: "account_lookup_failed",
          message: "Unable to check this email address",
        });
      }

      if (!lookupResult.user) {
        return response.status(404).json({
          success: false,
          code: "account_not_found",
          message: "No account is registered with this email address",
        });
      }

      const supabaseAuthClient = createSupabaseAuthClient();

      const redirectTo = new URL(
        "/forgot-password",
        env.frontendUrl,
      ).toString();

      const { error } =
        await supabaseAuthClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

      if (error) {
        console.error("Send recovery OTP error:", {
          name: error.name,
          code: error.code,
          message: error.message,
          status: error.status,
        });

        if (error.code === "over_email_send_rate_limit") {
          return response.status(429).json({
            success: false,
            code: "otp_rate_limited",
            message:
              "A verification code was sent recently. Please wait before requesting another one.",
          });
        }

        if (error.code === "email_address_not_authorized") {
          return response.status(503).json({
            success: false,
            code: "email_not_authorized",
            message:
              "The email service is not authorized to send to this address",
          });
        }

        return response.status(error.status ?? 502).json({
          success: false,
          code: "otp_send_failed",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Unable to send the verification code",
        });
      }

      return response.status(200).json({
        success: true,
        code: "otp_sent",
        message: "A verification code has been sent to your email",
        data: {
          email,
        },
      });
    } catch (error) {
      console.error("Send recovery OTP exception:", error);

      return response.status(500).json({
        success: false,
        code: "otp_send_internal_error",
        message:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : "An internal error occurred while sending the verification code",
      });
    }
  },
);
// ---------- VERIFY OTP
authRouter.post( "/api/auth/forgot-password/verify-otp", async (request: Request, response: Response) => {
    const body = request.body as {
      email?: unknown;
      otp?: unknown;
    };

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const otp =
      typeof body.otp === "string"
        ? body.otp.trim()
        : "";

    if (!email || !otp) {
      return response.status(400).json({
        success: false,
        code: "missing_verification_data",
        message: "Email address and verification code are required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({
        success: false,
        code: "invalid_email",
        message: "Email address is invalid",
      });
    }

    if (!/^\d{8}$/.test(otp)) {
      return response.status(400).json({
        success: false,
        code: "invalid_otp_format",
        message: "Verification code must contain exactly eight digits",
      });
    }

    try {
      const supabaseAuthClient = createSupabaseAuthClient();

      const { data, error } =
        await supabaseAuthClient.auth.verifyOtp({
          email,
          token: otp,
          type: "recovery",
        });

      if (error) {
        console.error("Recovery OTP verification error:", {
          name: error.name,
          code: error.code,
          message: error.message,
          status: error.status,
        });

        if (
          error.code === "otp_expired" ||
          error.code === "token_has_expired" ||
          error.status === 403
        ) {
          return response.status(403).json({
            success: false,
            code: "invalid_or_expired_otp",
            message:
              "The verification code is incorrect, expired, or has already been used",
          });
        }

        if (error.status === 429) {
          return response.status(429).json({
            success: false,
            code: "otp_verification_rate_limited",
            message:
              "Too many verification attempts. Please wait before trying again",
          });
        }

        return response.status(error.status ?? 502).json({
          success: false,
          code: "otp_verification_failed",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Unable to verify the recovery code",
        });
      }

      if (!data.user || !data.session) {
        return response.status(502).json({
          success: false,
          code: "invalid_verification_response",
          message:
            "Supabase did not return a valid recovery session",
        });
      }

      const verifiedEmail =
        data.user.email?.trim().toLowerCase() ?? "";

      if (verifiedEmail !== email) {
        return response.status(403).json({
          success: false,
          code: "recovery_email_mismatch",
          message:
            "The recovery session does not belong to this email address",
        });
      }

      setSessionCookies(response, data.session);

      return response.status(200).json({
        success: true,
        code: "otp_verified",
        message:
          "Verification code accepted. You can now create a new password",
        data: {
          userId: data.user.id,
          email: data.user.email,
        },
      });
    } catch (error) {
      console.error(
        "Recovery OTP verification exception:",
        error,
      );

      return response.status(500).json({
        success: false,
        code: "otp_verification_internal_error",
        message:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : "An internal error occurred while verifying the code",
      });
    }
  },
);
// ---------- CHANGE PASSWORD
authRouter.post("/api/auth/forgot-password/reset-password",async (request: Request, response: Response) => {
    const body = request.body as {
      newPassword?: unknown;
      confirmNewPassword?: unknown;
    };

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmNewPassword =
      typeof body.confirmNewPassword === "string"
        ? body.confirmNewPassword
        : "";

    if (!newPassword || !confirmNewPassword) {
      return response.status(400).json({
        success: false,
        code: "missing_password_fields",
        message: "New password and password confirmation are required",
      });
    }

    if (newPassword.length < 8) {
      return response.status(400).json({
        success: false,
        code: "weak_password",
        message: "New password must contain at least eight characters",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return response.status(400).json({
        success: false,
        code: "password_mismatch",
        message: "Password confirmation does not match",
      });
    }

    const accessToken =
      typeof request.cookies?.["sb-access-token"] === "string"
        ? request.cookies["sb-access-token"]
        : "";

    const refreshToken =
      typeof request.cookies?.["sb-refresh-token"] === "string"
        ? request.cookies["sb-refresh-token"]
        : "";

    if (!accessToken || !refreshToken) {
      return response.status(401).json({
        success: false,
        code: "recovery_session_missing",
        message:
          "Recovery session is missing. Please request and verify a new OTP",
      });
    }

    try {
      const supabaseAuthClient = createSupabaseAuthClient();

      const {
        data: sessionData,
        error: sessionError,
      } = await supabaseAuthClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError || !sessionData.user || !sessionData.session) {
        console.error("Recovery session restore failed:", {
          name: sessionError?.name,
          code: sessionError?.code,
          message: sessionError?.message,
          status: sessionError?.status,
        });

        clearSessionCookies(response);

        return response.status(401).json({
          success: false,
          code: "recovery_session_expired",
          message:
            "Recovery session has expired. Please request and verify a new OTP",
        });
      }

      const { data, error } =
        await supabaseAuthClient.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        console.error("Password update failed:", {
          name: error.name,
          code: error.code,
          message: error.message,
          status: error.status,
        });

        if (error.code === "weak_password") {
          return response.status(400).json({
            success: false,
            code: "weak_password",
            message:
              "The new password does not meet the password security requirements",
          });
        }

        if (error.code === "same_password") {
          return response.status(400).json({
            success: false,
            code: "same_password",
            message:
              "The new password must be different from the current password",
          });
        }

        if (error.code === "reauthentication_needed") {
          clearSessionCookies(response);

          return response.status(403).json({
            success: false,
            code: "reauthentication_needed",
            message:
              "Your recovery session is no longer valid. Please request another OTP",
          });
        }

        if (
          error.code === "bad_jwt" ||
          error.code === "refresh_token_not_found" ||
          error.code === "refresh_token_already_used"
        ) {
          clearSessionCookies(response);

          return response.status(401).json({
            success: false,
            code: "recovery_session_expired",
            message:
              "Recovery session has expired. Please request another OTP",
          });
        }

        return response.status(error.status ?? 502).json({
          success: false,
          code: "password_update_failed",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Supabase could not update the password",
        });
      }

      if (!data.user) {
        return response.status(502).json({
          success: false,
          code: "invalid_password_update_response",
          message:
            "Supabase updated the password but did not return the user",
        });
      }

      clearSessionCookies(response);

      return response.status(200).json({
        success: true,
        code: "password_reset_success",
        message:
          "Password changed successfully. Please sign in with your new password",
      });
    } catch (error) {
      console.error("Password reset exception:", error);

      return response.status(500).json({
        success: false,
        code: "password_reset_internal_error",
        message:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : "An internal error occurred while changing the password",
      });
    }
  },
);