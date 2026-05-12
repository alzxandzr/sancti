import React from "react";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";

interface Props {
  /** When true, fills the chevron capsule with the elevated surface color (used on the saint screen's hero band). */
  raised?: boolean;
}

// Circular hairline button with a leftward chevron — shared across intake,
// results, plan, and saint detail screens.
export const BackButton = ({ raised = false }: Props) => {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: raised ? theme.surface : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={9} height={14} viewBox="0 0 9 14">
        <Path
          d="M7 1L1 7l6 6"
          stroke={theme.inkSoft}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
};
