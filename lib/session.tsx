import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  apiClassify,
  apiGeneratePlan,
  apiMatchSaints,
  type ClassifierResult,
  type DevotionPlanV2,
  type RouteLabel,
  type SafetyPrescreen,
  type SaintMatch,
} from "./api";
import { loadPreferences } from "./profile";

// In-session state for the intake → results → plan flow. Lives in memory
// only — survives navigation within a single app session but resets on
// reload. Persistence of the active plan lives in activePlan.ts.

export type Stage =
  | "idle"
  | "classifying"
  | "matching"
  | "ready_for_plan"
  | "planning"
  | "plan_ready"
  | "error";

interface SessionState {
  userText: string;
  classification: ClassifierResult | null;
  safety: SafetyPrescreen | null;
  shortCircuited: boolean;
  saints: SaintMatch[] | null;
  /** Saints we've already shown the user in this session — passed to
   *  `match-saints` as exclude_ids when they ask for fresh picks. */
  shownSaintIds: string[];
  plan: DevotionPlanV2 | null;
  stage: Stage;
  error: string | null;
}

interface SessionActions {
  /** Step 1+2: classify the user's situation and fetch matching saints. */
  classifyAndMatch: (text: string) => Promise<void>;
  /** Step 3: generate the multi-day plan. Optionally restrict to a subset. */
  generatePlan: (overrideSaints?: SaintMatch[]) => Promise<void>;
  /** Re-run /match-saints excluding everyone we've already shown. */
  showMoreSaints: () => Promise<void>;
  /** Seed in-session state from a hand-picked saint + route, so the user can
   *  start a plan from the saint browse without going through intake. */
  seedFromSaint: (saint: SaintMatch, route: RouteLabel, themes: string[]) => void;
  /** Wipe all in-session state (not the persisted active plan). */
  reset: () => void;
}

const initialState: SessionState = {
  userText: "",
  classification: null,
  safety: null,
  shortCircuited: false,
  saints: null,
  shownSaintIds: [],
  plan: null,
  stage: "idle",
  error: null,
};

const SessionContext = createContext<(SessionState & SessionActions) | null>(null);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<SessionState>(initialState);
  // Mirror state in a ref so action callbacks can read the latest values
  // without rebinding on every render.
  const stateRef = useRef(state);
  stateRef.current = state;

  const classifyAndMatch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setState((s) => ({ ...s, error: "Please describe your situation first." }));
      return;
    }
    setState({
      ...initialState,
      userText: trimmed,
      stage: "classifying",
    });
    try {
      const classifyRes = await apiClassify(trimmed);
      setState((s) => ({
        ...s,
        classification: classifyRes.classification,
        safety: classifyRes.safety,
        shortCircuited: classifyRes.short_circuited,
        stage: "matching",
      }));

      const matchRes = await apiMatchSaints(
        classifyRes.classification.primary_route,
        classifyRes.classification.themes,
      );
      const ids = matchRes.saints.map((m) => m.id).filter((x): x is string => Boolean(x));
      setState((s) => ({
        ...s,
        saints: matchRes.saints,
        shownSaintIds: ids,
        stage: "ready_for_plan",
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        stage: "error",
        error: err instanceof Error ? err.message : "Something went wrong.",
      }));
    }
  }, []);

  const generatePlan = useCallback(async (overrideSaints?: SaintMatch[]) => {
    const cur = stateRef.current;
    const saintsForPlan = overrideSaints && overrideSaints.length > 0 ? overrideSaints : cur.saints;
    if (!cur.classification || !saintsForPlan || saintsForPlan.length === 0) {
      setState((s) => ({
        ...s,
        stage: "error",
        error: "Cannot generate a plan without a classification and saints.",
      }));
      return;
    }
    setState((s) => ({ ...s, stage: "planning", error: null }));
    try {
      const preferences = await loadPreferences().catch(() => null);
      const plan = await apiGeneratePlan({
        route: cur.classification.primary_route,
        user_text: cur.userText,
        saints: saintsForPlan,
        ...(preferences
          ? {
              preferences: {
                state_in_life: preferences.state_in_life,
                preferred_tone: preferences.preferred_tone,
                prayer_duration_minutes: preferences.prayer_duration_minutes,
              },
            }
          : {}),
      });
      setState((s) => ({ ...s, plan, stage: "plan_ready" }));
    } catch (err) {
      setState((s) => ({
        ...s,
        stage: "error",
        error: err instanceof Error ? err.message : "Plan generation failed.",
      }));
    }
  }, []);

  const showMoreSaints = useCallback(async () => {
    const cur = stateRef.current;
    if (!cur.classification) return;
    setState((s) => ({ ...s, stage: "matching", error: null }));
    try {
      const matchRes = await apiMatchSaints(
        cur.classification.primary_route,
        cur.classification.themes,
        cur.shownSaintIds,
      );
      if (matchRes.saints.length === 0) {
        setState((s) => ({ ...s, stage: "ready_for_plan", error: "No more saints to surface for this route." }));
        return;
      }
      const newIds = matchRes.saints.map((m) => m.id).filter((x): x is string => Boolean(x));
      setState((s) => ({
        ...s,
        saints: matchRes.saints,
        shownSaintIds: [...s.shownSaintIds, ...newIds],
        stage: "ready_for_plan",
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        stage: "error",
        error: err instanceof Error ? err.message : "Could not load more saints.",
      }));
    }
  }, []);

  const seedFromSaint = useCallback(
    (saint: SaintMatch, route: RouteLabel, themes: string[]) => {
      const classification: ClassifierResult = {
        primary_route: route,
        secondary_route: null,
        confidence: 1,
        themes,
        needs_clarification: false,
      };
      setState({
        ...initialState,
        userText: `Walking with ${saint.name}.`,
        classification,
        safety: { severity: "none", categories: [], reason: "saint_direct_start" },
        saints: [saint],
        shownSaintIds: saint.id ? [saint.id] : [],
        stage: "ready_for_plan",
      });
    },
    [],
  );

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo(
    () => ({ ...state, classifyAndMatch, generatePlan, showMoreSaints, seedFromSaint, reset }),
    [state, classifyAndMatch, generatePlan, showMoreSaints, seedFromSaint, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
};
