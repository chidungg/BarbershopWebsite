import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { Request, Response } from "express";

import { env } from "../config/env";

export function createSupabaseOAuthClient(request: Request, response: Response) {
  const isProduction = process.env.NODE_ENV === "production";

  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.cookie ?? "");
      },

      setAll(cookiesToSet, headers) {
        // Supabase auth events may finish after an Express redirect has already
        // committed the response. Headers (including cookies) are immutable at
        // that point, so a late write must be ignored instead of crashing Node.
        if (response.headersSent) {
          return;
        }

        Object.entries(headers).forEach(([name, value]) => {
          response.setHeader(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              secure: isProduction,
              sameSite: "lax",
              path: "/",
            }),
          );
        });
      },
    },
  });
}
