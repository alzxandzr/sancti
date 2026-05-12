import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Wikipedia REST API returns a 1-image summary for an article. We cache the
// thumbnail/original/extract per title so subsequent renders are free.
//
// CORS: Wikipedia's REST API ships `Access-Control-Allow-Origin: *`, so
// this works from the Expo web bundle too.

export interface WikipediaSummary {
  thumbnail: string | null;
  original: string | null;
  extract: string | null;
  fetched_at: string;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const cacheKey = (title: string): string => `sancti.wiki.v1.${title}`;

const readCache = async (title: string): Promise<WikipediaSummary | null> => {
  const raw = await AsyncStorage.getItem(cacheKey(title));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WikipediaSummary;
    const age = Date.now() - new Date(parsed.fetched_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = async (title: string, summary: WikipediaSummary): Promise<void> => {
  await AsyncStorage.setItem(cacheKey(title), JSON.stringify(summary)).catch(() => {});
};

const fetchSummary = async (title: string): Promise<WikipediaSummary> => {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Wikipedia ${title} ${res.status}`);
  }
  const data = (await res.json()) as {
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
    extract?: string;
  };
  return {
    thumbnail: data.thumbnail?.source ?? null,
    original: data.originalimage?.source ?? data.thumbnail?.source ?? null,
    extract: data.extract ?? null,
    fetched_at: new Date().toISOString(),
  };
};

/** One-shot fetch with cache. Returns null on any failure (offline, 404, etc.). */
export const getWikipediaSummary = async (
  title: string | null | undefined,
): Promise<WikipediaSummary | null> => {
  if (!title) return null;
  const cached = await readCache(title);
  if (cached) return cached;
  try {
    const summary = await fetchSummary(title);
    void writeCache(title, summary);
    return summary;
  } catch {
    return null;
  }
};

/** React hook variant. Returns `{ data, loading }` and updates when title changes. */
export const useWikipediaSummary = (
  title: string | null | undefined,
): { data: WikipediaSummary | null; loading: boolean } => {
  const [data, setData] = useState<WikipediaSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!title) {
      setData(null);
      return;
    }
    setLoading(true);
    void getWikipediaSummary(title).then((s) => {
      if (cancelled) return;
      setData(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [title]);

  return { data, loading };
};
