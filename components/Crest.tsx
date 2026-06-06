import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

interface Props {
  size?: number;
}

// Welcome-screen crest: solid ring, dashed inner ring, equilateral cross,
// tiny floating cross above. Matches the SVG in design_handoff_sancti/screens.jsx.
export const Crest = ({ size = 42 }: Props) => {
  const { theme } = useTheme();
  const height = Math.round(size * (56 / 42));
  return (
    <Svg width={size} height={height} viewBox="0 0 42 56">
      <Circle cx={21} cy={28} r={20} stroke={theme.brass} strokeWidth={0.8} fill="none" />
      <Circle
        cx={21}
        cy={28}
        r={17}
        stroke={theme.brass}
        strokeWidth={0.4}
        strokeDasharray="1 2"
        fill="none"
      />
      <Path
        d="M21 13 L21 43 M11 28 L31 28"
        stroke={theme.brass}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Path
        d="M21 9 L21 14 M19 11 L23 11"
        stroke={theme.brass}
        strokeWidth={1}
        strokeLinecap="round"
      />
    </Svg>
  );
};
