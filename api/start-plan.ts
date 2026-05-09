import { publishedStorage, activePlanStorage } from "../lib/drafts";
import type { CustomPlanPublished } from "../types";

export interface StartPlanResponse {
  plan_id: string;
  current_day: number;
  total_days: number;
  current_prompt: {
    day_number: number;
    title: string;
    text: string;
    prompt_type: string;
  };
  started_at: string;
}

export const startPlan = (user_id: string, plan_id: string): StartPlanResponse => {
  const published = publishedStorage.get(plan_id);
  if (!published) {
    throw new Error(`Plan '${plan_id}' not found.`);
  }

  if (published.user_id !== user_id) {
    throw new Error("Unauthorized: plan belongs to a different user.");
  }

  const now = new Date().toISOString();

  activePlanStorage.set(user_id, plan_id, {
    plan_id,
    current_day: 1,
    started_at: now,
  });

  const firstDay = published.days.find((day) => day.day_number === 1);
  if (!firstDay) {
    throw new Error("Plan has no day 1 prompt.");
  }

  return {
    plan_id,
    current_day: 1,
    total_days: published.setup.duration_days,
    current_prompt: {
      day_number: firstDay.day_number,
      title: firstDay.title,
      text: firstDay.text,
      prompt_type: firstDay.prompt_type,
    },
    started_at: now,
  };
};

export const getActiveDay = (
  user_id: string,
  plan_id: string,
): { current_day: number; total_days: number } | null => {
  const active = activePlanStorage.get(user_id, plan_id);
  if (!active) {
    return null;
  }

  const published = publishedStorage.get(plan_id);
  if (!published) {
    return null;
  }

  return {
    current_day: active.current_day,
    total_days: published.setup.duration_days,
  };
};

export default function handler(
  req: { body: { user_id: string; plan_id: string } },
  res: {
    status: (code: number) => {
      json: (payload: StartPlanResponse | { error: string }) => void;
    };
  },
): void {
  try {
    const response = startPlan(req.body.user_id, req.body.plan_id);
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start plan";
    res.status(400).json({ error: message });
  }
}
