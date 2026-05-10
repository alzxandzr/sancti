import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan } from "../api/generate-plan";
import { installFakeAnthropic, okJsonResponse, resetFakeAnthropic } from "./_helpers";
import type { DevotionPlanV2, SaintMatch } from "../types";

const sampleSaints: SaintMatch[] = [
  {
    name: "St. Ignatius of Loyola",
    reason: "Discernment companion.",
    themes: ["discernment", "prayer"],
    feast_day: "July 31",
    prayer_reference: "Pray the Suscipe.",
  },
  {
    name: "St. Thérèse of Lisieux",
    reason: "Little way of trust.",
    themes: ["trust", "little-way"],
    feast_day: "October 1",
    prayer_reference: "Pray a litany of trust.",
  },
];

const validPlan = (): DevotionPlanV2 => ({
  primary_route: "VOCATION_DISCERNMENT",
  situation_summary: "Devotional reflection summary: discerning a major decision.",
  saint_matches: sampleSaints,
  total_days: 5,
  days: Array.from({ length: 5 }, (_, i) => ({
    day_index: i,
    theme: `Day ${i + 1} theme`,
    liturgical_note: null,
    prompts: [
      {
        type: "reflection" as const,
        title: "Where is the freedom?",
        body:
          "Take ten quiet minutes today and notice where peace settles in your body when you imagine each path. " +
          "Is there freedom under the desire, or grasping?",
        estimated_minutes: 10,
        citations: [
          {
            kind: "scripture" as const,
            book: "1 Samuel",
            chapter: 3,
            verse: "1-10",
            label: "Speak Lord, your servant is listening.",
          },
        ],
      },
      {
        type: "prayer" as const,
        title: "Suscipe",
        body:
          "Take, Lord, and receive all my liberty, my memory, my understanding, and my entire will. " +
          "All I have and possess you have given me; I surrender it all to you.",
        estimated_minutes: 3,
        citations: [
          {
            kind: "saint_writing" as const,
            saint_id: "st-ignatius",
            title: "Spiritual Exercises",
            label: "Suscipe prayer",
          },
        ],
      },
    ],
  })),
  safety_note: null,
  content_label: "devotional_reflection",
  teaching_authority_note:
    "This content is devotional reflection only and is not official Church teaching.",
  pastoral_escalation: { should_escalate: false, suggestions: [] },
  sources_used: ["scripture", "ignatian_corpus"],
});

test("SAFETY_REVIEW route returns crisis-resources plan WITHOUT calling the LLM", async (t) => {
  const handle = installFakeAnthropic(() => okJsonResponse({}));
  t.after(resetFakeAnthropic);

  const plan = await buildPlan("SAFETY_REVIEW", "I am in a really dark place right now.", sampleSaints, {
    locale: "en-US",
  });

  assert.equal(plan.primary_route, "SAFETY_REVIEW");
  assert.equal(plan.pastoral_escalation.should_escalate, true);
  assert.ok(plan.safety_note && plan.safety_note.length > 0);
  // First day must reference crisis resources somehow.
  const day0Body = plan.days[0].prompts.map((p) => p.body).join("\n");
  assert.ok(day0Body.match(/988|crisis|emergency|trusted|samaritans|lifeline/i),
    "day 0 should surface crisis support");
  assert.equal(handle.callCount(), 0, "LLM never called for SAFETY_REVIEW");
});

test("skipLLM returns the offline Psalm-23 fallback for non-safety routes", async () => {
  const plan = await buildPlan("SUFFERING_HARDSHIP", "I'm grieving and tired.", sampleSaints, {
    skipLLM: true,
  });
  assert.equal(plan.primary_route, "SUFFERING_HARDSHIP");
  assert.equal(plan.total_days, 5);
  assert.equal(plan.days.length, 5);
  // Every prompt has at least one citation.
  for (const day of plan.days) {
    for (const prompt of day.prompts) {
      assert.ok(prompt.citations.length >= 1, "prompt missing citation");
    }
  }
});

test("valid LLM response passes both schema and post-validation", async (t) => {
  installFakeAnthropic(() => okJsonResponse(validPlan()));
  t.after(resetFakeAnthropic);

  const plan = await buildPlan(
    "VOCATION_DISCERNMENT",
    "Trying to discern between two career paths.",
    sampleSaints,
  );
  assert.equal(plan.primary_route, "VOCATION_DISCERNMENT");
  assert.equal(plan.total_days, 5);
  assert.equal(plan.days.length, 5);
});

test("plan with banlist phrase falls back to safe content", async (t) => {
  const tainted = validPlan();
  tainted.days[0].prompts[1].body =
    "I absolve you from all your sins. Take, Lord, and receive all my liberty.";
  installFakeAnthropic(() => okJsonResponse(tainted));
  t.after(resetFakeAnthropic);

  const plan = await buildPlan(
    "VOCATION_DISCERNMENT",
    "Trying to decide on a vocation.",
    sampleSaints,
  );
  // Fallback returns offline Psalm-23 plan.
  assert.equal(plan.sources_used[0], "psalm_23_fallback");
});

test("plan with fabricated catechism citation falls back", async (t) => {
  const tainted = validPlan();
  tainted.days[0].prompts[0].citations = [
    { kind: "catechism", paragraph: 9999, label: "fabricated" } as never,
  ];
  installFakeAnthropic(() => okJsonResponse(tainted));
  t.after(resetFakeAnthropic);

  const plan = await buildPlan(
    "VOCATION_DISCERNMENT",
    "Trying to decide on a vocation.",
    sampleSaints,
  );
  // Schema rejects 9999 (out of range), so callJSON itself retries; if all
  // retries fail we land in the fallback. Either path satisfies safety.
  assert.equal(plan.sources_used[0], "psalm_23_fallback");
});

test("plan with unknown saint_writing citation falls back", async (t) => {
  const tainted = validPlan();
  tainted.days[0].prompts[1].citations = [
    {
      kind: "saint_writing",
      saint_id: "st-doesnt-exist",
      title: "fabricated",
      label: "made up",
    },
  ];
  installFakeAnthropic(() => okJsonResponse(tainted));
  t.after(resetFakeAnthropic);

  const plan = await buildPlan(
    "VOCATION_DISCERNMENT",
    "Trying to decide on a vocation.",
    sampleSaints,
  );
  assert.equal(plan.sources_used[0], "psalm_23_fallback");
});
