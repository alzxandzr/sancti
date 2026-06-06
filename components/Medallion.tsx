import React from "react";
import { Image, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { useWikipediaSummary } from "../lib/wikipediaImage";

// Strip "St.", "Sts.", "Bl.", "Ven." prefixes and reduce a saint name to
// 1-2 initials. The monogram fallback when no portrait is available.
const initialsOf = (name: string): string => {
  const clean = name.replace(/^(St\.?|Sts\.?|Bl\.?|Ven\.?)\s+/i, "").trim();
  const parts = clean.split(/[\s&]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface MedallionProps {
  name: string;
  size?: number;
  ornate?: boolean;
  /** Wikipedia article slug; when present we fetch and display the portrait. */
  wikipediaTitle?: string | null;
}

// Small brass-ring monogram for list cards. When a wikipediaTitle is
// supplied, we replace the initials with the article's lead image.
export const Medallion = ({ name, size = 56, ornate = false, wikipediaTitle }: MedallionProps) => {
  const { theme } = useTheme();
  const { data } = useWikipediaSummary(wikipediaTitle);
  const fontSize = Math.round(size * 0.42);
  const hasImage = !!data?.thumbnail;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.surface2,
        borderWidth: 1,
        borderColor: theme.brass,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: data!.thumbnail! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={`Portrait of ${name}`}
        />
      ) : (
        <>
          <View
            style={{
              position: "absolute",
              top: 3,
              left: 3,
              right: 3,
              bottom: 3,
              borderRadius: (size - 6) / 2,
              borderWidth: 1,
              borderColor: theme.brassDeep,
              backgroundColor: theme.surface,
            }}
          />
          <Text
            style={{
              fontFamily: theme.fonts.display.medium,
              fontSize,
              color: theme.ink,
              letterSpacing: 0.5,
            }}
          >
            {initialsOf(name)}
          </Text>
        </>
      )}
      {ornate ? (
        <View
          style={{ position: "absolute", width: size, height: size }}
          pointerEvents="none"
        >
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Circle
              cx={50}
              cy={50}
              r={46}
              fill="none"
              stroke={theme.brass}
              strokeWidth={0.4}
              strokeDasharray="2 3"
              opacity={0.6}
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
};

interface FeatureMedallionProps {
  name: string;
  size?: number;
  wikipediaTitle?: string | null;
}

// Large medallion for the Saint detail screen: halo rings + small cross
// floating above + portrait (or display-face monogram).
export const FeatureMedallion = ({ name, size = 168, wikipediaTitle }: FeatureMedallionProps) => {
  const { theme } = useTheme();
  const { data } = useWikipediaSummary(wikipediaTitle);
  const hasImage = !!(data?.original ?? data?.thumbnail);
  const imageUrl = data?.original ?? data?.thumbnail ?? null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.surface2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.dark ? theme.brass : theme.brassDeep,
        overflow: "hidden",
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: imageUrl! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={`Portrait of ${name}`}
        />
      ) : (
        <Text
          style={{
            fontFamily: theme.fonts.display.medium,
            fontSize: Math.round(size * 0.34),
            color: theme.ink,
            letterSpacing: 1,
          }}
        >
          {initialsOf(name)}
        </Text>
      )}
      <View
        style={{ position: "absolute", width: size, height: size }}
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Circle
            cx={100}
            cy={100}
            r={92}
            fill="none"
            stroke={theme.brass}
            strokeWidth={0.6}
            opacity={0.6}
          />
          <Circle
            cx={100}
            cy={100}
            r={86}
            fill="none"
            stroke={theme.brass}
            strokeWidth={0.4}
            strokeDasharray="1 3"
            opacity={0.5}
          />
          <Path
            d="M100 8 L100 18 M95 13 L105 13"
            stroke={theme.brass}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
};
