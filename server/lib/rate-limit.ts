// Per-IP token bucket for the expensive (Gemini-backed) routes. In-memory,
// so it resets on serverless cold start — fine as a basic abuse shield; an
// Upstash Redis bucket is the upgrade path.

const BUCKET_CAPACITY = 8;
const REFILL_INTERVAL_MS = 60_000;
const REFILL_AMOUNT = 8;

interface Bucket {
  tokens: number;
  last_refill_ms: number;
}

const buckets = new Map<string, Bucket>();

export const takeToken = (ip: string): { ok: boolean; retry_in_ms: number } => {
  const now = Date.now();
  const bucket = buckets.get(ip) ?? { tokens: BUCKET_CAPACITY, last_refill_ms: now };
  const elapsed = now - bucket.last_refill_ms;
  if (elapsed > 0) {
    const refill = (elapsed / REFILL_INTERVAL_MS) * REFILL_AMOUNT;
    bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + refill);
    bucket.last_refill_ms = now;
  }
  if (bucket.tokens < 1) {
    const needed = 1 - bucket.tokens;
    const retry_in_ms = Math.ceil((needed / REFILL_AMOUNT) * REFILL_INTERVAL_MS);
    buckets.set(ip, bucket);
    return { ok: false, retry_in_ms };
  }
  bucket.tokens -= 1;
  buckets.set(ip, bucket);
  return { ok: true, retry_in_ms: 0 };
};

export const ipFromRequest = (request: Request): string => {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
};

export const rateLimit = (request: Request): Response | null => {
  const ip = ipFromRequest(request);
  const result = takeToken(ip);
  if (result.ok) return null;
  const retrySec = Math.ceil(result.retry_in_ms / 1000);
  return Response.json(
    {
      error: "Too many requests. Please wait a moment and try again.",
      retry_after_seconds: retrySec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retrySec) },
    },
  );
};
