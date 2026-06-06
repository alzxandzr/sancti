import handler from "../../server/handlers/classify";
import { runNextHandler } from "../../server/lib/next-adapter";
import { rateLimit } from "../../server/lib/rate-limit";

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimit(request);
  if (limited) return limited;
  return runNextHandler(handler, request);
}
