import handler from "../../server/handlers/match-saints";
import { runNextHandler } from "../../server/lib/next-adapter";

export async function POST(request: Request): Promise<Response> {
  return runNextHandler(handler, request);
}
