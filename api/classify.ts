import { callJSON, getModels } from "../lib/anthropic";
import { logger } from "../lib/logger";
import {
  heuristicSafetyScan,
  recordSafetyEvent,
} from "../lib/safety";
import {
  classifierInputSchema,
  classifierResultSchema,
  safetyPrescreenSchema,
} from "../lib/validator";
import { baseSystemPrompt } from "../prompts/base";
import { classifierPrompt } from "../prompts/classifier";
import { safetyPrescreenPrompt } from "../prompts/safety";
import type { ClassifierResult, RouteLabel, SafetyPrescreen } from "../types";

// ─── Keyword fallback (kept as a graceful degradation path when the LLM
//      call fails after retries; also used as the deterministic first pass
//      inside tests that don't mock the SDK) ────────────────────────────

const routeKeywords: Record<RouteLabel, string[]> = {
  VOCATION_DISCERNMENT: ["discern", "calling", "vocation", "purpose", "decision"],
  SUFFERING_HARDSHIP: ["grief", "anxiety", "depressed", "sick", "suffering", "pain", "loss", "lost"],
  RELATIONSHIPS_FAMILY: ["marriage", "spouse", "family", "parent", "friend", "forgive"],
  WORK_PURPOSE: ["work", "career", "job", "burnout", "boss", "study"],
  GENERAL_GUIDANCE: ["pray", "faith", "guidance"],
  SAFETY_REVIEW: ["self-harm", "suicide", "hurt myself", "abuse", "danger"],
};

const scoreRoute = (text: string, route: RouteLabel): number =>
  routeKeywords[route].reduce(
    (score, keyword) => (text.includes(keyword) ? score + 1 : score),
    0,
  );

const fallbackKeywordClassify = (user_text: string): ClassifierResult => {
  const lower = user_text.toLowerCase();
  const sortedRoutes = (Object.keys(routeKeywords) as RouteLabel[])
    .map((route) => ({ route, score: scoreRoute(lower, route) }))
    .sort((a, b) => b.score - a.score);

  const primary = sortedRoutes[0];
  const secondary = sortedRoutes[1];
  const confidence = Math.min(0.98, primary.score === 0 ? 0.35 : 0.55 + primary.score * 0.1);

  const themes = lower
    .split(/[^a-z]+/)
    .filter((word) => word.length > 4)
    .slice(0, 6);

  return classifierResultSchema.parse({
    primary_route: primary.route,
    secondary_route: secondary.score > 0 ? secondary.route : null,
    confidence,
    themes: themes.length ? themes : ["prayer", "discernment"],
    needs_clarification: confidence < 0.5,
  });
};

// ─── Public API ──────────────────────────────────────────────────────────

export interface ClassifyContext {
  /** Optional Supabase user id; passed through to safety logs only. */
  user_id?: string | null;
  /** Set true in tests to skip the LLM and use the keyword classifier. */
  skipLLM?: boolean;
}

export interface ClassifyOutcome {
  classification: ClassifierResult;
  safety: SafetyPrescreen;
  /** True when the heuristic short-circuited and we never called the LLM. */
  short_circuited: boolean;
  /** True when LLM failed and we fell back to keyword classifier. */
  used_fallback: boolean;
}

const SAFETY_REVIEW_RESULT = (themes: string[]): ClassifierResult =>
  classifierResultSchema.parse({
    primary_route: "SAFETY_REVIEW" as const,
    secondary_route: null,
    confidence: 1,
    themes: themes.slice(0, 6),
    needs_clarification: false,
  });

export const classifyInput = async (
  user_text: string,
  ctx: ClassifyContext = {},
): Promise<ClassifyOutcome> => {
  const parsed = classifierInputSchema.parse({ user_text });

  // 1) Heuristic safety floor — never reaches the LLM if a known phrase hits.
  const heuristic = heuristicSafetyScan(parsed.user_text);
  if (heuristic.severity === "crisis") {
    recordSafetyEvent({
      user_id: ctx.user_id ?? null,
      trigger: "input_prescreen",
      severity: "crisis",
      route_at_trigger: "SAFETY_REVIEW",
      detail: { source: "heuristic", reason: heuristic.reason, categories: heuristic.categories },
    });
    return {
      classification: SAFETY_REVIEW_RESULT(["safety", "crisis"]),
      safety: heuristic,
      short_circuited: true,
      used_fallback: false,
    };
  }

  if (ctx.skipLLM) {
    return {
      classification: fallbackKeywordClassify(parsed.user_text),
      safety: heuristic,
      short_circuited: false,
      used_fallback: true,
    };
  }

  // 2) LLM safety pre-screen (Haiku) — runs even if heuristic was "none".
  // The LLM can still escalate to "crisis" so we widen the type here.
  let safety: SafetyPrescreen = {
    severity: heuristic.severity,
    categories: heuristic.categories,
    reason: heuristic.reason,
  };
  try {
    const safetyCall = await callJSON<SafetyPrescreen>({
      model: getModels().safety,
      systemBlocks: [baseSystemPrompt, safetyPrescreenPrompt],
      user: parsed.user_text,
      schema: safetyPrescreenSchema,
      retries: 1,
      purpose: "safety",
      userId: ctx.user_id ?? null,
    });
    // Take the higher of heuristic vs LLM severity.
    const rank = (s: SafetyPrescreen["severity"]): number =>
      s === "crisis" ? 2 : s === "concern" ? 1 : 0;
    safety = rank(safetyCall.data.severity) > rank(safety.severity) ? safetyCall.data : safety;
  } catch (err) {
    logger.warn("safety_prescreen_failed_using_heuristic", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Keep `safety = heuristic`. Never block on a pre-screen outage.
  }

  if (safety.severity === "crisis") {
    recordSafetyEvent({
      user_id: ctx.user_id ?? null,
      trigger: "input_prescreen",
      severity: "crisis",
      route_at_trigger: "SAFETY_REVIEW",
      detail: { source: "llm", categories: safety.categories, reason: safety.reason },
    });
    return {
      classification: SAFETY_REVIEW_RESULT(safety.categories.length ? safety.categories : ["safety"]),
      safety,
      short_circuited: true,
      used_fallback: false,
    };
  }

  // 3) Real classifier (Haiku) — fall back to keyword on any failure.
  try {
    const result = await callJSON<ClassifierResult>({
      model: getModels().classify,
      systemBlocks: [baseSystemPrompt, classifierPrompt],
      user: parsed.user_text,
      schema: classifierResultSchema,
      retries: 2,
      purpose: "classify",
      userId: ctx.user_id ?? null,
    });
    return {
      classification: result.data,
      safety,
      short_circuited: false,
      used_fallback: false,
    };
  } catch (err) {
    logger.warn("classifier_llm_failed_using_keyword_fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      classification: fallbackKeywordClassify(parsed.user_text),
      safety,
      short_circuited: false,
      used_fallback: true,
    };
  }
};

// HTTP handler: existing Next-style shape kept until App Router migration.
export default async function handler(
  req: { body: { user_text: string; user_id?: string | null } },
  res: { status: (code: number) => { json: (payload: ClassifyOutcome | { error: string }) => void } },
): Promise<void> {
  try {
    const result = await classifyInput(req.body.user_text, { user_id: req.body.user_id ?? null });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "classification failed" });
  }
}
