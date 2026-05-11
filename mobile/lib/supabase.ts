import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. " +
      "Add them to mobile/.env.local and restart Expo.",
  );
}

// One shared client for the whole app. AsyncStorage backs session
// persistence so the anonymous user-id survives app reloads.
export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

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
