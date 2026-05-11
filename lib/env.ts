import { z } from "zod";

/** Treat unset/whitespace-only vars as missing so `.env` placeholders can be left blank. */
const emptyToUndefined = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Server-side env: never bundle into the mobile binary.
const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  GEMINI_MODEL_CLASSIFY: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_SAFETY: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_PLAN: z.string().default("gemini-2.5-flash"),
  /** Used when the primary plan model returns 429/RESOURCE_EXHAUSTED.
   *  flash-lite has a separate quota bucket on the free tier. */
  GEMINI_MODEL_PLAN_FALLBACK: z.string().default("gemini-2.5-flash-lite"),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  LITCAL_API_BASE: z.string().url().default("https://litcal.johnromanodorazio.com/api/dev/"),
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Client-side env: safe to ship in the Expo bundle.
const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  EXPO_PUBLIC_API_BASE_URL: z.string().url(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  EXPO_PUBLIC_POSTHOG_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

type EnvRecord = Record<string, string | undefined>;

/** True when a real Gemini key is present (routes should call the LLM). */
export const isLlmConfigured = (source: EnvRecord = process.env): boolean => {
  const key = source.GEMINI_API_KEY;
  return typeof key === "string" && key.trim().length >= 20;
};

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

export const loadServerEnv = (source: EnvRecord = process.env): ServerEnv => {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Server env invalid: ${formatIssues(parsed.error)}`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
};

export const loadPublicEnv = (source: EnvRecord = process.env): PublicEnv => {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }
  const parsed = publicEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Public env invalid: ${formatIssues(parsed.error)}`);
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
};

// Test hook only — never call from production code.
export const __resetEnvCache = (): void => {
  cachedServerEnv = null;
  cachedPublicEnv = null;
};
