import test from "node:test";
import assert from "node:assert/strict";
import { applyProfileAction } from "../api/profile";
import {
  InMemoryProfileStore,
  __resetProfileStoreForTest,
  __setProfileStoreForTest,
} from "../lib/profile-store";
import type { ClassifierResult } from "../types";

const USER = "user-test-1";

const sampleClassification: ClassifierResult = {
  primary_route: "SUFFERING_HARDSHIP",
  secondary_route: null,
  confidence: 0.78,
  themes: ["grief", "loss"],
  needs_clarification: false,
};

const useFreshStore = (t: { after: (fn: () => void) => void }): void => {
  __setProfileStoreForTest(new InMemoryProfileStore());
  t.after(() => {
    __resetProfileStoreForTest();
  });
};

test("get_profile auto-creates a profile with defaults", async (t) => {
  useFreshStore(t);

  const profile = await applyProfileAction({ action: "get_profile", user_id: USER });

  assert.equal(profile.user_id, USER);
  assert.equal(profile.preferences.preferred_tone, "gentle");
  assert.equal(profile.preferences.prayer_duration_minutes, 10);
  assert.deepEqual(profile.saved_saints, []);
  assert.deepEqual(profile.saved_plans, []);
  assert.equal(profile.progress.total_saved_saints, 0);
  assert.equal(profile.progress.total_saved_plans, 0);
});

test("upsert_profile updates preferences in place", async (t) => {
  useFreshStore(t);

  const updated = await applyProfileAction({
    action: "upsert_profile",
    user_id: USER,
    preferences: {
      state_in_life: "married",
      preferred_tone: "contemplative",
      prayer_duration_minutes: 20,
    },
  });

  assert.equal(updated.preferences.state_in_life, "married");
  assert.equal(updated.preferences.preferred_tone, "contemplative");
  assert.equal(updated.preferences.prayer_duration_minutes, 20);
});

test("save_saint is idempotent on duplicate saint_id", async (t) => {
  useFreshStore(t);

  const first = await applyProfileAction({ action: "save_saint", user_id: USER, saint_id: "saint-monica" });
  const second = await applyProfileAction({ action: "save_saint", user_id: USER, saint_id: "saint-monica" });

  assert.equal(first.saved_saints.length, 1);
  assert.equal(second.saved_saints.length, 1, "duplicate save is a no-op");
  assert.equal(second.progress.total_saved_saints, 1);
});

test("save_plan is idempotent and tracks per-plan progress", async (t) => {
  useFreshStore(t);

  const planArgs = {
    action: "save_plan" as const,
    user_id: USER,
    plan_id: "plan-abc",
    primary_route: "SUFFERING_HARDSHIP" as const,
    day_count: 5,
    saint_ids: ["saint-monica", "saint-augustine"],
    classification: sampleClassification,
  };

  const first = await applyProfileAction(planArgs);
  const second = await applyProfileAction(planArgs);

  assert.equal(first.saved_plans.length, 1);
  assert.equal(second.saved_plans.length, 1, "duplicate plan_id is a no-op");
  assert.equal(first.saved_plans[0].day_count, 5);
  assert.equal(first.saved_plans[0].completed_days, 0);
  assert.equal(first.saved_plans[0].completed_at, null);
});

test("mark_plan_day_complete clamps at day_count and sets completed_at on last day", async (t) => {
  useFreshStore(t);

  await applyProfileAction({
    action: "save_plan",
    user_id: USER,
    plan_id: "plan-xyz",
    primary_route: "GENERAL_GUIDANCE",
    day_count: 3,
    saint_ids: ["saint-monica"],
    classification: sampleClassification,
  });

  let profile = await applyProfileAction({
    action: "mark_plan_day_complete",
    user_id: USER,
    plan_id: "plan-xyz",
  });
  assert.equal(profile.saved_plans[0].completed_days, 1);
  assert.equal(profile.saved_plans[0].completed_at, null);

  profile = await applyProfileAction({
    action: "mark_plan_day_complete",
    user_id: USER,
    plan_id: "plan-xyz",
  });
  assert.equal(profile.saved_plans[0].completed_days, 2);
  assert.equal(profile.saved_plans[0].completed_at, null);

  profile = await applyProfileAction({
    action: "mark_plan_day_complete",
    user_id: USER,
    plan_id: "plan-xyz",
  });
  assert.equal(profile.saved_plans[0].completed_days, 3);
  assert.notEqual(profile.saved_plans[0].completed_at, null, "completed_at set on last day");

  // Extra increments are clamped; completed_at sticks.
  const completedAt = profile.saved_plans[0].completed_at;
  profile = await applyProfileAction({
    action: "mark_plan_day_complete",
    user_id: USER,
    plan_id: "plan-xyz",
  });
  assert.equal(profile.saved_plans[0].completed_days, 3, "clamped at day_count");
  assert.equal(profile.saved_plans[0].completed_at, completedAt, "completed_at stable after final");
  assert.equal(profile.progress.completed_plans, 1);
  assert.equal(profile.progress.completed_plan_days, 3);
});

test("mark_plan_day_complete throws for unknown plan_id", async (t) => {
  useFreshStore(t);

  await applyProfileAction({ action: "get_profile", user_id: USER });

  await assert.rejects(
    () =>
      applyProfileAction({
        action: "mark_plan_day_complete",
        user_id: USER,
        plan_id: "does-not-exist",
      }),
    /not saved for this user/,
  );
});

test("save_plan rejects payload missing saint_ids or classification", async (t) => {
  useFreshStore(t);

  // Casting to bypass type checks so the schema is what enforces this at runtime.
  const bad = {
    action: "save_plan",
    user_id: USER,
    plan_id: "plan-bad",
    primary_route: "GENERAL_GUIDANCE",
    day_count: 5,
  } as unknown as Parameters<typeof applyProfileAction>[0];

  await assert.rejects(() => applyProfileAction(bad));
});
