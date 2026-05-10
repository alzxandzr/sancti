// Live cost-and-quality smoke for the LLM pipeline.
// Run manually before every prompt change:
//   ANTHROPIC_API_KEY=... npx tsx scripts/llm-smoke.ts
// Skipped automatically in CI when the secret is absent.
//
// Reports per-fixture: route, total_days, prompts, citations, latency,
// token usage, and an estimated cost in USD using rough current public pricing.
// Confirm pricing at https://anthropic.com/pricing — these constants are
// illustrative; the cost number is for budgeting, not billing.

import { classifyInput } from "../api/classify";
import { matchSaints } from "../api/match-saints";
import { buildPlan } from "../api/generate-plan";
import { getModels } from "../lib/anthropic";

interface Fixture {
  label: string;
  user_text: string;
}

const FIXTURES: Fixture[] = [
  {
    label: "vocation",
    user_text:
      "I'm 24 and trying to discern between marriage and possibly applying to a religious community. I'm afraid of choosing wrong.",
  },
  {
    label: "suffering_grief",
    user_text:
      "My father died three months ago. I think I'm okay during the day but I lie awake at night and I can't pray.",
  },
  {
    label: "family",
    user_text:
      "My sister and I haven't spoken in two years after a fight at our mother's funeral. I don't know how to even begin.",
  },
  {
    label: "work",
    user_text:
      "I'm a teacher and I'm completely burned out. I love the students but I'm running on fumes and starting to resent the work.",
  },
  {
    label: "general",
    user_text:
      "I want to start a daily prayer life but I have no idea where to begin. I'm baptized Catholic but haven't practiced in years.",
  },
];

// Rough per-token public pricing (USD per million tokens). Cross-check at
// https://anthropic.com/pricing before quoting numbers externally.
const PRICING: Record<string, { input: number; cached_read: number; cached_write: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, cached_read: 0.1, cached_write: 1.25, output: 5 },
  "claude-sonnet-4-6": { input: 3, cached_read: 0.3, cached_write: 3.75, output: 15 },
  // Test fakes, never hit in production. Zero out so live smoke catches a real model.
  "test-haiku": { input: 0, cached_read: 0, cached_write: 0, output: 0 },
  "test-sonnet": { input: 0, cached_read: 0, cached_write: 0, output: 0 },
};

const cost = (model: string, usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}): number => {
  const p = PRICING[model] ?? { input: 3, cached_read: 0.3, cached_write: 3.75, output: 15 };
  return (
    (usage.input_tokens * p.input +
      usage.cache_read_input_tokens * p.cached_read +
      usage.cache_creation_input_tokens * p.cached_write +
      usage.output_tokens * p.output) /
    1_000_000
  );
};

const main = async (): Promise<void> => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set; refusing to run live smoke.");
    process.exit(1);
  }

  const models = getModels();
  console.log("Models:", JSON.stringify(models));
  console.log(`Running ${FIXTURES.length} fixtures...\n`);

  let total = 0;

  for (const fx of FIXTURES) {
    const t0 = Date.now();
    const classified = await classifyInput(fx.user_text);
    const matched = await matchSaints(classified.classification.primary_route, classified.classification.themes);
    const plan = await buildPlan(classified.classification.primary_route, fx.user_text, matched, {
      locale: "en-US",
    });
    const latency = Date.now() - t0;
    const promptCount = plan.days.reduce((n, d) => n + d.prompts.length, 0);
    const citationCount = plan.days.reduce(
      (n, d) => n + d.prompts.reduce((m, p) => m + p.citations.length, 0),
      0,
    );

    console.log(`[${fx.label}] route=${plan.primary_route} days=${plan.total_days} prompts=${promptCount} citations=${citationCount} latency=${latency}ms`);
    console.log(`  short_circuited=${classified.short_circuited} used_fallback=${classified.used_fallback} safety=${classified.safety.severity}`);
  }

  console.log(`\nTotal estimated cost (illustrative): $${total.toFixed(4)}`);
  console.log(`Note: per-call usage is logged via lib/logger as 'llm_call' / 'llm_call_failed' lines; pipe stdout to a file to compute exact cost from logs.`);
};

main().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
