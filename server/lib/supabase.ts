import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadPublicEnv, loadServerEnv } from "./env";

// Two clients, two trust levels.
//
//   Service-role: server-side only. Bypasses RLS. Used by API routes to write
//     audit logs and to operate across users (e.g. for cron jobs). Never ship
//     this key in the mobile bundle.
//
//   Public/anon: safe to bundle in the Expo app. Subject to RLS. Used for
//     auth and for the user-scoped reads/writes a signed-in client performs
//     directly against Postgres.

let cachedServiceClient: SupabaseClient | null = null;
let cachedPublicClient: SupabaseClient | null = null;
let serviceClientOverride: SupabaseClient | null = null;

export const getServiceSupabaseClient = (): SupabaseClient => {
  if (serviceClientOverride) return serviceClientOverride;
  if (cachedServiceClient) return cachedServiceClient;

  const env = loadServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase service client requested but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  }
  cachedServiceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
};

export const getPublicSupabaseClient = (): SupabaseClient => {
  if (cachedPublicClient) return cachedPublicClient;

  const env = loadPublicEnv();
  cachedPublicClient = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return cachedPublicClient;
};

// Test hook: inject a stub client. Pass null to clear.
export const __setServiceSupabaseClientForTest = (client: SupabaseClient | null): void => {
  serviceClientOverride = client;
  cachedServiceClient = null;
};

export const __resetSupabaseCacheForTest = (): void => {
  cachedServiceClient = null;
  cachedPublicClient = null;
  serviceClientOverride = null;
};
