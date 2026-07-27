import { Router, type Request, type Response } from "express";

import { env } from "../../config/env";
import { createSupabaseOAuthClient } from "../../lib/supabase-oauth";

export const authRouter = Router();

function buildFrontendRedirect(
  parameter: "authSuccess" | "authError",
  value: string,
): string {
  const redirectUrl = new URL(env.frontendUrl);
  redirectUrl.searchParams.set(parameter, value);

  return redirectUrl.toString();
}

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

authRouter.get(
  "/auth/google/callback",
  async (request: Request, response: Response) => {
    response.setHeader("Cache-Control", "no-store");

    const providerError =
      typeof request.query.error === "string" ? request.query.error : "";

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

    const code =
      typeof request.query.code === "string"
        ? request.query.code.trim()
        : "";

    if (!code) {
      return response.redirect(
        302,
        buildFrontendRedirect("authError", "missing_oauth_code"),
      );
    }

    try {
      const supabase = createSupabaseOAuthClient(request, response);
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(code);

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

      const isProduction = process.env.NODE_ENV === "production";

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax" as const,
        path: "/",
      };

      response.cookie("sb-access-token", data.session.access_token, {
        ...cookieOptions,
        maxAge: data.session.expires_in * 1000,
      });

      response.cookie("sb-refresh-token", data.session.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      console.log("Google OAuth login successful:", {
        userId: data.user.id,
        email: data.user.email,
      });

      return response.redirect(
        302,
        buildFrontendRedirect("authSuccess", "google_login_success"),
      );
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
  },
);