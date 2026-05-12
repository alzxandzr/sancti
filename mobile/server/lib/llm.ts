import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { loadServerEnv } from "./env";
import { logger } from "./logger";
import { sanitizeUserText } from "./validator";

// ─── Client + model selection (lazy-initialized) ─────────────────────────
// Lazy-init keeps the module importable in unit tests that never reach
// `callJSON` (e.g., when only schemas / pure helpers are exercised). Tests
// that DO need the client can call `__setLlmForTest` to inject a stub.

export interface LlmClient {
  models: {
    generateContent: (params: {
      model: string;
      contents: Array<{ role: "user"; parts: Array<{ text: string }> }>;
      config: {
        systemInstruction: { parts: Array<{ text: string }> };
        responseMimeType: "application/json";
        maxOutputTokens: number;
        thinkingConfig?: { thinkingBudget: number };
      };
    }) => Promise<GeminiResponse>;
  };
}

interface GeminiResponse {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}

interface ModelMap {
  classify: string;
  safety: string;
  plan: string;
  planFallback: string;
}

let cachedClient: LlmClient | null = null;
let cachedModels: ModelMap | null = null;

export const getLlmClient = (): LlmClient => {
  if (cachedClient) return cachedClient;
  const env = loadServerEnv();
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Classification and plan routes skip the LLM when no key is set.",
    );
  }
  cachedClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) as unknown as LlmClient;
  cachedModels = {
    classify: env.GEMINI_MODEL_CLASSIFY,
    safety: env.GEMINI_MODEL_SAFETY,
    plan: env.GEMINI_MODEL_PLAN,
    planFallback: env.GEMINI_MODEL_PLAN_FALLBACK,
  };
  return cachedClient;
};

export const getModels = (): ModelMap => {
  if (cachedModels) return cachedModels;
  getLlmClient();
  return cachedModels!;
};

// Test seam: inject a fake client + model map. Reset by passing nulls.
export const __setLlmForTest = (
  client: LlmClient | null,
  models?: ModelMap | null,
): void => {
  cachedClient = client;
  cachedModels = models ?? null;
};

// ─── Usage tracking ──────────────────────────────────────────────────────
// Normalized shape so the cost script and observers stay model-agnostic.
// `cache_creation_input_tokens` is always 0 for Gemini (explicit cached
// content is a separate API we don't currently use); `cache_read_input_tokens`
// reflects `cachedContentTokenCount` when the request hits a cache.

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

const usageFrom = (u: GeminiResponse["usageMetadata"]): LLMUsage => {
  if (!u) return { ...ZERO_USAGE };
  const cached = u.cachedContentTokenCount ?? 0;
  const totalPrompt = u.promptTokenCount ?? 0;
  // Gemini's promptTokenCount INCLUDES cachedContentTokenCount. Split them so
  // input_tokens captures the non-cached portion (consistent with the
  // smoke-script cost model that prices cached reads separately).
  return {
    input_tokens: Math.max(0, totalPrompt - cached),
    output_tokens: u.candidatesTokenCount ?? 0,
    cache_read_input_tokens: cached,
    cache_creation_input_tokens: 0,
  };
};

// ─── Usage observer (out-of-band cost tracking) ──────────────────────────
// Production code never subscribes; the live smoke script subscribes once,
// accumulates by model, and prints a cost summary. Subscribers receive the
// CUMULATIVE usage for a single callJSON call (already aggregated across
// any internal retries).

export interface UsageObservation {
  purpose: string;
  model: string;
  usage: LLMUsage;
  latency_ms: number;
  retries_used: number;
}

type UsageObserver = (obs: UsageObservation) => void;
const usageObservers = new Set<UsageObserver>();

export const addUsageObserver = (fn: UsageObserver): void => {
  usageObservers.add(fn);
};

export const removeUsageObserver = (fn: UsageObserver): void => {
  usageObservers.delete(fn);
};

const notifyUsageObservers = (obs: UsageObservation): void => {
  for (const fn of usageObservers) {
    try {
      fn(obs);
    } catch {
      // Observers must never break the pipeline.
    }
  }
};

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

const responseText = (response: GeminiResponse): string | null => {
  if (typeof response.text === "string") return response.text;
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  return text.length > 0 ? text : null;
};

// ─── callJSON: structured Gemini call with retries + Zod ─────────────────

export interface CallJSONOptions<T> {
  /** Model ID, e.g. `MODELS.classify`. */
  model: string;
  /**
   * System blocks joined into Gemini's `systemInstruction`. Put the largest
   * stable content (base prompt + saints corpus) last by convention; if we
   * later wire up Gemini's explicit cached_content, that's the chunk we'd
   * promote.
   */
  systemBlocks: string[];
  /** Untrusted user input. Will be sanitized + wrapped in <user_text>. */
  user: string;
  /** Zod schema validating the parsed JSON. */
  schema: z.ZodType<T>;
  /** Number of corrective retries after the first attempt. Default 2. */
  retries?: number;
  /** Output cap. Default 2048. */
  maxTokens?: number;
  /** Logging label (e.g. "classify", "safety", "plan"). */
  purpose: string;
  /** Optional user id for log correlation; redact via lib/logger. */
  userId?: string | null;
  /** When primary model returns 429/RESOURCE_EXHAUSTED, retry once with this
   *  model. Useful for plan generation where flash-lite has separate quota. */
  fallbackModel?: string;
}

const isQuotaError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|"code"\s*:\s*429|quota/i.test(msg);
};

export interface CallJSONResult<T> {
  data: T;
  usage: LLMUsage;
  model: string;
  latency_ms: number;
  retries_used: number;
}

export const callJSON = async <T>(opts: CallJSONOptions<T>): Promise<CallJSONResult<T>> => {
  const retries = opts.retries ?? 2;
  const maxTokens = opts.maxTokens ?? 2048;

  const baseSystemParts = opts.systemBlocks.map((text) => ({ text }));

  const sanitizedUser = sanitizeUserText(opts.user);
  const wrappedUser = `<user_text>\n${sanitizedUser}\n</user_text>`;

  const client = getLlmClient();
  const t0 = Date.now();
  let cumulativeUsage: LLMUsage = { ...ZERO_USAGE };
  let lastError: string | null = null;
  let activeModel = opts.model;
  let fallbackUsed = false;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const correctiveParts =
      lastError !== null
        ? [
            {
              text:
                `Your previous response failed validation: ${lastError}\n` +
                `Return JSON that matches the requested schema exactly. JSON only, no prose, no code fences.`,
            },
          ]
        : [];

    let response: GeminiResponse;
    try {
      response = await client.models.generateContent({
        model: activeModel,
        contents: [{ role: "user", parts: [{ text: wrappedUser }] }],
        config: {
          systemInstruction: { parts: [...baseSystemParts, ...correctiveParts] },
          responseMimeType: "application/json",
          maxOutputTokens: maxTokens,
          // Disable Gemini 2.5's default "thinking" mode for structured-JSON
          // calls: thinking tokens consume maxOutputTokens before the model
          // emits any candidate text, which truncates the JSON. We don't need
          // chain-of-thought for our schema-validated calls.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("llm_call_error", {
        purpose: opts.purpose,
        model: activeModel,
        attempt,
        error: message,
      });
      // Quota-exhaustion fallback: if primary model is rate-limited and a
      // fallback was provided, switch and retry on the next loop iteration.
      if (!fallbackUsed && opts.fallbackModel && isQuotaError(err)) {
        fallbackUsed = true;
        activeModel = opts.fallbackModel;
        lastError = `primary model quota exhausted; retrying with ${opts.fallbackModel}`;
        logger.warn("llm_quota_fallback", {
          purpose: opts.purpose,
          from: opts.model,
          to: opts.fallbackModel,
        });
        continue;
      }
      throw err;
    }

    cumulativeUsage = addUsage(cumulativeUsage, usageFrom(response.usageMetadata));

    const text = responseText(response);
    if (text === null) {
      lastError = "no text content returned";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = extractJson(text);
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
      model: activeModel,
      latency_ms,
      retries_used: attempt,
      ok: true,
      usage: cumulativeUsage,
      user_id: opts.userId ?? null,
    });

    notifyUsageObservers({
      purpose: opts.purpose,
      model: activeModel,
      usage: cumulativeUsage,
      latency_ms,
      retries_used: attempt,
    });

    return {
      data: validated.data,
      usage: cumulativeUsage,
      model: activeModel,
      latency_ms,
      retries_used: attempt,
    };
  }

  const latency_ms = Date.now() - t0;
  logger.error("llm_call_failed", {
    purpose: opts.purpose,
    model: activeModel,
    latency_ms,
    retries_used: retries,
    last_error: lastError,
    usage: cumulativeUsage,
  });
  throw new Error(`LLM call failed after ${retries} retries: ${lastError}`);
};
