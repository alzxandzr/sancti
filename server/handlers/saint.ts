import saints from "../data/saints.json";
import mappings from "../data/mappings.json";
import type { MatchWeight, RouteLabel, Saint } from "../types";

const allSaints = saints as Saint[];
const matchWeights = mappings as MatchWeight[];

export const findSaintById = (id: string): Saint | null =>
  allSaints.find((s) => s.id === id) ?? null;

export const listAllSaints = (): Saint[] => allSaints;

// Highest-weighted route for a given saint, or null when unmapped. Used so
// the saint detail screen can start a plan with a sensible route even if
// the user never went through intake.
export const suggestedRouteForSaint = (id: string): RouteLabel | null => {
  const rows = matchWeights.filter((m) => m.saint_id === id);
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.weight - a.weight);
  return rows[0].route;
};

export interface SaintWithRoute extends Saint {
  suggested_route: RouteLabel | null;
  suggested_themes: string[];
}

export default async function handler(
  req: { query: { id?: string | string[] } },
  res: {
    status: (code: number) => {
      json: (payload: SaintWithRoute | { error: string }) => void;
    };
  },
): Promise<void> {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) {
    res.status(400).json({ error: "missing id" });
    return;
  }
  const saint = findSaintById(id);
  if (!saint) {
    res.status(404).json({ error: `saint '${id}' not found` });
    return;
  }
  const route = suggestedRouteForSaint(id);
  const themes =
    matchWeights.find((m) => m.saint_id === id && m.route === route)?.themes ??
    saint.themes.slice(0, 3);
  res.status(200).json({ ...saint, suggested_route: route, suggested_themes: themes });
}
