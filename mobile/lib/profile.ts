import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureSession, supabase } from "./supabase";

export type StateInLife =
  | "single"
  | "dating_engaged"
  | "married"
  | "parent"
  | "religious"
  | "clergy"
  | "student"
  | "other";

export type PreferredTone = "gentle" | "direct" | "encouraging" | "contemplative";
export type PrayerDuration = 5 | 10 | 15 | 20 | 30;

export interface UserPreferences {
  state_in_life: StateInLife;
  preferred_tone: PreferredTone;
  prayer_duration_minutes: PrayerDuration;
}

const DEFAULTS: UserPreferences = {
  state_in_life: "other",
  preferred_tone: "gentle",
  prayer_duration_minutes: 10,
};

const LOCAL_KEY = "sancti.profile.v1";
const LOCAL_ONBOARDED_KEY = "sancti.onboarded.v1";

const readLocal = async (): Promise<UserPreferences | null> => {
  const raw = await AsyncStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UserPreferences>) };
  } catch {
    return null;
  }
};

const writeLocal = async (prefs: UserPreferences): Promise<void> => {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
};

export const loadPreferences = async (): Promise<UserPreferences | null> => {
  const userId = await ensureSession();
  if (!userId) return readLocal();

  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("profile load failed, falling back to local:", error.message);
    return readLocal();
  }
  if (!data?.preferences) return readLocal();
  return { ...DEFAULTS, ...(data.preferences as Partial<UserPreferences>) };
};

export const savePreferences = async (prefs: UserPreferences): Promise<void> => {
  await writeLocal(prefs);
  await AsyncStorage.setItem(LOCAL_ONBOARDED_KEY, "1");

  const userId = await ensureSession();
  if (!userId) return;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, preferences: prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) console.warn("profile save failed:", error.message);
};

/** Has the user completed (or skipped) onboarding on this device? */
export const isOnboarded = async (): Promise<boolean> => {
  const local = await AsyncStorage.getItem(LOCAL_ONBOARDED_KEY);
  if (local === "1") return true;
  const prefs = await loadPreferences();
  if (prefs) {
    await AsyncStorage.setItem(LOCAL_ONBOARDED_KEY, "1");
    return true;
  }
  return false;
};

export const markOnboarded = async (): Promise<void> => {
  await AsyncStorage.setItem(LOCAL_ONBOARDED_KEY, "1");
};
