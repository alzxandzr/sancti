import { listAllSaints } from "./saint";
import type { Saint } from "../types";

// Lightweight projection used by the browse-all screen — drops the longer
// `short_bio` / `source_links` to keep the list payload small.
export interface SaintSummary {
  id: string;
  name: string;
  title: string;
  era: string;
  feast_day: string;
  themes: string[];
  wikipedia_title?: string;
}

const summarize = (s: Saint): SaintSummary => ({
  id: s.id,
  name: s.name,
  title: s.title,
  era: s.era,
  feast_day: s.feast_day,
  themes: s.themes,
  ...(s.wikipedia_title ? { wikipedia_title: s.wikipedia_title } : {}),
});

export default async function handler(
  _req: unknown,
  res: {
    status: (code: number) => {
      json: (payload: { saints: SaintSummary[] } | { error: string }) => void;
    };
  },
): Promise<void> {
  try {
    const items = listAllSaints().map(summarize);
    res.status(200).json({ saints: items });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "saints list failed" });
  }
}
