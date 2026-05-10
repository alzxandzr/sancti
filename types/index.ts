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
  content_label: "devotional_reflection";
  teaching_authority_note: string;
  pastoral_escalation: {
    should_escalate: boolean;
    suggestions: string[];
  };
  sources_used: string[];
}

export type StateInLife =
  | "single"
  | "dating_engaged"
  | "married"
  | "parent"
  | "religious"
  | "clergy"
  | "student"
  | "other";

export type PreferredTone = "gentle" | "direct" | "encouraging" | "contemplative";

export type PrayerDuration = 5 | 10 | 15 | 20 | 30;

export interface UserPreferences {
  state_in_life: StateInLife;
  preferred_tone: PreferredTone;
  prayer_duration_minutes: PrayerDuration;
}

export interface SavedSaint {
  saint_id: string;
  saved_at: string;
}

export interface SavedPlan {
  plan_id: string;
  primary_route: RouteLabel;
  day_count: number;
  completed_days: number;
  saved_at: string;
  completed_at: string | null;
}

export interface ProgressSummary {
  total_saved_saints: number;
  total_saved_plans: number;
  completed_plans: number;
  completed_plan_days: number;
}

export interface UserProfile {
  user_id: string;
  preferences: UserPreferences;
  saved_saints: SavedSaint[];
  saved_plans: SavedPlan[];
  progress: ProgressSummary;
  created_at: string;
  updated_at: string;
}

export interface MatchWeight {
  saint_id: string;
  route: RouteLabel;
  themes: string[];
  weight: number;
}

// --- Phase 2 contracts: day primitive + citations -------------------------
// These extend the v1 contracts above. The legacy DevotionPrompt / DevotionPlan
// shapes remain exported so existing callers keep compiling while routes are
// migrated to the day-aware shape.

export type CitationKind = "catechism" | "scripture" | "saint_writing" | "liturgy";

export type Citation =
  | { kind: "catechism"; paragraph: number; label: string }
  | { kind: "scripture"; book: string; chapter: number; verse: string; label: string }
  | { kind: "saint_writing"; saint_id: string; title: string; label: string }
  | { kind: "liturgy"; source: "liturgy_of_the_hours" | "roman_missal"; label: string };

export type DevotionPromptType = "reflection" | "prayer" | "journal" | "practice";

export interface DevotionPromptV2 {
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

export interface CrisisResource {
  region: string;
  locale: string;
  name: string;
  contact: string;
  hours: string;
  notes?: string;
}

// --- Persistence (Phase 1) ------------------------------------------------

export interface SafetyEvent {
  id: string;
  user_id: string | null;
  trigger:
    | "input_prescreen"
    | "classifier_route"
    | "output_banlist"
    | "citation_rejected"
    | "prompt_injection";
  severity: SafetySeverity | "info" | "warn" | "critical";
  route_at_trigger: RouteLabel | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface ClassificationLog {
  id: string;
  user_id: string;
  result: ClassifierResult;
  model: string;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  created_at: string;
}
