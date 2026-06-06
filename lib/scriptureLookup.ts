import AsyncStorage from "@react-native-async-storage/async-storage";

// Tiny scripture-text fetcher backed by the free, no-key bible-api.com
// service (World English Bible). Catholic deuterocanonical books are
// limited or missing there — when the lookup fails we surface a graceful
// "open in your Bible" fallback. Cached in AsyncStorage so the same
// citation doesn't hit the network twice on a single device.

export interface ScripturePassage {
  reference: string;
  text: string;
  translation: string;
  fetched_at: string;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const cacheKey = (book: string, chapter: number, verse: string): string =>
  `sancti.scripture.v1.${book.toLowerCase()}.${chapter}.${verse}`;

const readCache = async (
  book: string,
  chapter: number,
  verse: string,
): Promise<ScripturePassage | null> => {
  const raw = await AsyncStorage.getItem(cacheKey(book, chapter, verse));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ScripturePassage;
    const age = Date.now() - new Date(parsed.fetched_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = async (
  book: string,
  chapter: number,
  verse: string,
  passage: ScripturePassage,
): Promise<void> => {
  await AsyncStorage.setItem(cacheKey(book, chapter, verse), JSON.stringify(passage)).catch(
    () => {},
  );
};

export const fetchScripture = async (
  book: string,
  chapter: number,
  verse: string,
): Promise<ScripturePassage | null> => {
  const cached = await readCache(book, chapter, verse);
  if (cached) return cached;
  const query = `${book} ${chapter}:${verse}`;
  try {
    const res = await fetch(
      `https://bible-api.com/${encodeURIComponent(query)}?translation=web`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      reference?: string;
      text?: string;
      translation_name?: string;
    };
    if (!data.text) return null;
    const passage: ScripturePassage = {
      reference: data.reference ?? query,
      text: data.text.trim(),
      translation: data.translation_name ?? "World English Bible",
      fetched_at: new Date().toISOString(),
    };
    void writeCache(book, chapter, verse, passage);
    return passage;
  } catch {
    return null;
  }
};
