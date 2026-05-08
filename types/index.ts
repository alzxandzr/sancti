export type RouteLabel =
  | "VOCATION_DISCERNMENT"
  | "SUFFERING_HARDSHIP"
  | "RELATIONSHIPS_FAMILY"
  | "WORK_PURPOSE"
  | "GENERAL_GUIDANCE"
  | "SAFETY_REVIEW";

export interface Saint {
  id: string;
  name: string;
  title: string;
  feast_day: string;
  era: string;
  short_bio: string;
  patronages: string[];
  virtues: string[];
  keywords: string[];
  themes: string[];
  source_links: string[];
}

export interface Situation {
  id: string;
  label: string;
  category: RouteLabel;
  synonyms: string[];
  emotional_tags: string[];
  life_stage_tags: string[];
}

export interface ClassifierResult {
  primary_route: RouteLabel;
  secondary_route: RouteLabel | null;
  confidence: number;
  themes: string[];
  needs_clarification: boolean;
}

export interface SaintMatch {
  name: string;
  reason: string;
  themes: string[];
  feast_day: string;
  prayer_reference: string;
}

export interface DevotionPrompt {
  type: "reflection" | "journal" | "prayer" | "action";
  title: string;
  text: string;
}

export interface DevotionPlan {
  primary_route: RouteLabel;
  situation_summary: string;
  saint_matches: SaintMatch[];
  devotion_prompts: DevotionPrompt[];
  safety_note: string | null;
  sources_used: string[];
}

export interface MatchWeight {
  saint_id: string;
  route: RouteLabel;
  themes: string[];
  weight: number;
}
