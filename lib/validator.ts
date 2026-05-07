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

export const devotionPlanSchema = z.object({
  primary_route: routeLabelSchema,
  situation_summary: z.string().min(1),
  saint_matches: z.array(saintMatchSchema).length(3),
  devotion_prompts: z.array(devotionPromptSchema).min(3).max(4),
  safety_note: z.string().nullable(),
  sources_used: z.array(z.string().min(1)).min(1),
});

export const generatePlanInputSchema = z.object({
  route: routeLabelSchema,
  user_text: z.string().min(5).max(1500),
  saints: z.array(saintMatchSchema).min(1),
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
