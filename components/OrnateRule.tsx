import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { SmallCaps } from "./SmallCaps";

interface Props {
  label?: string;
}

// Hairline – ornament – hairline divider. Centerpiece is either a small
// caps label or a brass diamond, matching the design bundle.
export const OrnateRule = ({ label }: Props) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: 0.85,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
      {label ? (
        <SmallCaps color={theme.inkMuted} size={9}>
          {label}
        </SmallCaps>
      ) : (
        <Svg width={10} height={10} viewBox="0 0 10 10">
          <Path
            d="M5 1 L9 5 L5 9 L1 5 Z"
            fill="none"
            stroke={theme.brass}
            strokeWidth={0.8}
          />
        </Svg>
      )}
      <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
    </View>
  );
};
