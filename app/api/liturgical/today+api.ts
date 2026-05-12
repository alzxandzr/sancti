import handler from "../../../server/handlers/liturgical";
import { runNextHandler } from "../../../server/lib/next-adapter";

export async function GET(request: Request): Promise<Response> {
  return runNextHandler(handler, request);
}
