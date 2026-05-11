import { NextResponse, type NextRequest } from "next/server";

// Allow the local Expo web bundle (Metro defaults to :8081) and the Next dev
// origin itself to call /api/* during local development. In production, the
// mobile app makes server-side requests and the web client is same-origin, so
// no CORS is needed there.
const DEV_ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:8081",
]);

const corsHeaders = (origin: string | null): Record<string, string> => {
  const allow = origin && DEV_ALLOWED_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

// ─── Rate limiting ────────────────────────────────────────────────────────
//
// Per-IP token bucket. Only applied to the expensive (Gemini-backed) routes.
// In-memory, so it resets on dev-server restart and doesn't survive across
// serverless cold starts in prod — that's fine for the immediate abuse-shield
// use case; an Upstash Redis backed bucket is the upgrade path.

const EXPENSIVE_ROUTES = new Set(["/api/classify", "/api/generate-plan"]);
const BUCKET_CAPACITY = 8; // burst allowance
const REFILL_INTERVAL_MS = 60_000; // 1 minute window
const REFILL_AMOUNT = 8; // tokens per interval (8/min sustained)

interface Bucket {
  tokens: number;
  last_refill_ms: number;
}

const buckets = new Map<string, Bucket>();

const takeToken = (ip: string): { ok: boolean; retry_in_ms: number } => {
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

const ipFrom = (req: NextRequest): string => {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
};

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const path = req.nextUrl.pathname;
  if (EXPENSIVE_ROUTES.has(path) && req.method === "POST") {
    const ip = ipFrom(req);
    const result = takeToken(ip);
    if (!result.ok) {
      const retrySec = Math.ceil(result.retry_in_ms / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests. Please wait a moment and try again.",
          retry_after_seconds: retrySec,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
            "Retry-After": String(retrySec),
          },
        },
      );
    }
  }

  const res = NextResponse.next();
  const headers = corsHeaders(origin);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
