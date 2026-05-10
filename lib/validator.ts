import { z } from "zod";

export const routeLabelSchema = z.enum([
  "VOCATION_DISCERNMENT",
  "SUFFERING_HARDSHIP",
  "RELATIONSHIPS_FAMILY",
  "WORK_PURPOSE",
  "GENERAL_GUIDANCE",
  "SAFETY_REVIEW",
]);

export const classifierInputSchema = z.object({
  user_text: z.string().min(5).max(1500),
});

export const classifierResultSchema = z.object({
  primary_route: routeLabelSchema,
  secondary_route: routeLabelSchema.nullable(),
  confidence: z.number().min(0).max(1),
  themes: z.array(z.string().min(1)).max(8),
  needs_clarification: z.boolean(),
});

export const saintMatchSchema = z.object({
  name: z.string().min(1),
  reason: z.string().min(1),
  themes: z.array(z.string().min(1)).min(1),
  feast_day: z.string().min(1),
  prayer_reference: z.string().min(1),
});

export const matchSaintsInputSchema = z.object({
  route: routeLabelSchema,
  themes: z.array(z.string().min(1)).min(1),
});

export const matchSaintsResponseSchema = z.object({
  saints: z.array(saintMatchSchema).max(10),
});

export const devotionPromptSchema = z.object({
  type: z.enum(["reflection", "journal", "prayer", "action"]),
  title: z.string().min(1),
  text: z.string().min(1),
});

export const pastoralEscalationSchema = z.object({
  should_escalate: z.boolean(),
  suggestions: z.array(z.string().min(1)).max(5),
});

export const devotionPlanSchema = z.object({
  primary_route: routeLabelSchema,
  situation_summary: z.string().min(1),
  saint_matches: z.array(saintMatchSchema).length(3),
  devotion_prompts: z.array(devotionPromptSchema).min(3).max(4),
  safety_note: z.string().nullable(),
  content_label: z.literal("devotional_reflection"),
  teaching_authority_note: z.string().min(1),
  pastoral_escalation: pastoralEscalationSchema,
  sources_used: z.array(z.string().min(1)).min(1),
});

export const generatePlanInputSchema = z.object({
  route: routeLabelSchema,
  user_text: z.string().min(5).max(1500),
  saints: z.array(saintMatchSchema).min(1),
});

export const stateInLifeSchema = z.enum([
  "single",
  "dating_engaged",
  "married",
  "parent",
  "religious",
  "clergy",
  "student",
  "other",
]);

export const preferredToneSchema = z.enum(["gentle", "direct", "encouraging", "contemplative"]);

export const prayerDurationSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
  z.literal(30),
]);

export const userPreferencesSchema = z.object({
  state_in_life: stateInLifeSchema,
  preferred_tone: preferredToneSchema,
  prayer_duration_minutes: prayerDurationSchema,
});

export const savedSaintSchema = z.object({
  saint_id: z.string().min(1),
  saved_at: z.string().datetime(),
});

export const savedPlanSchema = z.object({
  plan_id: z.string().min(1),
  primary_route: routeLabelSchema,
  day_count: z.number().int().min(3).max(7),
  completed_days: z.number().int().min(0),
  saved_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
}).refine((value) => value.completed_days <= value.day_count, {
  message: "completed_days cannot exceed day_count",
  path: ["completed_days"],
});

export const progressSummarySchema = z.object({
  total_saved_saints: z.number().int().min(0),
  total_saved_plans: z.number().int().min(0),
  completed_plans: z.number().int().min(0),
  completed_plan_days: z.number().int().min(0),
});

export const userProfileSchema = z.object({
  user_id: z.string().min(1),
  preferences: userPreferencesSchema,
  saved_saints: z.array(savedSaintSchema),
  saved_plans: z.array(savedPlanSchema),
  progress: progressSummarySchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const profileActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get_profile"),
    user_id: z.string().min(1),
  }),
  z.object({
    action: z.literal("upsert_profile"),
    user_id: z.string().min(1),
    preferences: userPreferencesSchema,
  }),
  z.object({
    action: z.literal("save_saint"),
    user_id: z.string().min(1),
    saint_id: z.string().min(1),
  }),
  z.object({
    action: z.literal("save_plan"),
    user_id: z.string().min(1),
    plan_id: z.string().min(1),
    primary_route: routeLabelSchema,
    day_count: z.number().int().min(3).max(7),
  }),
  z.object({
    action: z.literal("mark_plan_day_complete"),
    user_id: z.string().min(1),
    plan_id: z.string().min(1),
  }),
]);

// Output-side banlist. Run on serialized model output before returning to clients.
// Phrasing is lowercase and substring-matched, so include the most common
// surface forms an LLM might emit. Update with every safety incident.
const bannedRoleplayTerms = [
  // Sacrament simulation
  "i absolve you",
  "i forgive your sins",
  "ego te absolvo",
  "this confession is valid",
  "your sins are forgiven",
  // Priest / spiritual director impersonation
  "as your priest",
  "as your confessor",
  "as your spiritual director",
  "i, your priest",
  "speaking as a priest",
  // Divine / Marian impersonation
  "i am jesus",
  "i am christ",
  "i am the lord",
  "i am god",
  "i am mary",
  "i am the blessed virgin",
  "i am saint",
  "i am the holy spirit",
  // Coercive / manipulative religious instructions
  "you must repeat after me to be saved",
  "you will go to hell unless",
  "the only way to be saved is to",
];

export const assertGuardrails = (text: string): void => {
  const lower = text.toLowerCase();
  for (const term of bannedRoleplayTerms) {
    if (lower.includes(term)) {
      throw new Error(
        `Guardrail violation: impersonation or sacramental simulation detected (matched: "${term}").`,
      );
    }
  }
};

// --- Phase 2 schemas: citations + day-aware plan + safety pre-screen ------

export const citationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catechism"),
    // Catechism of the Catholic Church paragraph numbers run from §1 to §2865.
    paragraph: z.number().int().min(1).max(2865),
    label: z.string().min(3).max(160),
  }),
  z.object({
    kind: z.literal("scripture"),
    book: z.string().min(2).max(60),
    chapter: z.number().int().min(1).max(150),
    verse: z.string().min(1).max(20),
    label: z.string().min(3).max(160),
  }),
  z.object({
    kind: z.literal("saint_writing"),
    saint_id: z.string().min(1).max(60),
    title: z.string().min(2).max(120),
    label: z.string().min(3).max(160),
  }),
  z.object({
    kind: z.literal("liturgy"),
    source: z.enum(["liturgy_of_the_hours", "roman_missal"]),
    label: z.string().min(3).max(160),
  }),
]);

export const devotionPromptV2Schema = z.object({
  type: z.enum(["reflection", "prayer", "journal", "practice"]),
  title: z.string().min(3).max(80),
  body: z.string().min(40).max(1200),
  estimated_minutes: z.number().int().min(2).max(60),
  citations: z.array(citationSchema).min(1).max(4),
});

export const planDaySchema = z.object({
  day_index: z.number().int().min(0).max(6),
  theme: z.string().min(3).max(80),
  liturgical_note: z.string().min(0).max(280).nullable(),
  prompts: z.array(devotionPromptV2Schema).min(2).max(4),
});

export const devotionPlanV2Schema = z
  .object({
    primary_route: routeLabelSchema,
    situation_summary: z.string().min(1).max(400),
    saint_matches: z.array(saintMatchSchema).min(1).max(3),
    total_days: z.number().int().min(5).max(7),
    days: z.array(planDaySchema).min(5).max(7),
    safety_note: z.string().nullable(),
    content_label: z.literal("devotional_reflection"),
    teaching_authority_note: z.string().min(1),
    pastoral_escalation: pastoralEscalationSchema,
    sources_used: z.array(z.string().min(1)).min(1),
  })
  .refine((plan) => plan.days.length === plan.total_days, {
    message: "days.length must equal total_days",
    path: ["days"],
  })
  .refine(
    (plan) => plan.days.every((day, idx) => day.day_index === idx),
    { message: "day_index values must be 0-indexed and contiguous", path: ["days"] },
  );

export const safetySeveritySchema = z.enum(["none", "concern", "crisis"]);

export const safetyPrescreenSchema = z.object({
  severity: safetySeveritySchema,
  categories: z.array(z.string().min(1)).max(8),
  reason: z.string().min(0).max(400),
});

// --- Input sanitization (prompt-injection defense) -----------------------
// Strip control characters and tokens that look like role-control delimiters.
// Result is wrapped by callers in <user_text>...</user_text> in the prompt
// and the system prompt instructs the model to treat that block as untrusted
// data, never as instructions.
const PROMPT_INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  // Role-control tags an LLM might honour.
  new RegExp("</?\\s*(system|assistant|user|tool|tool_use|tool_result|human)\\s*>", "gi"),
  // Llama-style instruction delimiters.
  new RegExp("\\[/?(?:INST|SYS|SYSTEM|ASSISTANT|USER)\\]", "gi"),
  // OpenAI-style chat-ML role tokens.
  new RegExp("<\\|[a-z_]{1,40}\\|>", "gi"),
  // ASCII control chars except \\n (0x0a), \\r (0x0d), \\t (0x09).
  new RegExp("[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f]", "g"),
];

export const sanitizeUserText = (raw: string): string => {
  let cleaned = raw.normalize("NFKC");
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  // Collapse repeated whitespace, trim.
  return cleaned.replace(/[\r\n\t]+/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
};
