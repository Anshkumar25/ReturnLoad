// ---------------------------------------------------------------------
// Supabase client helpers.
//
// When NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are
// present this module creates a real browser Supabase client.
// When absent it's a no-op: all callers check APP_MODE first.
// ---------------------------------------------------------------------

import { APP_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Lazy-created singleton so the bundle stays small when not in supabase mode.
let client: Awaited<ReturnType<typeof createBrowserClient>> | null = null;

async function createBrowserClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

export async function getSupabase() {
  if (APP_MODE !== "supabase") throw new Error("Supabase is not configured");
  if (!client) client = await createBrowserClient();
  return client;
}

export type { Session, User as SupabaseUser } from "@supabase/supabase-js";