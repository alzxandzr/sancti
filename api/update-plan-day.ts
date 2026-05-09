import { customPlanDraftSchema, customPlanDaySchema, assertGuardrails } from "../lib/validator";
import { draftStorage } from "../lib/drafts";
import type { CustomPlanDay, CustomPlanDraft } from "../types";

export const updatePlanDay = (draft_id: string, dayUpdate: CustomPlanDay): CustomPlanDraft => {
  const draft = draftStorage.get(draft_id);
  if (!draft) {
    throw new Error(`Draft '${draft_id}' not found.`);
  }

  const parsed = customPlanDaySchema.parse({
    ...dayUpdate,
    edited_by_user: true,
  });

  assertGuardrails(parsed.text);

  const updatedDays = draft.days.map((day) =>
    day.day_number === parsed.day_number ? parsed : day,
  );

  const updated: CustomPlanDraft = customPlanDraftSchema.parse({
    ...draft,
    days: updatedDays,
    updated_at: new Date().toISOString(),
  });

  draftStorage.set(draft_id, updated);
  return updated;
};

export default function handler(
  req: { body: { draft_id: string; day: CustomPlanDay } },
  res: {
    status: (code: number) => {
      json: (payload: CustomPlanDraft | { error: string }) => void;
    };
  },
): void {
  try {
    const updated = updatePlanDay(req.body.draft_id, req.body.day);
    res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update plan day";
    res.status(400).json({ error: message });
  }
}
