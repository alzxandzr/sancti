// Theme tokens for Sancti — two parallel directions ported from the design
// handoff. Cloister = warm parchment (default light). Vespers = candlelit
// cathedral (default dark). Both share layouts and copy; only colors,
// ornament density, and font family change.
//
// Fonts are loaded via expo-font in the root layout. Each weight + italic
// combination is its own font file with its own family name, because RN
// can't synthesize bold/italic from a regular variant. Use the variant
// helpers below (theme.fonts.display.mediumItalic, etc.) and DO NOT set
// fontWeight or fontStyle alongside fontFamily — they'd just be ignored
// (or worse, trigger system-font fallback on some Android builds).

export interface DisplayVariants {
  regular: string;
  italic: string;
  medium: string;
  mediumItalic: string;
}

export interface BodyVariants {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

export interface ThemeFonts {
  display: DisplayVariants;
  body: BodyVariants;
  mono: string;
}

export interface Theme {
  id: "cloister" | "vespers";
  name: string;
  tagline: string;
  dark: boolean;

  // surface
  bg: string;
  surface: string;
  surface2: string;
  hairline: string;
  rule: string;

  // ink
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkFaint: string;

  // accents
  brass: string;
  brassDeep: string;
  terracotta: string;
  olive: string;
  cardinal: string;

  fonts: ThemeFonts;
}

const interFamily: BodyVariants = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

const cloisterDisplay: DisplayVariants = {
  regular: "EBGaramond_400Regular",
  italic: "EBGaramond_400Regular_Italic",
  medium: "EBGaramond_500Medium",
  mediumItalic: "EBGaramond_500Medium_Italic",
};

const vespersDisplay: DisplayVariants = {
  regular: "Spectral_400Regular",
  italic: "Spectral_400Regular_Italic",
  medium: "Spectral_500Medium",
  mediumItalic: "Spectral_500Medium_Italic",
};

const monoFamily = "JetBrainsMono_400Regular";

export const cloister: Theme = {
  id: "cloister",
  name: "Cloister",
  tagline: "Warm parchment · illuminated-manuscript hints",
  dark: false,

  bg: "#efe6d3",
  surface: "#f6efe0",
  surface2: "#e6dcc4",
  hairline: "rgba(40,28,18,0.14)",
  rule: "rgba(40,28,18,0.22)",

  ink: "#1d150e",
  inkSoft: "#3a2d1f",
  inkMuted: "#7a6a52",
  inkFaint: "rgba(40,28,18,0.45)",

  brass: "#a8823a",
  brassDeep: "#7e5f23",
  terracotta: "#a8442a",
  olive: "#5b6a36",
  cardinal: "#7a1e21",

  fonts: { display: cloisterDisplay, body: interFamily, mono: monoFamily },
};

export const vespers: Theme = {
  id: "vespers",
  name: "Vespers",
  tagline: "Candlelit cathedral · deep dim brass",
  dark: true,

  bg: "#100c0a",
  surface: "#1a1410",
  surface2: "#241c16",
  hairline: "rgba(232,212,168,0.12)",
  rule: "rgba(232,212,168,0.22)",

  ink: "#f1e7d0",
  inkSoft: "#d8c9a6",
  inkMuted: "#9b8b6e",
  inkFaint: "rgba(241,231,208,0.45)",

  brass: "#d6a85a",
  brassDeep: "#a07a35",
  terracotta: "#c46a3d",
  olive: "#9aa572",
  cardinal: "#b4555a",

  fonts: { display: vespersDisplay, body: interFamily, mono: monoFamily },
};

export const themes = { cloister, vespers } as const;
export type ThemeId = keyof typeof themes;
