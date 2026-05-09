import { customPlanPublishedSchema, assertGuardrails } from "../lib/validator";
import { draftStorage, publishedStorage } from "../lib/drafts";
import type { CustomPlanPublished } from "../types";

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const sensitiveKeywords = [
  "suicide",
  "self-harm",
  "abuse",
  "danger",
  "crisis",
  "emergency",
];

const detectSensitiveContent = (text: string): boolean => {
  const lower = text.toLowerCase();
  return sensitiveKeywords.some((keyword) => lower.includes(keyword));
};

export const publishPlan = (draft_id: string): CustomPlanPublished => {
  const draft = draftStorage.get(draft_id);
  if (!draft) {
    throw new Error(`Draft '${draft_id}' not found.`);
  }

  const allText = draft.days.map((day) => day.text).join(" ");
  const isSensitive = detectSensitiveContent(allText) || detectSensitiveContent(draft.setup.title);

  const teachingAuthorityNote =
    "This content is devotional reflection only and is not official Church teaching. For authoritative guidance, consult the Catechism, magisterial documents, or your priest/parish.";

  const escalationSuggestions = isSensitive
    ? [
        "Speak with a trusted priest as soon as possible for pastoral support.",
        "Contact your local parish office and request immediate accompaniment.",
        "If immediate risk is present, contact local emergency services or a crisis hotline.",
      ]
    : [];

  const published: CustomPlanPublished = customPlanPublishedSchema.parse({
    plan_id: generateId(),
    user_id: draft.user_id,
    setup: draft.setup,
    days: draft.days,
    content_label: "devotional_reflection",
    teaching_authority_note: teachingAuthorityNote,
    pastoral_escalation: {
      should_escalate: isSensitive,
      suggestions: escalationSuggestions,
    },
    created_at: new Date().toISOString(),
  });

  published.days.forEach((day) => assertGuardrails(day.text));
  publishedStorage.set(published.plan_id, published);
  return published;
};

export default function handler(
  req: { body: { draft_id: string } },
  res: {
    status: (code: number) => {
      json: (payload: CustomPlanPublished | { error: string }) => void;
    };
  },
): void {
  try {
    const published = publishPlan(req.body.draft_id);
    res.status(200).json(published);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish plan";
    res.status(400).json({ error: message });
  }
}
