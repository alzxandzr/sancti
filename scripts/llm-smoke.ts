// Live cost-and-quality smoke for the LLM pipeline.
// Run manually before every prompt change:
//   ANTHROPIC_API_KEY=... npx tsx scripts/llm-smoke.ts
// Skipped automatically in CI when the secret is absent.
//
// Reports per-fixture: route, total_days, prompts, citations, latency,
// observed cost in USD, and whether the safety path short-circuited (no
// LLM call). Cost uses rough current public pricing — confirm at
// https://anthropic.com/pricing before quoting numbers externally.

import { classifyInput } from "../api/classify";
import { matchSaints } from "../api/match-saints";
import { buildPlan } from "../api/generate-plan";
import {
  addUsageObserver,
  getModels,
  removeUsageObserver,
  type LLMUsage,
  type UsageObservation,
} from "../lib/anthropic";

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
  "claude-haiku-4-5-20251001": { input: 1, cached_read: 0.1, cached_write: 1.25, output: 5 },
  "claude-sonnet-4-6": { input: 3, cached_read: 0.3, cached_write: 3.75, output: 15 },
};

const cost = (model: string, usage: LLMUsage): number => {
  const p = PRICING[model] ?? { input: 3, cached_read: 0.3, cached_write: 3.75, output: 15 };
  return (
    (usage.input_tokens * p.input +
      usage.cache_read_input_tokens * p.cached_read +
      usage.cache_creation_input_tokens * p.cached_write +
      usage.output_tokens * p.output) /
    1_000_000
  );
};

const addUsage = (a: LLMUsage, b: LLMUsage): LLMUsage => ({
  input_tokens: a.input_tokens + b.input_tokens,
  output_tokens: a.output_tokens + b.output_tokens,
  cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
  cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
});

const ZERO_USAGE: LLMUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const main = async (): Promise<void> => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set; refusing to run live smoke.");
    process.exit(1);
  }

  const models = getModels();
  console.log("Models:", JSON.stringify(models));
  console.log(`Running ${FIXTURES.length} fixtures...\n`);

  const usageByModel = new Map<string, LLMUsage>();
  let fixtureUsage: LLMUsage = { ...ZERO_USAGE };
  let fixtureCallCount = 0;

  const observer = (obs: UsageObservation): void => {
    fixtureCallCount += 1;
    fixtureUsage = addUsage(fixtureUsage, obs.usage);
    const prev = usageByModel.get(obs.model) ?? { ...ZERO_USAGE };
    usageByModel.set(obs.model, addUsage(prev, obs.usage));
  };
  addUsageObserver(observer);

  let total = 0;

  try {
    for (const fx of FIXTURES) {
      fixtureUsage = { ...ZERO_USAGE };
      fixtureCallCount = 0;
      const t0 = Date.now();
      const classified = await classifyInput(fx.user_text);
      const matched = await matchSaints(
        classified.classification.primary_route,
        classified.classification.themes,
      );
      const plan = await buildPlan(classified.classification.primary_route, fx.user_text, matched, {
        locale: "en-US",
      });
      const latency = Date.now() - t0;
      const promptCount = plan.days.reduce((n, d) => n + d.prompts.length, 0);
      const citationCount = plan.days.reduce(
        (n, d) => n + d.prompts.reduce((m, p) => m + p.citations.length, 0),
        0,
      );

      // Cost for this fixture: re-price the cumulative usage at the dominant
      // model. For mixed-model fixtures (classify+safety on Haiku, plan on
      // Sonnet), this slight overestimate is acceptable for budgeting.
      // The per-model breakdown at the end gives the exact picture.
      const fixtureCost = cost(plan.primary_route === "SAFETY_REVIEW" ? models.safety : models.plan, fixtureUsage);
      total += fixtureCost;

      const note = classified.short_circuited ? " [no LLM call]" : "";
      console.log(
        `[${fx.label}] route=${plan.primary_route} days=${plan.total_days} prompts=${promptCount} citations=${citationCount} latency=${latency}ms calls=${fixtureCallCount} cost=$${fixtureCost.toFixed(4)}${note}`,
      );
      console.log(
        `  short_circuited=${classified.short_circuited} used_fallback=${classified.used_fallback} safety=${classified.safety.severity} usage=${JSON.stringify(fixtureUsage)}`,
      );
    }
  } finally {
    removeUsageObserver(observer);
  }

  console.log(`\nPer-model breakdown:`);
  let exactTotal = 0;
  for (const [model, usage] of usageByModel) {
    const c = cost(model, usage);
    exactTotal += c;
    const cacheReadRatio =
      usage.input_tokens + usage.cache_read_input_tokens > 0
        ? usage.cache_read_input_tokens / (usage.input_tokens + usage.cache_read_input_tokens)
        : 0;
    console.log(
      `  ${model}: input=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens} cache_write=${usage.cache_creation_input_tokens} output=${usage.output_tokens} cost=$${c.toFixed(4)} cache_read_ratio=${cacheReadRatio.toFixed(2)}`,
    );
  }
  console.log(`\nTotal estimated cost (exact, by model): $${exactTotal.toFixed(4)}`);
  console.log(`Total estimated cost (rough per-fixture): $${total.toFixed(4)}`);
  console.log(`Note: per-call usage is logged via lib/logger as 'llm_call' lines for further analysis.`);
};

main().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
