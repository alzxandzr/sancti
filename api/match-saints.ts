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

export const matchSaints = async (
  route: RouteLabel,
  themes: string[],
  ctx: MatchSaintsContext = {},
): Promise<SaintMatch[]> => {
  const parsed = matchSaintsInputSchema.parse({ route, themes });
  const normalizedThemes = parsed.themes.map((theme) => theme.toLowerCase());

  const liturgical =
    ctx.liturgical !== undefined
      ? ctx.liturgical
      : await getTodayLiturgicalContext().catch(() => null);

  const ranked = matchWeights
    .filter((entry) => entry.route === parsed.route)
    .map((entry) => {
      const saint = allSaints.find((candidate) => candidate.id === entry.saint_id);
      if (!saint) return null;
      const saintThemes = saint.themes.map((t) => t.toLowerCase());
      const sharedThemes = saintThemes.filter((t) => normalizedThemes.includes(t));
      const score =
        entry.weight + overlapCount(saintThemes, normalizedThemes) + liturgicalBoost(saint, liturgical);
      return { saint, sharedThemes, score };
    })
    .filter((row): row is { saint: Saint; sharedThemes: string[]; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map<SaintMatch>(({ saint, sharedThemes }) => ({
      name: saint.name,
      reason: `Selected for ${parsed.route.toLowerCase()} because of themes: ${
        sharedThemes.join(", ") || saint.themes.slice(0, 2).join(", ")
      }.`,
      themes: sharedThemes.length ? sharedThemes : saint.themes.slice(0, 2),
      feast_day: saint.feast_day,
      prayer_reference: `Ask ${saint.name} to intercede for this intention.`,
    }));

  return matchSaintsResponseSchema.parse({ saints: ranked }).saints;
};

export default async function handler(
  req: { body: { route: RouteLabel; themes: string[] } },
  res: {
    status: (code: number) => { json: (payload: { saints: SaintMatch[] } | { error: string }) => void };
  },
): Promise<void> {
  try {
    const list = await matchSaints(req.body.route, req.body.themes);
    res.status(200).json({ saints: list });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "match-saints failed" });
  }
}
