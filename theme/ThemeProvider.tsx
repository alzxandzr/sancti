import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Theme, type ThemeId, themes } from "./tokens";

export type ThemePreference = ThemeId | "system";

interface ThemeContextValue {
  theme: Theme;
  id: ThemeId;
  setTheme: (next: ThemePreference) => void;
  /** "system" means follow OS appearance; an explicit id pins the choice. */
  preference: ThemePreference;
}

const PREF_KEY = "sancti.themePreference.v1";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isPreference = (raw: string | null): raw is ThemePreference =>
  raw === "system" || raw === "cloister" || raw === "vespers";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(PREF_KEY).then((raw) => {
      if (!cancelled && isPreference(raw)) setPreferenceState(raw);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(PREF_KEY, next).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedId: ThemeId =
      preference === "system" ? (system === "dark" ? "vespers" : "cloister") : preference;
    return {
      theme: themes[resolvedId],
      id: resolvedId,
      preference,
      setTheme,
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return ctx;
};
