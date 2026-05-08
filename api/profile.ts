import { profileActionSchema, userProfileSchema } from "../lib/validator";
import type { ProgressSummary, SavedPlan, UserPreferences, UserProfile } from "../types";

type ProfileAction =
  | { action: "get_profile"; user_id: string }
  | { action: "upsert_profile"; user_id: string; preferences: UserPreferences }
  | { action: "save_saint"; user_id: string; saint_id: string }
  | { action: "save_plan"; user_id: string; plan_id: string; primary_route: SavedPlan["primary_route"]; day_count: number }
  | { action: "mark_plan_day_complete"; user_id: string; plan_id: string };

const profileStore = new Map<string, UserProfile>();

const defaultPreferences: UserPreferences = {
  state_in_life: "other",
  preferred_tone: "gentle",
  prayer_duration_minutes: 10,
};

const buildProgress = (profile: Pick<UserProfile, "saved_saints" | "saved_plans">): ProgressSummary => {
  const completedPlans = profile.saved_plans.filter((plan) => plan.completed_at !== null).length;
  const completedPlanDays = profile.saved_plans.reduce((sum, plan) => sum + plan.completed_days, 0);

  return {
    total_saved_saints: profile.saved_saints.length,
    total_saved_plans: profile.saved_plans.length,
    completed_plans: completedPlans,
    completed_plan_days: completedPlanDays,
  };
};

const createEmptyProfile = (userId: string): UserProfile => {
  const now = new Date().toISOString();
  const base = {
    user_id: userId,
    preferences: defaultPreferences,
    saved_saints: [],
    saved_plans: [],
    created_at: now,
    updated_at: now,
  };

  return userProfileSchema.parse({
    ...base,
    progress: buildProgress(base),
  });
};

const getOrCreateProfile = (userId: string): UserProfile => {
  const existing = profileStore.get(userId);
  if (existing) {
    return existing;
  }

  const created = createEmptyProfile(userId);
  profileStore.set(userId, created);
  return created;
};

const persist = (profile: UserProfile): UserProfile => {
  const withProgress = userProfileSchema.parse({
    ...profile,
    progress: buildProgress(profile),
    updated_at: new Date().toISOString(),
  });

  profileStore.set(withProgress.user_id, withProgress);
  return withProgress;
};

export const applyProfileAction = (input: ProfileAction): UserProfile => {
  const parsed = profileActionSchema.parse(input);
  const profile = getOrCreateProfile(parsed.user_id);

  switch (parsed.action) {
    case "get_profile":
      return profile;
    case "upsert_profile": {
      return persist({
        ...profile,
        preferences: parsed.preferences,
      });
    }
    case "save_saint": {
      if (profile.saved_saints.some((entry) => entry.saint_id === parsed.saint_id)) {
        return profile;
      }

      return persist({
        ...profile,
        saved_saints: [...profile.saved_saints, { saint_id: parsed.saint_id, saved_at: new Date().toISOString() }],
      });
    }
    case "save_plan": {
      if (profile.saved_plans.some((entry) => entry.plan_id === parsed.plan_id)) {
        return profile;
      }

      return persist({
        ...profile,
        saved_plans: [
          ...profile.saved_plans,
          {
            plan_id: parsed.plan_id,
            primary_route: parsed.primary_route,
            day_count: parsed.day_count,
            completed_days: 0,
            saved_at: new Date().toISOString(),
            completed_at: null,
          },
        ],
      });
    }
    case "mark_plan_day_complete": {
      const plan = profile.saved_plans.find((entry) => entry.plan_id === parsed.plan_id);
      if (!plan) {
        throw new Error(`Plan '${parsed.plan_id}' is not saved for this user.`);
      }

      const nextCompletedDays = Math.min(plan.day_count, plan.completed_days + 1);
      const completedAt = nextCompletedDays === plan.day_count ? plan.completed_at ?? new Date().toISOString() : null;

      return persist({
        ...profile,
        saved_plans: profile.saved_plans.map((entry) =>
          entry.plan_id === parsed.plan_id
            ? { ...entry, completed_days: nextCompletedDays, completed_at: completedAt }
            : entry,
        ),
      });
    }
    default: {
      const neverAction: never = parsed;
      return neverAction;
    }
  }
};

export default function handler(
  req: { body: ProfileAction },
  res: { status: (code: number) => { json: (payload: UserProfile | { error: string }) => void } },
): void {
  try {
    const profile = applyProfileAction(req.body);
    res.status(200).json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown profile error";
    res.status(400).json({ error: message });
  }
}
