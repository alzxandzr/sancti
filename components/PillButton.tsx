import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost";
  trailingIcon?: React.ReactNode;
  style?: any;
}

// Full-width pill button. Primary uses ink (dark on parchment / warm-white on
// candlelit bg). Ghost is a hairline outline for secondary actions.
export const PillButton = ({
  label,
  onPress,
  variant = "primary",
  trailingIcon,
  style,
}: Props) => {
  const { theme } = useTheme();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: 26,
          backgroundColor: isPrimary ? theme.ink : "transparent",
          borderWidth: isPrimary ? 0 : 1,
          borderColor: theme.rule,
          paddingHorizontal: 22,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: isPrimary ? theme.bg : theme.ink,
          fontFamily: theme.fonts.body.medium,
          fontSize: 16,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
      {trailingIcon ? <View style={{ marginLeft: 10 }}>{trailingIcon}</View> : null}
    </Pressable>
  );
};
