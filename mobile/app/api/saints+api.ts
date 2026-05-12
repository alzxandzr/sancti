import { listAllSaints } from "../../server/handlers/saint";
import type { Saint } from "../../server/types";

interface SaintSummary {
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

export async function GET(): Promise<Response> {
  try {
    const items = listAllSaints().map(summarize);
    return Response.json({ saints: items });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "saints list failed" },
      { status: 500 },
    );
  }
}
