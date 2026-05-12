import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// AsyncStorage touches `window` at module load, which crashes during Expo's
// Node-side static render. On the server we hand supabase-js no storage and
// let it use its built-in memory shim; the browser path still gets persistent
// AsyncStorage so the anonymous session survives reloads.
const isBrowser = typeof window !== "undefined";

// Build a stub that defers the env-missing error until a property is actually
// accessed. The static-render pass loads this module but never calls a
// method on it — if we threw at module load, every Expo export -p web build
// without local .env would fail.
const makeMissingEnvStub = (): SupabaseClient =>
  new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. " +
          "Add them to mobile/.env.local (dev) or the Vercel project env (prod) and restart.",
      );
    },
  });

export const supabase: SupabaseClient =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: isBrowser ? AsyncStorage : undefined,
          persistSession: isBrowser,
          autoRefreshToken: isBrowser,
          detectSessionInUrl: false,
        },
      })
    : makeMissingEnvStub();

/**
 * Ensure the device has an authenticated user. We use Supabase anonymous
 * sign-in so every device gets a stable auth.uid() with zero UI — RLS
 * policies that key off auth.uid() then "just work" for that user.
 *
 * Returns the user id, or null if anonymous sign-in is disabled in the
 * Supabase project (Auth → Providers → Anonymous Sign-Ins). Callers
 * should fall back to local-only storage in that case.
 */
export const ensureSession = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;

  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn(
      `Supabase anonymous sign-in unavailable (${error.message}). ` +
        "Falling back to local-only storage. " +
        "Enable Anonymous Sign-ins in Supabase → Authentication → Providers " +
        "for cross-device persistence.",
    );
    return null;
  }
  return signIn.user?.id ?? null;
};
