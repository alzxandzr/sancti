import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { loadServerEnv } from "./env";
import { logger } from "./logger";
import { sanitizeUserText } from "./validator";

// ─── Client + model selection (lazy-initialized) ─────────────────────────
// Lazy-init keeps the module importable in unit tests that never reach
// `callJSON` (e.g., when only schemas / pure helpers are exercised). Tests
// that DO need the client can call `setAnthropicClient` to inject a stub.

let cachedClient: Anthropic | null = null;
let cachedModels: { classify: string; safety: string; plan: string } | null = null;

export const getAnthropicClient = (): Anthropic => {
  if (cachedClient) return cachedClient;
  const env = loadServerEnv();
  cachedClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  cachedModels = {
    classify: env.ANTHROPIC_MODEL_CLASSIFY,
    safety: env.ANTHROPIC_MODEL_SAFETY,
    plan: env.ANTHROPIC_MODEL_PLAN,
  };
  return cachedClient;
};

export const getModels = (): { classify: string; safety: string; plan: string } => {
  if (cachedModels) return cachedModels;
  getAnthropicClient();
  return cachedModels!;
};

// Test seam: inject a fake client + model map. Reset by passing nulls.
export const __setAnthropicForTest = (
  client: Anthropic | null,
  models?: { classify: string; safety: string; plan: string } | null,
): void => {
  cachedClient = client;
  cachedModels = models ?? null;
};

// Legacy export retained so any caller still importing it compiles. Prefer
// `getAnthropicClient()` + the typed helpers below.
export const getAnthropicClientConfig = (): { apiKey: string; model: string } => {
  const env = loadServerEnv();
  return { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL_PLAN };
};

// ─── Usage tracking ──────────────────────────────────────────────────────

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

const ZERO_USAGE: LLMUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const addUsage = (a: LLMUsage, b: LLMUsage): LLMUsage => ({
  input_tokens: a.input_tokens + b.input_tokens,
  output_tokens: a.output_tokens + b.output_tokens,
  cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
  cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
});

const usageFrom = (u: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): LLMUsage => ({
  input_tokens: u.input_tokens ?? 0,
  output_tokens: u.output_tokens ?? 0,
  cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
  cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
});

// ─── JSON extraction (lenient against light prose wrapping) ──────────────

const extractJson = (text: string): unknown => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/m);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      /* fall through */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  throw new Error("Model output did not contain parseable JSON.");
};

// ─── callJSON: structured Claude call with caching + retries + Zod ───────

export interface CallJSONOptions<T> {
  /** Model ID, e.g. `MODELS.classify`. */
  model: string;
  /**
   * System blocks. Each becomes a TextBlockParam. When `cacheable` is true,
   * the LAST block is marked `cache_control: ephemeral` — by convention put
   * the largest stable content (base prompt + saints corpus) there to maximize
   * cache reuse across calls.
   */
  systemBlocks: string[];
  /** Untrusted user input. Will be sanitized + wrapped in <user_text>. */
  user: string;
  /** Zod schema validating the parsed JSON. */
  schema: z.ZodType<T>;
  /** Number of corrective retries after the first attempt. Default 2. */
  retries?: number;
  /** Whether to mark the last system block ephemeral-cacheable. Default true. */
  cacheable?: boolean;
  /** Output cap. Default 2048. */
  maxTokens?: number;
  /** Logging label (e.g. "classify", "safety", "plan"). */
  purpose: string;
  /** Optional user id for log correlation; redact via lib/logger. */
  userId?: string | null;
}

export interface CallJSONResult<T> {
  data: T;
  usage: LLMUsage;
  model: string;
  latency_ms: number;
  retries_used: number;
}

export const callJSON = async <T>(opts: CallJSONOptions<T>): Promise<CallJSONResult<T>> => {
  const retries = opts.retries ?? 2;
  const cacheable = opts.cacheable ?? true;
  const maxTokens = opts.maxTokens ?? 2048;

  const baseSystem = opts.systemBlocks.map((text, i) => {
    const block: { type: "text"; text: string; cache_control?: { type: "ephemeral" } } = {
      type: "text",
      text,
    };
    if (cacheable && i === opts.systemBlocks.length - 1) {
      block.cache_control = { type: "ephemeral" };
    }
    return block;
  });

  const sanitizedUser = sanitizeUserText(opts.user);
  const wrappedUser = `<user_text>\n${sanitizedUser}\n</user_text>`;

  const client = getAnthropicClient();
  const t0 = Date.now();
  let cumulativeUsage: LLMUsage = { ...ZERO_USAGE };
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const correctiveBlocks =
      lastError !== null
        ? [
            {
              type: "text" as const,
              text:
                `Your previous response failed validation: ${lastError}\n` +
                `Return JSON that matches the requested schema exactly. JSON only, no prose, no code fences.`,
            },
          ]
        : [];

    let response;
    try {
      response = await client.messages.create({
        model: opts.model,
        max_tokens: maxTokens,
        system: [...baseSystem, ...correctiveBlocks],
        messages: [{ role: "user", content: wrappedUser }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("llm_call_error", {
        purpose: opts.purpose,
        model: opts.model,
        attempt,
        error: message,
      });
      throw err;
    }

    cumulativeUsage = addUsage(cumulativeUsage, usageFrom(response.usage));

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
    );
    if (!textBlock || typeof textBlock.text !== "string") {
      lastError = "no text content block returned";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }

    const validated = opts.schema.safeParse(parsed);
    if (!validated.success) {
      lastError = validated.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      continue;
    }

    const latency_ms = Date.now() - t0;
    logger.info("llm_call", {
      purpose: opts.purpose,
      model: opts.model,
      latency_ms,
      retries_used: attempt,
      ok: true,
      usage: cumulativeUsage,
      user_id: opts.userId ?? null,
    });

    return {
      data: validated.data,
      usage: cumulativeUsage,
      model: opts.model,
      latency_ms,
      retries_used: attempt,
    };
  }

  const latency_ms = Date.now() - t0;
  logger.error("llm_call_failed", {
    purpose: opts.purpose,
    model: opts.model,
    latency_ms,
    retries_used: retries,
    last_error: lastError,
    usage: cumulativeUsage,
  });
  throw new Error(`LLM call failed after ${retries} retries: ${lastError}`);
};

// Legacy text-output helper. New code should use callJSON.
export const generateDevotionalText = async (prompt: string): Promise<string> => {
  if (!prompt.trim()) throw new Error("Prompt is required.");
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: getModels().plan,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find(
    (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
  );
  return textBlock?.text ?? "";
};
