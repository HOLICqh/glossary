import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, hasSupabaseConfig } from "@/lib/env";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseAdmin;
}
