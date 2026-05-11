import { ensureSession, supabase } from "./supabase";
import { listSavedSaints } from "./savedSaints";
import { loadActivePlan, listPlanHistory } from "./activePlan";

export interface ActivityStats {
  saved_saints: number;
  plans_started: number;
  plans_completed: number;
  reflections_written: number;
}

const ZERO: ActivityStats = {
  saved_saints: 0,
  plans_started: 0,
  plans_completed: 0,
  reflections_written: 0,
};

export const loadActivityStats = async (): Promise<ActivityStats> => {
  const userId = await ensureSession();

  // Saved saints and plans share their public helpers so the count source
  // matches what the user sees on the browse + history screens.
  const [savedIds, plans] = await Promise.all([listSavedSaints(), listPlanHistory()]);

  // Journal entries: Supabase head-count when authenticated, otherwise we
  // can't enumerate AsyncStorage keys efficiently — just leave at 0.
  let reflections = 0;
  if (userId) {
    const { count } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    reflections = count ?? 0;
  } else {
    // Fallback: at least surface whether the current device's active plan
    // has a day-level reflection saved, so the number isn't always zero.
    const active = await loadActivePlan();
    reflections = active ? 1 : 0;
  }

  return {
    ...ZERO,
    saved_saints: savedIds.length,
    plans_started: plans.length,
    plans_completed: plans.filter((p) => !!p.completed_at).length,
    reflections_written: reflections,
  };
};
