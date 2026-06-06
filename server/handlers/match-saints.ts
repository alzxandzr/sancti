import saints from "../data/saints.json";
import mappings from "../data/mappings.json";
import { getTodayLiturgicalContext, type LiturgicalDay } from "../lib/liturgical";
import { matchSaintsInputSchema, matchSaintsResponseSchema } from "../lib/validator";
import type { MatchWeight, RouteLabel, Saint, SaintMatch } from "../types";

const allSaints = saints as Saint[];
const matchWeights = mappings as MatchWeight[];

const overlapCount = (left: string[], right: string[]): number =>
  left.filter((item) => right.includes(item)).length;

// Liturgical boost rules:
//   * If today's celebration name contains the saint's name (or vice versa),
//     boost +30 — likely a feast day.
//   * If the celebration mentions Mary or the Blessed Virgin, boost +20 for
//     any saint with "mary" in themes/keywords/patronages OR named Mary.
const liturgicalBoost = (saint: Saint, liturgical: LiturgicalDay | null): number => {
  if (!liturgical) return 0;
  const celebration = liturgical.celebration.toLowerCase();
  const saintNameLower = saint.name.toLowerCase();
  // Strip honorifics for fuzzier match.
  const bareName = saintNameLower.replace(/^st\.?\s+|^bl\.?\s+|^ven\.?\s+/i, "");
  if (celebration.includes(bareName) || bareName.split(" ").every((part) => celebration.includes(part))) {
    return 30;
  }
  if (
    /(virgin\s+mary|blessed\s+virgin|assumption|annunciation|immaculate\s+conception|nativity\s+of\s+(the\s+)?(blessed|virgin)\s+mary|our\s+lady)/i.test(
      liturgical.celebration,
    )
  ) {
    const isMarian =
      /mary|marian/.test(saintNameLower) ||
      saint.themes.some((t) => /mary|marian/i.test(t)) ||
      saint.keywords.some((k) => /mary|marian/i.test(k)) ||
      saint.patronages.some((p) => /mary|marian/i.test(p));
    if (isMarian) return 20;
  }
  return 0;
};

export interface MatchSaintsContext {
  /** Inject today's liturgical context for tests. Falls back to live fetch. */
  liturgical?: LiturgicalDay | null;
}

// Theme overlap is multiplied by THEME_BOOST so user-specific themes
// meaningfully shift the ranking; otherwise the base mapping weight
// (typically 60–95) dominates and the top 3 never change per-route.
const THEME_BOOST = 15;

export const matchSaints = async (
  route: RouteLabel,
  themes: string[],
  ctx: MatchSaintsContext = {},
  excludeIds: string[] = [],
): Promise<SaintMatch[]> => {
  const parsed = matchSaintsInputSchema.parse({
    route,
    themes,
    exclude_ids: excludeIds.length > 0 ? excludeIds : undefined,
  });
  const normalizedThemes = parsed.themes.map((theme) => theme.toLowerCase());
  const excluded = new Set(parsed.exclude_ids ?? []);

  const liturgical =
    ctx.liturgical !== undefined
      ? ctx.liturgical
      : await getTodayLiturgicalContext().catch(() => null);

  const ranked = matchWeights
    .filter((entry) => entry.route === parsed.route)
    .filter((entry) => !excluded.has(entry.saint_id))
    .map((entry) => {
      const saint = allSaints.find((candidate) => candidate.id === entry.saint_id);
      if (!saint) return null;
      const saintThemes = saint.themes.map((t) => t.toLowerCase());
      const sharedThemes = saintThemes.filter((t) => normalizedThemes.includes(t));
      const score =
        entry.weight +
        THEME_BOOST * overlapCount(saintThemes, normalizedThemes) +
        liturgicalBoost(saint, liturgical);
      return { saint, sharedThemes, score };
    })
    .filter((row): row is { saint: Saint; sharedThemes: string[]; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map<SaintMatch>(({ saint, sharedThemes }) => {
      const themeList = (sharedThemes.length ? sharedThemes : saint.themes.slice(0, 2)).map(
        (t) => t.replace(/-/g, " "),
      );
      const themePhrase =
        themeList.length === 0
          ? "your season"
          : themeList.length === 1
            ? themeList[0]
            : themeList.length === 2
              ? `${themeList[0]} and ${themeList[1]}`
              : `${themeList.slice(0, -1).join(", ")}, and ${themeList[themeList.length - 1]}`;
      const reason = sharedThemes.length
        ? `Walks with you through ${themePhrase}.`
        : `Known for ${themePhrase}.`;
      return {
        id: saint.id,
        name: saint.name,
        reason,
        themes: sharedThemes.length ? sharedThemes : saint.themes.slice(0, 2),
        feast_day: saint.feast_day,
        prayer_reference: `Ask ${saint.name} to intercede for this intention.`,
        ...(saint.wikipedia_title ? { wikipedia_title: saint.wikipedia_title } : {}),
      };
    });

  return matchSaintsResponseSchema.parse({ saints: ranked }).saints;
};

export default async function handler(
  req: { body: { route: RouteLabel; themes: string[]; exclude_ids?: string[] } },
  res: {
    status: (code: number) => { json: (payload: { saints: SaintMatch[] } | { error: string }) => void };
  },
): Promise<void> {
  try {
    const list = await matchSaints(
      req.body.route,
      req.body.themes,
      {},
      req.body.exclude_ids ?? [],
    );
    res.status(200).json({ saints: list });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "match-saints failed" });
  }
}
