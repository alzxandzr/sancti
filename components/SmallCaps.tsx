import React from "react";
import { Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

interface Props {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: any;
}

// Uppercase + tracked label. Real small-caps glyphs would need a font that
// supports the "smcp" feature; we approximate with uppercase + letter spacing.
export const SmallCaps = ({ children, color, size = 11, style }: Props) => {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: theme.fonts.body.semibold,
          fontSize: size,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: color ?? theme.inkMuted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};
