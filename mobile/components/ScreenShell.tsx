import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

interface Props {
  children: React.ReactNode;
  pad?: number;
  /** When true, wrap children in a ScrollView. Off for screens with absolute-positioned footers. */
  scroll?: boolean;
}

// Top-level wrapper for every screen. Applies the theme bg, padding, and a
// faint paper-texture wash (two overlapping radial-ish gradients done as
// translucent View blobs since RN doesn't ship CSS gradients out of the box).
export const ScreenShell = ({ children, pad = 24, scroll = true }: Props) => {
  const { theme } = useTheme();

  const inner = (
    <View
      style={{
        flex: 1,
        paddingHorizontal: pad,
        paddingTop: 12,
      }}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Paper-texture wash. In Cloister, warm brass highlight top-left + faint
          ink shadow bottom-right; in Vespers, candlelit brass top + cardinal
          warmth at the bottom. Approximated with two soft circles. */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 } as any}>
        <View
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: theme.dark
              ? "rgba(214,168,90,0.06)"
              : "rgba(168,130,58,0.10)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -160,
            right: -100,
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: theme.dark
              ? "rgba(180,85,90,0.05)"
              : "rgba(40,28,18,0.04)",
          }}
        />
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
};
