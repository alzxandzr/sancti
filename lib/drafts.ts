import type { CustomPlanDraft, CustomPlanPublished } from "../types";

export const draftStorage = {
  store: new Map<string, CustomPlanDraft>(),

  get(draft_id: string): CustomPlanDraft | null {
    return this.store.get(draft_id) ?? null;
  },

  set(draft_id: string, draft: CustomPlanDraft): void {
    this.store.set(draft_id, draft);
  },

  has(draft_id: string): boolean {
    return this.store.has(draft_id);
  },
};

export const publishedStorage = {
  store: new Map<string, CustomPlanPublished>(),

  get(plan_id: string): CustomPlanPublished | null {
    return this.store.get(plan_id) ?? null;
  },

  set(plan_id: string, plan: CustomPlanPublished): void {
    this.store.set(plan_id, plan);
  },

  has(plan_id: string): boolean {
    return this.store.has(plan_id);
  },
};

export const activePlanStorage = {
  store: new Map<string, { plan_id: string; current_day: number; started_at: string }>(),

  get(user_id: string, plan_id: string) {
    return this.store.get(`${user_id}:${plan_id}`) ?? null;
  },

  set(user_id: string, plan_id: string, data: { plan_id: string; current_day: number; started_at: string }) {
    this.store.set(`${user_id}:${plan_id}`, data);
  },
};
