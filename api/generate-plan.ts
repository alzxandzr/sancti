import saintsData from "../data/saints.json";
import { callJSON, getModels } from "../lib/anthropic";
import { CitationRejectedError, assertAllCitationsValid } from "../lib/citations";
import { getTodayLiturgicalContext } from "../lib/liturgical";
import { logger } from "../lib/logger";
import { crisisResourcesForLocale, recordSafetyEvent } from "../lib/safety";
import {
  assertGuardrails,
  devotionPlanV2Schema,
  generatePlanInputSchema,
} from "../lib/validator";
import { baseSystemPrompt } from "../prompts/base";
import {
  familyRoutePrompt,
  generalRoutePrompt,
  safetyRoutePrompt,
  sufferingRoutePrompt,
  vocationRoutePrompt,
  workRoutePrompt,
} from "../prompts/routes";
import type {
  Citation,
  CrisisResource,
  DevotionPlanV2,
  PlanDay,
  RouteLabel,
  Saint,
  SaintMatch,
} from "../types";

const TEACHING_AUTHORITY_NOTE =
  "This content is devotional reflection only and is not official Church teaching. For authoritative guidance, consult the Catechism, magisterial documents, or your priest/parish.";

const ROUTE_TO_PROMPT: Record<RouteLabel, string> = {
  VOCATION_DISCERNMENT: vocationRoutePrompt,
  SUFFERING_HARDSHIP: sufferingRoutePrompt,
  RELATIONSHIPS_FAMILY: familyRoutePrompt,
  WORK_PURPOSE: workRoutePrompt,
  GENERAL_GUIDANCE: generalRoutePrompt,
  SAFETY_REVIEW: safetyRoutePrompt,
};

const allSaints = saintsData as Saint[];

// ─── Citation allowlist block (per-call, derived from chosen saints) ─────

const buildAllowlistBlock = (saints: ReadonlyArray<SaintMatch>): string => {
  const saintEntries = saints
    .map((m) => {
      const full = allSaints.find((s) => s.name === m.name);
      const id = full ? full.id : m.name.toLowerCase().replace(/[^a-z]+/g, "-");
      return `  - saint_id: "${id}", name: "${m.name}", feast_day: "${m.feast_day}"`;
    })
    .join("\n");

  return `ALLOWED CITATIONS for this plan (use ONLY these):
- catechism: paragraph in [1, 2865]; provide a short label.
- scripture: book from the Catholic canon (e.g. Psalms, Matthew, Romans, Tobit, Wisdom). Verse may be a single number or a range like "16-22"; provide chapter as integer; provide a short label.
- saint_writing: must reference one of the saints below by saint_id; title is the work being cited; provide a short label.
- liturgy: source must be exactly "liturgy_of_the_hours" or "roman_missal".

Saints available for saint_writing citations:
${saintEntries}

If you cannot ground a prompt body in a real source from this allowlist, replace the prompt with one you can ground.`;
};

// ─── SAFETY_REVIEW path: never call the LLM ──────────────────────────────

const buildSafetyReviewPlan = (
  user_text: string,
  saints: ReadonlyArray<SaintMatch>,
  resources: ReadonlyArray<CrisisResource>,
): DevotionPlanV2 => {
  const summary = `Devotional reflection summary: ${user_text.slice(0, 180)}${
    user_text.length > 180 ? "..." : ""
  }`;

  const resourceLines = resources
    .slice(0, 4)
    .map((r) => `  • ${r.name}: ${r.contact} (${r.hours})`)
    .join("\n");

  const psalm34Citation: Citation = {
    kind: "scripture",
    book: "Psalms",
    chapter: 34,
    verse: "18",
    label: "The Lord is close to the brokenhearted.",
  };

  const day: PlanDay = {
    day_index: 0,
    theme: "Your safety first",
    liturgical_note: null,
    prompts: [
      {
        type: "practice",
        title: "Reach out now",
        body:
          "What you have shared is serious. Please contact one of these supports today, in addition to anyone you trust:\n" +
          resourceLines +
          "\nThis app is a devotional companion, not a substitute for medical, mental-health, or emergency care. Pastoral support from a trusted priest or parish minister can complement, but does not replace, qualified human help.",
        estimated_minutes: 10,
        citations: [psalm34Citation],
      },
      {
        type: "prayer",
        title: "A short prayer of protection",
        body:
          "Lord Jesus, you are close to the brokenhearted and you save those whose spirit is crushed. Stay near to me now. Send me people who can help me carry this. Guard my mind and my body until the morning. Amen.",
        estimated_minutes: 3,
        citations: [psalm34Citation],
      },
    ],
  };

  return devotionPlanV2Schema.parse({
    primary_route: "SAFETY_REVIEW" as const,
    situation_summary: summary,
    saint_matches: saints.slice(0, 3).length > 0 ? saints.slice(0, 3) : [
      // Schema requires ≥1 saint_match; provide a generic one if upstream sent none.
      {
        name: "St. Michael the Archangel",
        reason: "Invoked for spiritual protection in moments of grave danger.",
        themes: ["protection", "fortitude"],
        feast_day: "September 29",
        prayer_reference: "Pray the St. Michael Prayer for protection.",
      },
    ],
    total_days: 5,
    days: [day, ...buildPlaceholderDays(day, 5)],
    safety_note:
      "If you are in immediate danger, contact local emergency services now. The resources above are available 24/7 in most regions.",
    content_label: "devotional_reflection" as const,
    teaching_authority_note: TEACHING_AUTHORITY_NOTE,
    pastoral_escalation: {
      should_escalate: true,
      suggestions: [
        "Call or text 988 (US) or your country's local crisis line listed above.",
        "Tell one trusted person what you are experiencing today.",
        "If risk is immediate, contact local emergency services first.",
      ],
    },
    sources_used: ["crisis_resources_directory", "psalms_34"],
  });
};

// SAFETY_REVIEW response is shaped as a 5-day plan to satisfy the schema
// (`total_days >= 5`). Days 1..4 are gentle re-orientations to the same
// resources rather than novel content; the contract is that the user is
// urged to seek qualified help on every day. This avoids any path where
// the schema fails and the client has no renderable response.
const buildPlaceholderDays = (template: PlanDay, total: number): PlanDay[] => {
  const days: PlanDay[] = [];
  for (let i = 1; i < total; i += 1) {
    days.push({
      day_index: i,
      theme: "Continue caring for yourself",
      liturgical_note: null,
      prompts: [
        {
          type: "practice",
          title: "Stay connected to support",
          body:
            "Check in again with one of the supports listed on day 1. Your situation matters and you are not alone. " +
            "If anything has changed for the worse, contact emergency services or a crisis line right away.",
          estimated_minutes: 5,
          citations: template.prompts[0].citations,
        },
        {
          type: "prayer",
          title: "A breath of trust",
          body:
            "Lord, I am here again. You see me. Stay close. Bring me one person who can listen today. Keep me safe. Amen.",
          estimated_minutes: 2,
          citations: template.prompts[0].citations,
        },
      ],
    });
  }
  return days;
};

// ─── Main builder ─────────────────────────────────────────────────────────

export interface BuildPlanContext {
  user_id?: string | null;
  /** ISO locale for crisis-resource selection, e.g. "en-US". */
  locale?: string | null;
  /** Set true in tests to skip the live LLM call. */
  skipLLM?: boolean;
}

export const buildPlan = async (
  route: RouteLabel,
  user_text: string,
  saints: SaintMatch[],
  ctx: BuildPlanContext = {},
): Promise<DevotionPlanV2> => {
  const parsed = generatePlanInputSchema.parse({ route, user_text, saints });

  // SAFETY_REVIEW never reaches the LLM.
  if (parsed.route === "SAFETY_REVIEW") {
    const resources = crisisResourcesForLocale(ctx.locale);
    return buildSafetyReviewPlan(parsed.user_text, parsed.saints, resources);
  }

  if (ctx.skipLLM) {
    // Used by integration tests that don't want the live API. Returns a
    // minimal valid plan grounded in Psalm 23 + the first ranked saint.
    return buildOfflineFallback(parsed.route, parsed.user_text, parsed.saints);
  }

  const liturgical = await getTodayLiturgicalContext().catch(() => null);

  // System: base prompt + route prompt + allowlist block. Mark allowlist
  // ephemeral-cacheable since saint sets repeat across users for popular
  // routes; base + route are also stable so caching cumulatively is fine.
  const allowlist = buildAllowlistBlock(parsed.saints);
  const liturgicalBlock = liturgical
    ? `Today is ${liturgical.date}: ${liturgical.celebration} (${liturgical.rank}). If a celebrated saint is in the saints list above, weave one brief reference to them.`
    : "Liturgical context unavailable for today; proceed without a liturgical reference.";

  const systemBlocks = [
    baseSystemPrompt,
    ROUTE_TO_PROMPT[parsed.route],
    `${allowlist}\n\n${liturgicalBlock}\n\nReturn JSON matching the DevotionPlanV2 schema: { primary_route, situation_summary, saint_matches, total_days (5..7), days[], safety_note (null on this route), content_label: "devotional_reflection", teaching_authority_note, pastoral_escalation: { should_escalate: false, suggestions: [] }, sources_used: [...] }. Each day has { day_index, theme, liturgical_note, prompts[] } where each prompt has { type, title, body, estimated_minutes, citations[] (≥1) }. Use day_index 0..N-1.`,
  ];

  // Provide the user_text plus the saint slate (the LLM needs to know which
  // saints were chosen so it can speak about them in the plan).
  const userPayload = [
    `Route: ${parsed.route}`,
    `Situation:`,
    parsed.user_text,
    ``,
    `Saints chosen for this plan:`,
    ...parsed.saints.map((s) => `- ${s.name} (feast ${s.feast_day}): ${s.reason}`),
  ].join("\n");

  // First attempt: schema-validated call. callJSON handles its own retries
  // for *schema* failure; we layer an additional outer retry below for
  // *guardrails*/citation-allowlist failures (which are post-schema).
  let plan: DevotionPlanV2;
  try {
    const result = await callJSON<DevotionPlanV2>({
      model: getModels().plan,
      systemBlocks,
      user: userPayload,
      schema: devotionPlanV2Schema,
      retries: 2,
      maxTokens: 4096,
      purpose: "plan",
      userId: ctx.user_id ?? null,
    });
    plan = result.data;
  } catch (err) {
    logger.error("plan_generation_schema_failure", {
      error: err instanceof Error ? err.message : String(err),
      route: parsed.route,
    });
    return planGenerationFallback(parsed.route, parsed.user_text, parsed.saints, "schema_invalid", ctx);
  }

  // Two-stage post-validation: banlist + citation allowlist.
  try {
    assertGuardrails(JSON.stringify(plan));
  } catch (err) {
    recordSafetyEvent({
      user_id: ctx.user_id ?? null,
      trigger: "output_banlist",
      severity: "warn",
      route_at_trigger: parsed.route,
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
    return planGenerationFallback(parsed.route, parsed.user_text, parsed.saints, "banlist_hit", ctx);
  }

  try {
    assertAllCitationsValid(plan.days.flatMap((d) => d.prompts).flatMap((p) => p.citations));
  } catch (err) {
    if (err instanceof CitationRejectedError) {
      recordSafetyEvent({
        user_id: ctx.user_id ?? null,
        trigger: "citation_rejected",
        severity: "warn",
        route_at_trigger: parsed.route,
        detail: { reason: err.reason, citation: err.citation },
      });
    }
    return planGenerationFallback(parsed.route, parsed.user_text, parsed.saints, "citation_rejected", ctx);
  }

  return plan;
};

// ─── Fallbacks (always return a renderable, schema-valid plan) ───────────

const planGenerationFallback = (
  route: RouteLabel,
  user_text: string,
  saints: ReadonlyArray<SaintMatch>,
  reason: string,
  ctx: BuildPlanContext,
): DevotionPlanV2 => {
  logger.warn("plan_generation_fallback", { route, reason });
  if (route === "SAFETY_REVIEW") {
    return buildSafetyReviewPlan(user_text, saints, crisisResourcesForLocale(ctx.locale));
  }
  return buildOfflineFallback(route, user_text, saints);
};

const buildOfflineFallback = (
  route: RouteLabel,
  user_text: string,
  saints: ReadonlyArray<SaintMatch>,
): DevotionPlanV2 => {
  const summary = `Devotional reflection summary: ${user_text.slice(0, 180)}${
    user_text.length > 180 ? "..." : ""
  }`;
  const psalm23: Citation = {
    kind: "scripture",
    book: "Psalms",
    chapter: 23,
    verse: "1-6",
    label: "The Lord is my shepherd.",
  };
  const days: PlanDay[] = [];
  for (let i = 0; i < 5; i += 1) {
    days.push({
      day_index: i,
      theme: i === 0 ? "Begin in trust" : `Day ${i + 1}: stay with the same passage`,
      liturgical_note: null,
      prompts: [
        {
          type: "reflection",
          title: i === 0 ? "Read slowly" : "Read again",
          body:
            "Read Psalm 23 slowly today, then sit with one verse that catches your attention. " +
            "This devotional content is a fallback — the live plan generator was unavailable. " +
            "It is offered as a safe, source-grounded reflection until the connection is restored.",
          estimated_minutes: 5,
          citations: [psalm23],
        },
        {
          type: "prayer",
          title: "A short trust",
          body: "Lord, you are my shepherd. Lead me through today, even when I cannot see the way. Amen.",
          estimated_minutes: 2,
          citations: [psalm23],
        },
      ],
    });
  }

  return devotionPlanV2Schema.parse({
    primary_route: route,
    situation_summary: summary,
    saint_matches: saints.slice(0, 3),
    total_days: 5,
    days,
    safety_note: null,
    content_label: "devotional_reflection" as const,
    teaching_authority_note: TEACHING_AUTHORITY_NOTE,
    pastoral_escalation: { should_escalate: false, suggestions: [] },
    sources_used: ["psalm_23_fallback"],
  });
};

// HTTP handler — kept in legacy shape until App Router migration.
export default async function handler(
  req: {
    body: {
      route: RouteLabel;
      user_text: string;
      saints: SaintMatch[];
      user_id?: string | null;
      locale?: string | null;
    };
  },
  res: { status: (code: number) => { json: (payload: DevotionPlanV2 | { error: string }) => void } },
): Promise<void> {
  try {
    const plan = await buildPlan(req.body.route, req.body.user_text, req.body.saints, {
      user_id: req.body.user_id ?? null,
      locale: req.body.locale ?? null,
    });
    res.status(200).json(plan);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "plan generation failed" });
  }
}
