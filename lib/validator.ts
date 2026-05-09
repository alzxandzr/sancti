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

export const customPlanSetupSchema = z.object({
  title: z.string().min(3).max(80),
  saint_id: z.string().min(1),
  route: routeLabelSchema,
  themes: z.array(z.string().min(1)).min(1).max(5),
  duration_days: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  preferred_tone: preferredToneSchema,
  prayer_duration_minutes: prayerDurationSchema,
});

export const customPlanDaySchema = z.object({
  day_number: z.number().int().min(1).max(7),
  prompt_type: z.enum(["reflection", "journal", "prayer", "action"]),
  title: z.string().min(1).max(100),
  text: z.string().min(10).max(1000),
  edited_by_user: z.boolean(),
});

export const customPlanDraftSchema = z.object({
  draft_id: z.string().min(1),
  user_id: z.string().min(1),
  setup: customPlanSetupSchema,
  days: z.array(customPlanDaySchema).min(3).max(7),
  status: z.enum(["in_progress", "ready_to_publish"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const customPlanPublishedSchema = z.object({
  plan_id: z.string().min(1),
  user_id: z.string().min(1),
  setup: customPlanSetupSchema,
  days: z.array(customPlanDaySchema).min(3).max(7),
  content_label: z.literal("devotional_reflection"),
  teaching_authority_note: z.string().min(1),
  pastoral_escalation: pastoralEscalationSchema,
  created_at: z.string().datetime(),
});

const bannedRoleplayTerms = [
  "i am jesus",
  "i absolve you",
  "as your confessor",
  "i am mary",
  "i am saint",
  "as your spiritual director",
];

export const assertGuardrails = (text: string): void => {
  const lower = text.toLowerCase();
  for (const term of bannedRoleplayTerms) {
    if (lower.includes(term)) {
      throw new Error("Guardrail violation: impersonation or sacramental simulation detected.");
    }
  }
};
