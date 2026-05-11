import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-side Supabase client. Mirror of mobile/lib/supabase.ts — same
// anonymous sign-in pattern, but uses localStorage for session persistence
// (Supabase's default in browser environments) instead of AsyncStorage.
//
// Anything imported from this file MUST NOT reach a server bundle: the
// publishable key is safe in the browser bundle but the file uses
// browser-only APIs (window/localStorage) inside the Supabase client.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null = null;

export const getBrowserSupabase = (): SupabaseClient => {
  if (cached) return cached;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. " +
        "Add them to .env.local (root) and restart `next dev`.",
    );
  }
  cached = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
};

/**
 * Ensure the browser has an authenticated Supabase user. Mirrors
 * mobile/lib/supabase.ts:ensureSession — anonymous sign-in if no session,
 * returns user_id (UUID) or null if anonymous sign-ins are disabled in the
 * Supabase project. Callers should degrade to ephemeral local-only state
 * in that case.
 */
export const ensureWebSession = async (): Promise<string | null> => {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;

  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn(
      `Supabase anonymous sign-in unavailable (${error.message}). ` +
        "Falling back to local-only storage for this tab. " +
        "Enable Anonymous Sign-ins in Supabase → Authentication → Providers.",
    );
    return null;
  }
  return signIn.user?.id ?? null;
};
