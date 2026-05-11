import { ensureWebSession, getBrowserSupabase } from "./supabase";

// Browser-side mirror of mobile/lib/activePlan.ts. Persists the active plan
// to Supabase when an auth session is available; falls back to localStorage
// so a single tab session still works if anonymous sign-in is disabled.
//
// Mirrors the SAME table layout the mobile app writes (saved_plans +
// plan_days + plan_prompts), so a user signing in on both surfaces sees the
// same plan.

import type {
  Citation,
  DevotionPlanV2,
  DevotionPromptV2,
  PlanDay,
  RouteLabel,
  SaintMatch,
} from "../../types";

type DevotionPromptType = DevotionPromptV2["type"];

export interface ActivePlan {
  plan_id: string;
  plan: DevotionPlanV2;
  current_day_index: number;
  completed_days: number[];
  saved_at: string;
}

const LOCAL_KEY = "sancti.activePlan.v1";
const LOCAL_ID = "local";

const hasLocalStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/* ─── Local fallback (localStorage) ───────────────────────────────────── */

const saveLocal = (plan: DevotionPlanV2): ActivePlan => {
  const record: ActivePlan = {
    plan_id: LOCAL_ID,
    plan,
    current_day_index: 0,
    completed_days: [],
    saved_at: new Date().toISOString(),
  };
  if (hasLocalStorage()) {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
  }
  return record;
};

const loadLocal = (): ActivePlan | null => {
  if (!hasLocalStorage()) return null;
  const raw = window.localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActivePlan;
  } catch {
    window.localStorage.removeItem(LOCAL_KEY);
    return null;
  }
};

const markLocalDayDone = (): ActivePlan | null => {
  const cur = loadLocal();
  if (!cur) return null;
  const idx = cur.current_day_index;
  if (cur.completed_days.includes(idx)) return cur;
  const next: ActivePlan = {
    ...cur,
    completed_days: [...cur.completed_days, idx],
    current_day_index: Math.min(idx + 1, cur.plan.total_days - 1),
  };
  if (hasLocalStorage()) {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  }
  return next;
};

/* ─── Supabase row helpers ────────────────────────────────────────────── */

const promptTypeOk: ReadonlySet<DevotionPromptType> = new Set([
  "reflection",
  "prayer",
  "journal",
  "practice",
]);

interface PlanDayRow {
  day_index: number;
  theme: string;
  liturgical_note: string | null;
  completed_at: string | null;
}
interface PlanPromptRow {
  id: string;
  day_index: number;
  ordinal: number;
  type: string;
  title: string;
  body: string;
  citations: Citation[];
  estimated_minutes: number | null;
}
interface SavedPlanRow {
  id: string;
  route: RouteLabel;
  saint_ids: string[];
  total_days: number;
  current_day_index: number;
  teaching_authority_note: string | null;
  pastoral_escalation: { should_escalate: boolean; suggestions: string[] } | null;
  situation_summary: string | null;
  safety_note: string | null;
  saint_matches: SaintMatch[] | null;
  created_at: string;
  completed_at: string | null;
}

const buildPlanFromRows = (
  row: SavedPlanRow,
  days: PlanDayRow[],
  prompts: PlanPromptRow[],
): DevotionPlanV2 => {
  const promptsByDay = new Map<number, DevotionPromptV2[]>();
  const orderedPrompts = [...prompts].sort(
    (a, b) => a.day_index - b.day_index || a.ordinal - b.ordinal,
  );
  for (const p of orderedPrompts) {
    const list = promptsByDay.get(p.day_index) ?? [];
    list.push({
      type: (promptTypeOk.has(p.type as DevotionPromptType)
        ? p.type
        : "reflection") as DevotionPromptType,
      title: p.title,
      body: p.body,
      estimated_minutes: p.estimated_minutes ?? 5,
      citations: Array.isArray(p.citations) ? p.citations : [],
    });
    promptsByDay.set(p.day_index, list);
  }

  const planDays: PlanDay[] = [...days]
    .sort((a, b) => a.day_index - b.day_index)
    .map((d) => ({
      day_index: d.day_index,
      theme: d.theme,
      liturgical_note: d.liturgical_note,
      prompts: promptsByDay.get(d.day_index) ?? [],
    }));

  return {
    primary_route: row.route,
    situation_summary: row.situation_summary ?? "",
    saint_matches: row.saint_matches ?? [],
    total_days: row.total_days,
    days: planDays,
    safety_note: row.safety_note,
    content_label: "devotional_reflection",
    teaching_authority_note: row.teaching_authority_note ?? "",
    pastoral_escalation:
      row.pastoral_escalation ?? { should_escalate: false, suggestions: [] },
    sources_used: [],
  };
};

/* ─── Public API ──────────────────────────────────────────────────────── */

export const saveActivePlan = async (plan: DevotionPlanV2): Promise<ActivePlan> => {
  const userId = await ensureWebSession();
  if (!userId) return saveLocal(plan);

  const supabase = getBrowserSupabase();
  const { data: inserted, error: insertErr } = await supabase
    .from("saved_plans")
    .insert({
      user_id: userId,
      route: plan.primary_route,
      classification: { route: plan.primary_route },
      saint_ids: plan.saint_matches.map((m) => m.id).filter(Boolean) as string[],
      total_days: plan.total_days,
      current_day_index: 0,
      teaching_authority_note: plan.teaching_authority_note,
      pastoral_escalation: plan.pastoral_escalation,
      situation_summary: plan.situation_summary,
      safety_note: plan.safety_note,
      saint_matches: plan.saint_matches,
      content_label: plan.content_label,
    })
    .select("id, created_at")
    .single();
  if (insertErr || !inserted) {
    console.warn("Supabase plan insert failed, falling back to local:", insertErr?.message);
    return saveLocal(plan);
  }
  const planId = inserted.id as string;

  const dayRows = plan.days.map((d) => ({
    plan_id: planId,
    day_index: d.day_index,
    theme: d.theme,
    liturgical_note: d.liturgical_note,
  }));
  if (dayRows.length > 0) {
    const { error } = await supabase.from("plan_days").insert(dayRows);
    if (error) console.warn("plan_days insert failed:", error.message);
  }

  const promptRows = plan.days.flatMap((d) =>
    d.prompts.map((p, ordinal) => ({
      plan_id: planId,
      day_index: d.day_index,
      ordinal,
      type: p.type,
      title: p.title,
      body: p.body,
      citations: p.citations,
      estimated_minutes: p.estimated_minutes,
    })),
  );
  if (promptRows.length > 0) {
    const { error } = await supabase.from("plan_prompts").insert(promptRows);
    if (error) console.warn("plan_prompts insert failed:", error.message);
  }

  return {
    plan_id: planId,
    plan,
    current_day_index: 0,
    completed_days: [],
    saved_at: inserted.created_at as string,
  };
};

export const loadActivePlan = async (): Promise<ActivePlan | null> => {
  const userId = await ensureWebSession();
  if (!userId) return loadLocal();

  const supabase = getBrowserSupabase();
  const { data: rows, error } = await supabase
    .from("saved_plans")
    .select(
      "id, route, saint_ids, total_days, current_day_index, " +
        "teaching_authority_note, pastoral_escalation, situation_summary, " +
        "safety_note, saint_matches, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.warn("Supabase plan load failed, falling back to local:", error.message);
    return loadLocal();
  }
  if (!rows || rows.length === 0) return null;
  const row = rows[0] as unknown as SavedPlanRow;

  const [{ data: days, error: daysErr }, { data: prompts, error: promptsErr }] =
    await Promise.all([
      supabase
        .from("plan_days")
        .select("day_index, theme, liturgical_note, completed_at")
        .eq("plan_id", row.id),
      supabase
        .from("plan_prompts")
        .select("id, day_index, ordinal, type, title, body, citations, estimated_minutes")
        .eq("plan_id", row.id)
        .order("day_index", { ascending: true })
        .order("ordinal", { ascending: true }),
    ]);
  if (daysErr || promptsErr) {
    console.warn("Plan day/prompt load failed:", daysErr?.message ?? promptsErr?.message);
  }

  const dayRows = (days ?? []) as PlanDayRow[];
  const promptRows = (prompts ?? []) as PlanPromptRow[];
  const plan = buildPlanFromRows(row, dayRows, promptRows);

  const completed_days = dayRows
    .filter((d) => d.completed_at !== null)
    .map((d) => d.day_index)
    .sort((a, b) => a - b);

  return {
    plan_id: row.id,
    plan,
    current_day_index: row.current_day_index,
    completed_days,
    saved_at: row.created_at,
  };
};

export const markCurrentDayDone = async (): Promise<ActivePlan | null> => {
  const userId = await ensureWebSession();
  if (!userId) return markLocalDayDone();

  const cur = await loadActivePlan();
  if (!cur || cur.plan_id === LOCAL_ID) return markLocalDayDone();
  const idx = cur.current_day_index;
  if (cur.completed_days.includes(idx)) return cur;

  const supabase = getBrowserSupabase();
  const nowIso = new Date().toISOString();
  const { error: dayErr } = await supabase
    .from("plan_days")
    .update({ completed_at: nowIso })
    .eq("plan_id", cur.plan_id)
    .eq("day_index", idx);
  if (dayErr) {
    console.warn("plan_days update failed:", dayErr.message);
    return cur;
  }

  const nextIdx = Math.min(idx + 1, cur.plan.total_days - 1);
  const isLast = idx === cur.plan.total_days - 1;
  const { error: planErr } = await supabase
    .from("saved_plans")
    .update({
      current_day_index: nextIdx,
      completed_at: isLast ? nowIso : null,
    })
    .eq("id", cur.plan_id);
  if (planErr) console.warn("saved_plans update failed:", planErr.message);

  return loadActivePlan();
};
