import { z } from "zod";
import crisisResources from "../data/crisis_resources.json";
import { logger } from "./logger";
import { sanitizeUserText } from "./validator";
import type { CrisisResource, RouteLabel, SafetyEvent, SafetyPrescreen } from "../types";

// --- Heuristic crisis triggers --------------------------------------------
// These run on the *raw* user input as a deterministic floor under the LLM
// pre-screen. If anything matches, we treat it as `severity = 'crisis'` even
// before the LLM responds, so we never wait on the network for a known signal.

const CRISIS_PHRASES: ReadonlyArray<string> = [
  "i want to die",
  "i don't want to be alive",
  "i dont want to be alive",
  "i want to kill myself",
  "kill myself",
  "end my life",
  "ending my life",
  "i'm going to hurt myself",
  "im going to hurt myself",
  "hurt myself",
  "self harm",
  "self-harm",
  "cutting myself",
  "overdose",
  "no reason to live",
  "better off dead",
  "i want to disappear forever",
  "suicidal",
  "suicide plan",
];

const CONCERN_PHRASES: ReadonlyArray<string> = [
  "abuse",
  "abused",
  "abusive",
  "domestic violence",
  "he hits me",
  "she hits me",
  "they hit me",
  "i'm being threatened",
  "im being threatened",
];

export const heuristicSafetyScan = (rawText: string): SafetyPrescreen => {
  const lower = rawText.toLowerCase();
  const crisisHits = CRISIS_PHRASES.filter((p) => lower.includes(p));
  if (crisisHits.length > 0) {
    return {
      severity: "crisis",
      categories: ["self_harm_or_suicide"],
      reason: `heuristic match: ${crisisHits[0]}`,
    };
  }
  const concernHits = CONCERN_PHRASES.filter((p) => lower.includes(p));
  if (concernHits.length > 0) {
    return {
      severity: "concern",
      categories: ["safety_concern"],
      reason: `heuristic match: ${concernHits[0]}`,
    };
  }
  return { severity: "none", categories: [], reason: "no heuristic match" };
};

// --- Crisis resources -----------------------------------------------------

const resources = crisisResources as CrisisResource[];

export const crisisResourcesForLocale = (
  locale: string | null | undefined,
): CrisisResource[] => {
  // Locale formats accepted: "en-US", "en_US", "en", "US"
  const norm = (locale ?? "").toLowerCase();
  const region = norm.split(/[-_]/).slice(-1)[0]?.toUpperCase();
  if (region) {
    const matched = resources.filter((r) => r.region === region);
    if (matched.length > 0) return matched;
  }
  // Fallback: international + US.
  return resources.filter((r) => r.region === "US" || r.region === "INT");
};

// --- Safety event logging --------------------------------------------------
// Phase 1 will persist these to Supabase; for now, structured-log so they're
// captured by any log shipper and can be backfilled when the table exists.

export const safetyEventInputSchema = z.object({
  user_id: z.string().nullable(),
  trigger: z.enum([
    "input_prescreen",
    "classifier_route",
    "output_banlist",
    "citation_rejected",
    "prompt_injection",
  ]),
  severity: z.enum(["none", "concern", "crisis", "info", "warn", "critical"]),
  route_at_trigger: z
    .enum([
      "VOCATION_DISCERNMENT",
      "SUFFERING_HARDSHIP",
      "RELATIONSHIPS_FAMILY",
      "WORK_PURPOSE",
      "GENERAL_GUIDANCE",
      "SAFETY_REVIEW",
    ])
    .nullable(),
  detail: z.record(z.unknown()),
});

export const recordSafetyEvent = (
  input: z.infer<typeof safetyEventInputSchema>,
): SafetyEvent => {
  const parsed = safetyEventInputSchema.parse(input);
  const event: SafetyEvent = {
    id: cryptoRandomId(),
    user_id: parsed.user_id,
    trigger: parsed.trigger,
    severity: parsed.severity,
    route_at_trigger: parsed.route_at_trigger as RouteLabel | null,
    detail: parsed.detail,
    created_at: new Date().toISOString(),
  };
  logger.warn("safety_event", {
    safety_event_id: event.id,
    trigger: event.trigger,
    severity: event.severity,
    route_at_trigger: event.route_at_trigger,
    detail: event.detail,
  });
  return event;
};

// Random id without depending on Buffer or crypto type defs.
const cryptoRandomId = (): string => {
  const bytes = new Uint8Array(12);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
};

// --- Re-export sanitizer so call sites have one import for safety helpers ---
export { sanitizeUserText };
