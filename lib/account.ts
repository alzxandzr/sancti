import { supabase, ensureSession } from "./supabase";

export interface AccountInfo {
  user_id: string | null;
  email: string | null;
  is_anonymous: boolean;
}

export const getAccountInfo = async (): Promise<AccountInfo> => {
  const userId = await ensureSession();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return {
    user_id: userId ?? null,
    email: user?.email ?? null,
    is_anonymous: !!user?.is_anonymous,
  };
};

/** Convert the current anonymous user to a permanent one by linking an
 *  email identity. Supabase emails a magic confirmation link to the
 *  given address; clicking it merges the anonymous data under the new
 *  permanent identity. */
export const linkEmail = async (email: string): Promise<void> => {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("That doesn't look like an email address.");
  }
  await ensureSession(); // make sure we have a user to link onto
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw new Error(error.message);
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};
