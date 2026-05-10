// Tiny structured logger. Avoids a runtime dependency until pino is wired in
// Phase 0 of the launch plan. Redacts the most sensitive fields by default.

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACTED_KEYS: ReadonlyArray<string> = [
  "user_text",
  "journal_body",
  "body",
  "email",
  "phone",
  "name",
  "full_name",
  "given_name",
  "family_name",
  "address",
  "location",
  "ip",
  "ip_address",
  "id_token",
  "refresh_token",
  "access_token",
  "anthropic_api_key",
];

const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 6) return "[depth-limit]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.includes(k.toLowerCase())) {
        out[k] = "[redacted]";
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
};

const minLevel = (): LogLevel => {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return (["debug", "info", "warn", "error"] as const).includes(raw as LogLevel)
    ? (raw as LogLevel)
    : "info";
};

const emit = (level: LogLevel, message: string, fields?: Record<string, unknown>): void => {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel()]) return;
  const record = {
    level,
    time: new Date().toISOString(),
    message,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  };
  // Single-line JSON keeps logs greppable and ingestible by any log shipper.
  const line = JSON.stringify(record);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};

export const __redactForTest = redact;
