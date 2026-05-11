import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureSession, supabase } from "./supabase";

// Saved saints persistence. Prefers Supabase (saved_saints table); falls
// back to AsyncStorage when no auth session is available so the feature
// works whether or not anonymous sign-ins are enabled at the project.

const LOCAL_KEY = "sancti.savedSaints.v1";

const readLocal = async (): Promise<Set<string>> => {
  const raw = await AsyncStorage.getItem(LOCAL_KEY);
  if (!raw) return new Set();
  try {
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
};

const writeLocal = async (set: Set<string>): Promise<void> => {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify([...set]));
};

export const listSavedSaints = async (): Promise<string[]> => {
  const userId = await ensureSession();
  if (!userId) return [...(await readLocal())];

  const { data, error } = await supabase
    .from("saved_saints")
    .select("saint_id")
    .order("saved_at", { ascending: false });
  if (error) {
    console.warn("savedSaints load failed, falling back to local:", error.message);
    return [...(await readLocal())];
  }
  return (data ?? []).map((row) => row.saint_id as string);
};

export const isSaintSaved = async (saintId: string): Promise<boolean> => {
  const list = await listSavedSaints();
  return list.includes(saintId);
};

export const saveSaint = async (saintId: string): Promise<void> => {
  const userId = await ensureSession();
  if (!userId) {
    const cur = await readLocal();
    cur.add(saintId);
    await writeLocal(cur);
    return;
  }
  const { error } = await supabase
    .from("saved_saints")
    .upsert({ user_id: userId, saint_id: saintId }, { onConflict: "user_id,saint_id" });
  if (error) {
    console.warn("saveSaint Supabase failed, falling back to local:", error.message);
    const cur = await readLocal();
    cur.add(saintId);
    await writeLocal(cur);
  }
};

export const unsaveSaint = async (saintId: string): Promise<void> => {
  const userId = await ensureSession();
  if (!userId) {
    const cur = await readLocal();
    cur.delete(saintId);
    await writeLocal(cur);
    return;
  }
  const { error } = await supabase
    .from("saved_saints")
    .delete()
    .eq("user_id", userId)
    .eq("saint_id", saintId);
  if (error) {
    console.warn("unsaveSaint Supabase failed, falling back to local:", error.message);
    const cur = await readLocal();
    cur.delete(saintId);
    await writeLocal(cur);
  }
};
