// Design tokens for the mobile UI. Centralizing these means screens can
// share a vertical rhythm and type scale instead of each picking ad-hoc
// numbers, which is what made the early Phase-1 screens look uneven.
//
// Use:
//   <View style={{ height: SP.md }} />
//   <Text style={TY.display.h1(theme)}>...</Text>

import type { Theme } from "./tokens";

// Vertical rhythm. Sticks to a 4px subgrid except for the "section" gap
// which is generous on purpose (28) so a section break feels different
// from an intra-card break.
export const SP = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  section: 28,
  hero: 40,
} as const;

// Border radii. 999 stays as the unconditional pill.
export const R = {
  pill: 999,
  card: 16,
  hero: 22,
  chip: 12,
} as const;

// Typography helpers. Each returns a style object that captures font
// family + size + line height + tracking together so callers can't break
// the rhythm by setting only one.
export const TY = {
  display: {
    /** Page headline; pairs with brass-italic accent words. */
    h1: (t: Theme) => ({
      fontFamily: t.fonts.display.regular,
      fontSize: 32,
      lineHeight: 36,
      color: t.ink,
      letterSpacing: -0.4,
    }),
    /** Card heading. */
    h2: (t: Theme) => ({
      fontFamily: t.fonts.display.regular,
      fontSize: 24,
      lineHeight: 28,
      color: t.ink,
      letterSpacing: -0.2,
    }),
    /** Hero day prompt title — sized between h1 and h2. */
    h3: (t: Theme) => ({
      fontFamily: t.fonts.display.medium,
      fontSize: 22,
      lineHeight: 28,
      color: t.ink,
      letterSpacing: -0.2,
    }),
    /** Small saint-name in lists. */
    saintName: (t: Theme) => ({
      fontFamily: t.fonts.display.medium,
      fontSize: 18,
      lineHeight: 22,
      color: t.ink,
    }),
    /** Italic sub-headline ("Drawn from your words…"). */
    italic: (t: Theme) => ({
      fontFamily: t.fonts.display.italic,
      fontSize: 14,
      lineHeight: 22,
      color: t.inkMuted,
    }),
  },
  body: {
    base: (t: Theme) => ({
      fontFamily: t.fonts.body.regular,
      fontSize: 14,
      lineHeight: 22,
      color: t.inkSoft,
    }),
    small: (t: Theme) => ({
      fontFamily: t.fonts.body.regular,
      fontSize: 12,
      lineHeight: 18,
      color: t.inkMuted,
    }),
    medium: (t: Theme) => ({
      fontFamily: t.fonts.body.medium,
      fontSize: 14,
      lineHeight: 22,
      color: t.ink,
    }),
  },
} as const;

/** Brass-italic accent used inside an h1/h2 to highlight a word. */
export const brassItalic = (t: Theme) => ({
  fontFamily: t.fonts.display.italic,
  color: t.brass,
});
