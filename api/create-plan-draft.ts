import { customPlanSetupSchema, customPlanDraftSchema, assertGuardrails } from "../lib/validator";
import { draftStorage } from "../lib/drafts";
import type { CustomPlanSetup, CustomPlanDay, CustomPlanDraft } from "../types";

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const dayPromptTemplates: Record<string, string[]> = {
  reflection: [
    "Reflect on how God is present in your current situation.",
    "What spiritual insight is emerging for you today?",
    "How does your faith inform your perspective on this?",
  ],
  journal: [
    "What are you grateful for today? Journal freely.",
    "Write about a challenge you faced and how you handled it.",
    "Describe a moment when you felt God's grace.",
  ],
  prayer: [
    "Pray with gratitude for guidance in your path.",
    "Ask for courage, wisdom, and a willing heart.",
    "Offer your day's labor for God's glory and others' good.",
  ],
  action: [
    "Take one concrete step toward your intention.",
    "Perform one small act of mercy or service.",
    "Practice patience in one delayed or difficult task.",
  ],
};

const generateInitialDays = (setup: CustomPlanSetup): CustomPlanDay[] => {
  const promptTypes: Array<"reflection" | "journal" | "prayer" | "action"> = [
    "reflection",
    "journal",
    "prayer",
    "action",
  ];

  const days: CustomPlanDay[] = [];
  for (let dayNum = 1; dayNum <= setup.duration_days; dayNum++) {
    const promptType = promptTypes[(dayNum - 1) % promptTypes.length];
    const templates = dayPromptTemplates[promptType];
    const template = templates[dayNum % templates.length];
    const title = `Day ${dayNum}: ${promptType.charAt(0).toUpperCase() + promptType.slice(1)}`;

    days.push({
      day_number: dayNum,
      prompt_type: promptType,
      title,
      text: template,
      edited_by_user: false,
    });
  }

  return days;
};

export const createPlanDraft = (
  user_id: string,
  setup: CustomPlanSetup,
): CustomPlanDraft => {
  const parsed = customPlanSetupSchema.parse(setup);
  const draft_id = generateId();
  const now = new Date().toISOString();

  const days = generateInitialDays(parsed);
  days.forEach((day) => assertGuardrails(day.text));

  const draft: CustomPlanDraft = customPlanDraftSchema.parse({
    draft_id,
    user_id,
    setup: parsed,
    days,
    status: "in_progress",
    created_at: now,
    updated_at: now,
  });

  draftStorage.set(draft_id, draft);
  return draft;
};

export default function handler(
  req: { body: { user_id: string; setup: CustomPlanSetup } },
  res: {
    status: (code: number) => {
      json: (payload: CustomPlanDraft | { error: string }) => void;
    };
  },
): void {
  try {
    const draft = createPlanDraft(req.body.user_id, req.body.setup);
    res.status(200).json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create plan draft";
    res.status(400).json({ error: message });
  }
}
