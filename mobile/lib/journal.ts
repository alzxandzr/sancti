import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureSession, supabase } from "./supabase";

// Journal entries — one user reflection per (plan, day). When prompt_id is
// known we anchor it on the Supabase row so RLS can scope correctly; when
// it isn't (e.g. local-only fallback), we just key on plan+day in storage.
//
// Schema note: journal_entries.prompt_id is nullable, but RLS only checks
// auth.uid() = user_id, so setting prompt_id is optional.

export interface JournalEntry {
  id: string;
  body: string;
  created_at: string;
}

const localKey = (planId: string, dayIndex: number): string =>
  `sancti.journal.v1.${planId}.${dayIndex}`;

const readLocal = async (
  planId: string,
  dayIndex: number,
): Promise<JournalEntry | null> => {
  const raw = await AsyncStorage.getItem(localKey(planId, dayIndex));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JournalEntry;
  } catch {
    return null;
  }
};

const writeLocal = async (
  planId: string,
  dayIndex: number,
  entry: JournalEntry,
): Promise<void> => {
  await AsyncStorage.setItem(localKey(planId, dayIndex), JSON.stringify(entry));
};

export const loadEntryForDay = async (
  planId: string,
  dayIndex: number,
  promptId: string | null,
): Promise<JournalEntry | null> => {
  const userId = await ensureSession();
  if (!userId || !promptId) {
    return readLocal(planId, dayIndex);
  }
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, body, created_at")
    .eq("user_id", userId)
    .eq("prompt_id", promptId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.warn("journal load failed, falling back to local:", error.message);
    return readLocal(planId, dayIndex);
  }
  return ((data?.[0] as JournalEntry | undefined) ?? null) || readLocal(planId, dayIndex);
};

export const saveEntryForDay = async (
  planId: string,
  dayIndex: number,
  promptId: string | null,
  body: string,
): Promise<JournalEntry> => {
  const trimmed = body.trim();
  const userId = await ensureSession();
  const nowIso = new Date().toISOString();

  if (!userId || !promptId) {
    const entry: JournalEntry = {
      id: `local:${planId}:${dayIndex}`,
      body: trimmed,
      created_at: nowIso,
    };
    await writeLocal(planId, dayIndex, entry);
    return entry;
  }

  // Upsert-style: delete any existing entry on this prompt, insert fresh.
  // Simpler than tracking the row id round-tripping back to the client.
  await supabase
    .from("journal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("prompt_id", promptId);
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ user_id: userId, prompt_id: promptId, body: trimmed })
    .select("id, body, created_at")
    .single();
  if (error || !data) {
    console.warn("journal save failed, falling back to local:", error?.message);
    const entry: JournalEntry = {
      id: `local:${planId}:${dayIndex}`,
      body: trimmed,
      created_at: nowIso,
    };
    await writeLocal(planId, dayIndex, entry);
    return entry;
  }
  return data as JournalEntry;
};

export interface JournalEntryWithContext extends JournalEntry {
  plan_id: string | null;
  day_index: number | null;
  prompt_title: string | null;
}

export const listAllEntries = async (): Promise<JournalEntryWithContext[]> => {
  const userId = await ensureSession();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      "id, body, created_at, prompt_id, plan_prompts(plan_id, day_index, title)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("journal history load failed:", error.message);
    return [];
  }
  type Row = {
    id: string;
    body: string;
    created_at: string;
    plan_prompts:
      | { plan_id: string; day_index: number; title: string }
      | { plan_id: string; day_index: number; title: string }[]
      | null;
  };
  return (data ?? []).map((row): JournalEntryWithContext => {
    const r = row as unknown as Row;
    const ctx = Array.isArray(r.plan_prompts) ? r.plan_prompts[0] : r.plan_prompts;
    return {
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      plan_id: ctx?.plan_id ?? null,
      day_index: ctx?.day_index ?? null,
      prompt_title: ctx?.title ?? null,
    };
  });
};
