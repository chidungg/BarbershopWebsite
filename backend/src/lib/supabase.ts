import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

const supabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

export const supabase = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  supabaseOptions,
);

export function createSupabaseAuthClient() {
  return createClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    supabaseOptions,
  );
}

export function createSupabaseAdminClient() {
  return createClient(
    env.supabaseUrl,
    env.supabaseServiceRoleKey,
    supabaseOptions,
  );
}