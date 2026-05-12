import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { useAppFonts } from "../theme/fonts";
import { SessionProvider } from "../lib/session";
import { ensureSession } from "../lib/supabase";

// Hold the splash screen so the first painted frame already has the right
// typography. Without this, the screens flash in with the platform default
// font before Inter / EBGaramond / Spectral mount.
SplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: already hidden on hot reload.
});

const StatusBarFollowingTheme = () => {
  const { theme } = useTheme();
  return <StatusBar style={theme.dark ? "light" : "dark"} />;
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Kick off anonymous sign-in once on mount so every Supabase call has
  // a valid auth.uid(). Errors here surface later when a screen tries to
  // load/save and we hit RLS.
  useEffect(() => {
    ensureSession().catch((err) => {
      console.warn("Supabase ensureSession failed:", err);
    });
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarFollowingTheme />
        <SessionProvider>
          <Slot />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
