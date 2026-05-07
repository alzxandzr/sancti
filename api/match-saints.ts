import saints from "../data/saints.json";
import mappings from "../data/mappings.json";
import { matchSaintsInputSchema, matchSaintsResponseSchema } from "../lib/validator";
import type { MatchWeight, RouteLabel, Saint, SaintMatch } from "../types";

const allSaints = saints as Saint[];
const matchWeights = mappings as MatchWeight[];

const overlapCount = (left: string[], right: string[]): number =>
  left.filter((item) => right.includes(item)).length;

export const matchSaints = (route: RouteLabel, themes: string[]): SaintMatch[] => {
  const parsed = matchSaintsInputSchema.parse({ route, themes });
  const normalizedThemes = parsed.themes.map((theme) => theme.toLowerCase());

  const ranked = matchWeights
    .filter((entry) => entry.route === parsed.route)
    .map((entry) => {
      const saint = allSaints.find((candidate) => candidate.id === entry.saint_id);
      if (!saint) {
        return null;
      }

      const saintThemes = saint.themes.map((theme) => theme.toLowerCase());
      const sharedThemes = saintThemes.filter((theme) => normalizedThemes.includes(theme));
      const score = entry.weight + overlapCount(saintThemes, normalizedThemes);

      return {
        saint,
        sharedThemes,
        score,
      };
    })
    .filter((row): row is { saint: Saint; sharedThemes: string[]; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map<SaintMatch>(({ saint, sharedThemes }) => ({
      name: saint.name,
      reason: `Selected for ${parsed.route.toLowerCase()} because of themes: ${sharedThemes.join(", ") || saint.themes.slice(0, 2).join(", ")}.`,
      themes: sharedThemes.length ? sharedThemes : saint.themes.slice(0, 2),
      feast_day: saint.feast_day,
      prayer_reference: `Ask ${saint.name} to intercede for this intention.`,
    }));

  return matchSaintsResponseSchema.parse({ saints: ranked }).saints;
};

export default function handler(
  req: { body: { route: RouteLabel; themes: string[] } },
  res: { status: (code: number) => { json: (payload: { saints: SaintMatch[] }) => void } },
): void {
  const saintsList = matchSaints(req.body.route, req.body.themes);
  res.status(200).json({ saints: saintsList });
}
