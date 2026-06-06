import { logger } from "../lib/logger";
import { getProfileStore } from "../lib/profile-store";
import { profileActionSchema } from "../lib/validator";
import type {
  ClassifierResult,
  RouteLabel,
  UserPreferences,
  UserProfile,
} from "../types";

export type ProfileAction =
  | { action: "get_profile"; user_id: string }
  | { action: "upsert_profile"; user_id: string; preferences: UserPreferences }
  | { action: "save_saint"; user_id: string; saint_id: string }
  | {
      action: "save_plan";
      user_id: string;
      plan_id: string;
      primary_route: RouteLabel;
      day_count: number;
      saint_ids: string[];
      classification: ClassifierResult;
    }
  | { action: "mark_plan_day_complete"; user_id: string; plan_id: string };

export const applyProfileAction = async (input: ProfileAction): Promise<UserProfile> => {
  const parsed = profileActionSchema.parse(input);
  const store = getProfileStore();

  switch (parsed.action) {
    case "get_profile":
      return store.get(parsed.user_id);
    case "upsert_profile":
      return store.upsertPreferences(parsed.user_id, parsed.preferences);
    case "save_saint":
      return store.saveSaint(parsed.user_id, parsed.saint_id);
    case "save_plan":
      return store.savePlan(parsed.user_id, {
        plan_id: parsed.plan_id,
        primary_route: parsed.primary_route,
        day_count: parsed.day_count,
        saint_ids: parsed.saint_ids,
        classification: parsed.classification,
      });
    case "mark_plan_day_complete":
      return store.markPlanDayComplete(parsed.user_id, parsed.plan_id);
    default: {
      const neverAction: never = parsed;
      return neverAction;
    }
  }
};

export default async function handler(
  req: { body: ProfileAction },
  res: { status: (code: number) => { json: (payload: UserProfile | { error: string }) => void } },
): Promise<void> {
  try {
    const profile = await applyProfileAction(req.body);
    res.status(200).json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown profile error";
    logger.warn("profile_action_failed", { action: req.body?.action, error: message });
    res.status(400).json({ error: message });
  }
}
