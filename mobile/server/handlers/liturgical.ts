import saintsData from "../data/saints.json";
import { getTodayLiturgicalContext } from "../lib/liturgical";
import type { Saint } from "../types";

const allSaints = saintsData as Saint[];

/** Loose name match: strip honorifics + lowercase and check substring both
 *  ways. Handles "Memorial of St. Catherine of Siena" → "st-catherine-siena"
 *  and "Saint Joseph the Worker" → "st-joseph". */
const findSaintByCelebration = (celebration: string): Saint | null => {
  const cel = celebration
    .toLowerCase()
    .replace(/^(memorial|optional memorial|feast|solemnity)\s+of\s+/i, "")
    .replace(/^(saint|st\.?|sts\.?|bl\.?|ven\.?)\s+/i, "")
    .trim();
  if (cel.length === 0) return null;
  // Score saints by whether the celebration mentions their bare name.
  let best: { saint: Saint; score: number } | null = null;
  for (const s of allSaints) {
    const bare = s.name
      .toLowerCase()
      .replace(/^(saint|st\.?|sts\.?|bl\.?|ven\.?)\s+/i, "")
      .trim();
    if (bare.length === 0) continue;
    let score = 0;
    if (cel.includes(bare)) score = bare.length;
    else if (bare.includes(cel)) score = cel.length;
    if (score > 0 && (best === null || score > best.score)) {
      best = { saint: s, score };
    }
  }
  return best?.saint ?? null;
};

export interface LiturgicalTodayResponse {
  date: string;
  celebration: string;
  rank: string;
  saint: {
    id: string;
    name: string;
    title: string;
    feast_day: string;
    era: string;
    wikipedia_title?: string;
  } | null;
}

export default async function handler(
  _req: unknown,
  res: {
    status: (code: number) => {
      json: (payload: LiturgicalTodayResponse | { error: string }) => void;
    };
  },
): Promise<void> {
  try {
    const ctx = await getTodayLiturgicalContext();
    const saint = findSaintByCelebration(ctx.celebration);
    res.status(200).json({
      date: ctx.date,
      celebration: ctx.celebration,
      rank: ctx.rank,
      saint: saint
        ? {
            id: saint.id,
            name: saint.name,
            title: saint.title,
            feast_day: saint.feast_day,
            era: saint.era,
            ...(saint.wikipedia_title ? { wikipedia_title: saint.wikipedia_title } : {}),
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "liturgical lookup failed",
    });
  }
}
