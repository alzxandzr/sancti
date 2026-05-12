import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

// Local daily reminder so users come back to the today screen. Stores
// preferences (enabled + time-of-day) in AsyncStorage; mirroring into the
// Supabase profile is left for later when there's a real auth UI.

export interface ReminderPrefs {
  enabled: boolean;
  hour: number; // 0–23
  minute: number; // 0–59
}

const KEY = "sancti.reminder.v1";
const NOTIF_ID_KEY = "sancti.reminder.notifId.v1";

const DEFAULTS: ReminderPrefs = { enabled: false, hour: 8, minute: 0 };

export const loadReminderPrefs = async (): Promise<ReminderPrefs> => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULTS;
  }
};

const writePrefs = async (prefs: ReminderPrefs): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
};

const isNotificationsAvailable = (): boolean => {
  // expo-notifications local-schedule isn't supported on web.
  return Platform.OS !== "web";
};

const cancelExisting = async (): Promise<void> => {
  const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already gone is fine.
  }
  await AsyncStorage.removeItem(NOTIF_ID_KEY);
};

const ensurePermission = async (): Promise<boolean> => {
  if (!isNotificationsAvailable()) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
};

/** Sets up a recurring daily local notification at the chosen time. When
 *  enabled=false (or permission denied) this just clears any existing
 *  schedule. Returns the effective prefs (which may differ from the
 *  request — e.g. enabled forced to false when permission is denied). */
export const updateReminder = async (req: ReminderPrefs): Promise<ReminderPrefs> => {
  await cancelExisting();

  if (!req.enabled) {
    await writePrefs(req);
    return req;
  }

  if (!isNotificationsAvailable()) {
    const effective: ReminderPrefs = { ...req, enabled: false };
    await writePrefs(effective);
    return effective;
  }

  const granted = await ensurePermission();
  if (!granted) {
    const effective: ReminderPrefs = { ...req, enabled: false };
    await writePrefs(effective);
    return effective;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sancti",
      body: "Your daily reflection is waiting.",
      sound: false,
    },
    trigger: {
      hour: req.hour,
      minute: req.minute,
      repeats: true,
    } as unknown as Notifications.NotificationTriggerInput,
  });
  await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  await writePrefs(req);
  return req;
};

export const formatReminderTime = (h: number, m: number): string => {
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const remindersSupported = (): boolean => isNotificationsAvailable();
