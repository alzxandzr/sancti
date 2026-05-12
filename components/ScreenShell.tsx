import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
//
// Reads safe-area insets explicitly (via useSafeAreaInsets) and applies them
// as padding rather than wrapping in SafeAreaView. The SafeAreaView component
// can mis-apply insets on physical devices under New Arch + SDK 54, leaving
// content under the notch/status bar.
export const ScreenShell = ({ children, pad = 24, scroll = true }: Props) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>{inner}</View>
      )}
    </View>
  );
};
