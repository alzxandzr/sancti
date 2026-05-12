import handler from "../../../server/handlers/saint";
import { runNextHandler } from "../../../server/lib/next-adapter";

export async function GET(request: Request, { id }: { id: string }): Promise<Response> {
  return runNextHandler(handler, request, { id });
}
