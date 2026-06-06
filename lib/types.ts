// Local copy of the subset of shared types the mobile bundle needs.
// Mirrors /types/index.ts. Kept in sync by convention — if you change a
// shape that the API returns, update both. Metro's project root is /mobile,
// so reaching across to ../types/ would require a metro.config.js watchFolder.

export type RouteLabel =
  | "VOCATION_DISCERNMENT"
  | "SUFFERING_HARDSHIP"
  | "RELATIONSHIPS_FAMILY"
  | "WORK_PURPOSE"
  | "GENERAL_GUIDANCE"
  | "SAFETY_REVIEW";

export interface ClassifierResult {
  primary_route: RouteLabel;
  secondary_route: RouteLabel | null;
  confidence: number;
  themes: string[];
  needs_clarification: boolean;
}

export interface SaintMatch {
  id?: string;
  name: string;
  reason: string;
  themes: string[];
  feast_day: string;
  prayer_reference: string;
  wikipedia_title?: string;
}

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
  wikipedia_title?: string;
  /** Strongest route for this saint (highest-weighted mapping). Populated
   *  by /api/saint/[id] so we can start a plan with no prior intake. */
  suggested_route?: RouteLabel | null;
  /** Themes paired with the suggested route. */
  suggested_themes?: string[];
}

export type CitationKind = "catechism" | "scripture" | "saint_writing" | "liturgy";
export type Citation =
  | { kind: "catechism"; paragraph: number; label: string }
  | { kind: "scripture"; book: string; chapter: number; verse: string; label: string }
  | { kind: "saint_writing"; saint_id: string; title: string; label: string }
  | { kind: "liturgy"; source: "liturgy_of_the_hours" | "roman_missal"; label: string };

export type DevotionPromptType = "reflection" | "prayer" | "journal" | "practice";

export interface DevotionPromptV2 {
  /** Supabase plan_prompts.id, populated when the prompt was loaded from
   *  a saved plan. Absent for freshly-generated prompts. */
  id?: string;
  type: DevotionPromptType;
  title: string;
  body: string;
  estimated_minutes: number;
  citations: Citation[];
}

export interface PlanDay {
  day_index: number;
  theme: string;
  liturgical_note: string | null;
  prompts: DevotionPromptV2[];
}

export interface DevotionPlanV2 {
  primary_route: RouteLabel;
  situation_summary: string;
  saint_matches: SaintMatch[];
  total_days: number;
  days: PlanDay[];
  safety_note: string | null;
  content_label: "devotional_reflection";
  teaching_authority_note: string;
  pastoral_escalation: {
    should_escalate: boolean;
    suggestions: string[];
  };
  sources_used: string[];
}

export type SafetySeverity = "none" | "concern" | "crisis";
export interface SafetyPrescreen {
  severity: SafetySeverity;
  categories: string[];
  reason: string;
}
