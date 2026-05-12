export interface LiturgicalDay {
  date: string;
  celebration: string;
  rank: string;
}

interface LiturgicalEntry {
  date?: number | string;
  name?: string;
  grade?: string | number;
  grade_lcl?: string;
}

const fallbackDay = (isoDate: string): LiturgicalDay => ({
  date: isoDate,
  celebration: "Feria / Weekday in Ordinary Time",
  rank: "weekday",
});

export const getLiturgicalApiBase = (): string =>
  process.env.LITCAL_API_BASE ?? "https://litcal.johnromanodorazio.com/api/dev/";

const extractEvents = (payload: unknown): LiturgicalEntry[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as Record<string, unknown>;
  const candidates = [root.litcal, root.LitCal, root.calendar, root.events];
  const found = candidates.find((value) => Array.isArray(value));
  return Array.isArray(found) ? (found as LiturgicalEntry[]) : [];
};

const isoDateOf = (entry: LiturgicalEntry): string | null => {
  const raw = entry.date;
  if (typeof raw === "string") {
    return raw.slice(0, 10);
  }
  if (typeof raw === "number") {
    const ms = raw > 1e12 ? raw : raw * 1000;
    const parsed = new Date(ms);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString().slice(0, 10);
  }
  return null;
};

const rankOf = (entry: LiturgicalEntry, fallback: string): string => {
  if (typeof entry.grade_lcl === "string" && entry.grade_lcl.length > 0) {
    return entry.grade_lcl;
  }
  if (typeof entry.grade === "string" && entry.grade.length > 0) {
    return entry.grade;
  }
  if (typeof entry.grade === "number") {
    return String(entry.grade);
  }
  return fallback;
};

export const getTodayLiturgicalContext = async (date = new Date()): Promise<LiturgicalDay> => {
  const isoDate = date.toISOString().slice(0, 10);
  const fallback = fallbackDay(isoDate);
  const base = getLiturgicalApiBase().replace(/\/+$/, "");
  const year = date.getUTCFullYear();
  const url = `${base}/calendar/${year}?locale=en`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return fallback;
    }

    const events = extractEvents(await response.json());
    const match = events.find((entry) => isoDateOf(entry) === isoDate);
    if (!match) {
      return fallback;
    }

    return {
      date: isoDate,
      celebration:
        typeof match.name === "string" && match.name.length > 0 ? match.name : fallback.celebration,
      rank: rankOf(match, fallback.rank),
    };
  } catch {
    return fallback;
  }
};
