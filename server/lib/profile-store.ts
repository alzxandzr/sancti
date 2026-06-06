import type {
  ClassifierResult,
  ProgressSummary,
  RouteLabel,
  SavedPlan,
  SavedSaint,
  UserPreferences,
  UserProfile,
} from "../types";
import { userProfileSchema } from "./validator";
import { getServiceSupabaseClient } from "./supabase";

// Two store implementations behind one interface.
//
//   InMemoryProfileStore: default in dev and tests. Honors the same contract
//     so the route can be exercised without a Supabase instance.
//
//   SupabaseProfileStore: persists against the schema in
//     supabase/migrations/0001_init.sql (profiles, saved_saints, saved_plans).
//     Production path once auth is wired.

export interface SavePlanArgs {
  plan_id: string;
  primary_route: RouteLabel;
  day_count: number;
  saint_ids: string[];
  classification: ClassifierResult;
}

export interface ProfileStore {
  get(userId: string): Promise<UserProfile>;
  upsertPreferences(userId: string, prefs: UserPreferences): Promise<UserProfile>;
  saveSaint(userId: string, saintId: string): Promise<UserProfile>;
  savePlan(userId: string, args: SavePlanArgs): Promise<UserProfile>;
  markPlanDayComplete(userId: string, planId: string): Promise<UserProfile>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  state_in_life: "other",
  preferred_tone: "gentle",
  prayer_duration_minutes: 10,
};

const buildProgress = (saints: SavedSaint[], plans: SavedPlan[]): ProgressSummary => ({
  total_saved_saints: saints.length,
  total_saved_plans: plans.length,
  completed_plans: plans.filter((p) => p.completed_at !== null).length,
  completed_plan_days: plans.reduce((sum, p) => sum + p.completed_days, 0),
});

const composeProfile = (input: {
  user_id: string;
  preferences: UserPreferences;
  saved_saints: SavedSaint[];
  saved_plans: SavedPlan[];
  created_at: string;
  updated_at: string;
}): UserProfile =>
  userProfileSchema.parse({
    ...input,
    progress: buildProgress(input.saved_saints, input.saved_plans),
  });

// ─── In-memory store ─────────────────────────────────────────────────────

export class InMemoryProfileStore implements ProfileStore {
  private readonly profiles = new Map<string, UserProfile>();

  private getOrCreate(userId: string): UserProfile {
    const existing = this.profiles.get(userId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const fresh = composeProfile({
      user_id: userId,
      preferences: DEFAULT_PREFERENCES,
      saved_saints: [],
      saved_plans: [],
      created_at: now,
      updated_at: now,
    });
    this.profiles.set(userId, fresh);
    return fresh;
  }

  private persist(next: Omit<UserProfile, "progress" | "updated_at">): UserProfile {
    const composed = composeProfile({ ...next, updated_at: new Date().toISOString() });
    this.profiles.set(composed.user_id, composed);
    return composed;
  }

  async get(userId: string): Promise<UserProfile> {
    return this.getOrCreate(userId);
  }

  async upsertPreferences(userId: string, preferences: UserPreferences): Promise<UserProfile> {
    const profile = this.getOrCreate(userId);
    return this.persist({ ...profile, preferences });
  }

  async saveSaint(userId: string, saintId: string): Promise<UserProfile> {
    const profile = this.getOrCreate(userId);
    if (profile.saved_saints.some((s) => s.saint_id === saintId)) return profile;
    return this.persist({
      ...profile,
      saved_saints: [...profile.saved_saints, { saint_id: saintId, saved_at: new Date().toISOString() }],
    });
  }

  async savePlan(userId: string, args: SavePlanArgs): Promise<UserProfile> {
    const profile = this.getOrCreate(userId);
    if (profile.saved_plans.some((p) => p.plan_id === args.plan_id)) return profile;
    return this.persist({
      ...profile,
      saved_plans: [
        ...profile.saved_plans,
        {
          plan_id: args.plan_id,
          primary_route: args.primary_route,
          day_count: args.day_count,
          completed_days: 0,
          saved_at: new Date().toISOString(),
          completed_at: null,
        },
      ],
    });
  }

  async markPlanDayComplete(userId: string, planId: string): Promise<UserProfile> {
    const profile = this.getOrCreate(userId);
    const plan = profile.saved_plans.find((p) => p.plan_id === planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' is not saved for this user.`);
    }
    const nextCompleted = Math.min(plan.day_count, plan.completed_days + 1);
    const completedAt =
      nextCompleted === plan.day_count ? plan.completed_at ?? new Date().toISOString() : null;
    return this.persist({
      ...profile,
      saved_plans: profile.saved_plans.map((p) =>
        p.plan_id === planId ? { ...p, completed_days: nextCompleted, completed_at: completedAt } : p,
      ),
    });
  }
}

// ─── Supabase store ──────────────────────────────────────────────────────

interface DbProfileRow {
  user_id: string;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

interface DbSavedSaintRow {
  saint_id: string;
  saved_at: string;
}

interface DbSavedPlanRow {
  id: string;
  route: RouteLabel;
  total_days: number;
  current_day_index: number;
  created_at: string;
  completed_at: string | null;
}

export class SupabaseProfileStore implements ProfileStore {
  private async loadComposed(userId: string): Promise<UserProfile> {
    const client = getServiceSupabaseClient();

    const [profileRes, saintsRes, plansRes] = await Promise.all([
      client
        .from("profiles")
        .select("user_id, preferences, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle<DbProfileRow>(),
      client
        .from("saved_saints")
        .select("saint_id, saved_at")
        .eq("user_id", userId)
        .order("saved_at", { ascending: true })
        .returns<DbSavedSaintRow[]>(),
      client
        .from("saved_plans")
        .select("id, route, total_days, current_day_index, created_at, completed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .returns<DbSavedPlanRow[]>(),
    ]);

    if (profileRes.error) throw new Error(`profile load failed: ${profileRes.error.message}`);
    if (saintsRes.error) throw new Error(`saved_saints load failed: ${saintsRes.error.message}`);
    if (plansRes.error) throw new Error(`saved_plans load failed: ${plansRes.error.message}`);

    if (!profileRes.data) {
      throw new Error(
        `Profile not found for user '${userId}'. Profiles are created by the on_auth_user_created trigger; ensure the user exists in auth.users.`,
      );
    }

    const saved_saints: SavedSaint[] = (saintsRes.data ?? []).map((row) => ({
      saint_id: row.saint_id,
      saved_at: row.saved_at,
    }));

    const saved_plans: SavedPlan[] = (plansRes.data ?? []).map((row) => ({
      plan_id: row.id,
      primary_route: row.route,
      day_count: row.total_days,
      completed_days: row.current_day_index,
      saved_at: row.created_at,
      completed_at: row.completed_at,
    }));

    return composeProfile({
      user_id: profileRes.data.user_id,
      preferences: profileRes.data.preferences,
      saved_saints,
      saved_plans,
      created_at: profileRes.data.created_at,
      updated_at: profileRes.data.updated_at,
    });
  }

  async get(userId: string): Promise<UserProfile> {
    return this.loadComposed(userId);
  }

  async upsertPreferences(userId: string, preferences: UserPreferences): Promise<UserProfile> {
    const client = getServiceSupabaseClient();
    const { error } = await client
      .from("profiles")
      .update({ preferences, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) throw new Error(`profile update failed: ${error.message}`);
    return this.loadComposed(userId);
  }

  async saveSaint(userId: string, saintId: string): Promise<UserProfile> {
    const client = getServiceSupabaseClient();
    // Composite PK (user_id, saint_id) means duplicates are silently ignored.
    const { error } = await client
      .from("saved_saints")
      .upsert({ user_id: userId, saint_id: saintId }, { onConflict: "user_id,saint_id", ignoreDuplicates: true });
    if (error) throw new Error(`save_saint failed: ${error.message}`);
    return this.loadComposed(userId);
  }

  async savePlan(userId: string, args: SavePlanArgs): Promise<UserProfile> {
    const client = getServiceSupabaseClient();
    const { error } = await client
      .from("saved_plans")
      .upsert(
        {
          id: args.plan_id,
          user_id: userId,
          route: args.primary_route,
          classification: args.classification,
          saint_ids: args.saint_ids,
          total_days: args.day_count,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) throw new Error(`save_plan failed: ${error.message}`);
    return this.loadComposed(userId);
  }

  async markPlanDayComplete(userId: string, planId: string): Promise<UserProfile> {
    const client = getServiceSupabaseClient();

    const { data: plan, error: readErr } = await client
      .from("saved_plans")
      .select("total_days, current_day_index, completed_at")
      .eq("id", planId)
      .eq("user_id", userId)
      .maybeSingle<{ total_days: number; current_day_index: number; completed_at: string | null }>();
    if (readErr) throw new Error(`mark_plan_day_complete read failed: ${readErr.message}`);
    if (!plan) throw new Error(`Plan '${planId}' is not saved for this user.`);

    const nextIndex = Math.min(plan.total_days, plan.current_day_index + 1);
    const completedAt =
      nextIndex === plan.total_days ? plan.completed_at ?? new Date().toISOString() : null;

    const { error: writeErr } = await client
      .from("saved_plans")
      .update({ current_day_index: nextIndex, completed_at: completedAt })
      .eq("id", planId)
      .eq("user_id", userId);
    if (writeErr) throw new Error(`mark_plan_day_complete write failed: ${writeErr.message}`);

    return this.loadComposed(userId);
  }
}

// ─── Default selection + test injection ──────────────────────────────────

let storeOverride: ProfileStore | null = null;
let defaultStore: ProfileStore | null = null;

export const getProfileStore = (): ProfileStore => {
  if (storeOverride) return storeOverride;
  if (defaultStore) return defaultStore;

  // Use Supabase when the server env is fully configured. Otherwise fall back
  // to in-memory (dev without Supabase set up, and tests that don't inject).
  const hasSupabase = Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  defaultStore = hasSupabase ? new SupabaseProfileStore() : new InMemoryProfileStore();
  return defaultStore;
};

export const __setProfileStoreForTest = (store: ProfileStore | null): void => {
  storeOverride = store;
};

export const __resetProfileStoreForTest = (): void => {
  storeOverride = null;
  defaultStore = null;
};
