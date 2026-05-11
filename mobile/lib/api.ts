// Tiny fetch wrapper for talking to the Sancti API from the Expo app.
// EXPO_PUBLIC_API_BASE_URL is baked into the bundle at build time.

import type {
  ClassifierResult,
  DevotionPlanV2,
  RouteLabel,
  Saint,
  SafetyPrescreen,
  SaintMatch,
} from "./types";

export type { ClassifierResult, DevotionPlanV2, RouteLabel, Saint, SafetyPrescreen, SaintMatch };

export interface ClassifyResponse {
  classification: ClassifierResult;
  safety: SafetyPrescreen;
  short_circuited: boolean;
  used_fallback: boolean;
}

const baseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is not set. Add it to .env.local and restart Expo.",
    );
  }
  return url.replace(/\/+$/, "");
};

const post = async <TReq, TRes>(path: string, body: TReq): Promise<TRes> => {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${text || res.statusText}`);
  }
  return JSON.parse(text) as TRes;
};

const get = async <TRes>(path: string): Promise<TRes> => {
  const res = await fetch(`${baseUrl()}${path}`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${text || res.statusText}`);
  }
  return JSON.parse(text) as TRes;
};

export const apiClassify = (user_text: string): Promise<ClassifyResponse> =>
  post("/classify", { user_text });

export const apiMatchSaints = (
  route: RouteLabel,
  themes: string[],
  excludeIds: string[] = [],
): Promise<{ saints: SaintMatch[] }> =>
  post("/match-saints", {
    route,
    themes,
    ...(excludeIds.length > 0 ? { exclude_ids: excludeIds } : {}),
  });

export interface PlanPreferences {
  state_in_life?: string;
  preferred_tone?: string;
  prayer_duration_minutes?: 5 | 10 | 15 | 20 | 30;
}

export const apiGeneratePlan = (input: {
  route: RouteLabel;
  user_text: string;
  saints: SaintMatch[];
  preferences?: PlanPreferences;
}): Promise<DevotionPlanV2> => post("/generate-plan", input);

export const apiFetchSaint = (id: string): Promise<Saint> =>
  get(`/saint/${encodeURIComponent(id)}`);

export interface SaintSummary {
  id: string;
  name: string;
  title: string;
  era: string;
  feast_day: string;
  themes: string[];
  wikipedia_title?: string;
}

export const apiListSaints = (): Promise<{ saints: SaintSummary[] }> =>
  get("/saints");

export interface LiturgicalToday {
  date: string;
  celebration: string;
  rank: string;
  saint: {
    id: string;
    name: string;
    title: string;
    feast_day: string;
    era: string;
    wikipedia_title?: string;
  } | null;
}

export const apiLiturgicalToday = (): Promise<LiturgicalToday> =>
  get("/liturgical/today");
