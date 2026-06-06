// Bridges the existing Next-style `(req, res) => void` handler signature to
// Expo Router's Web-standard (Request) => Response API surface. Lets us reuse
// every handler under server/handlers/ without rewriting their bodies during
// the Next.js → Expo Router migration.

type NextStyleReq<Body> = { body: Body; query: Record<string, string | string[] | undefined> };
type NextStyleRes = {
  status: (code: number) => { json: (payload: unknown) => void };
};
type NextStyleHandler<Body> = (req: NextStyleReq<Body>, res: NextStyleRes) => Promise<void> | void;

export async function runNextHandler<Body = unknown>(
  handler: NextStyleHandler<Body>,
  request: Request,
  params: Record<string, string | string[] | undefined> = {},
): Promise<Response> {
  let body: Body = {} as Body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text) as Body;
      } catch {
        return Response.json({ error: "invalid JSON body" }, { status: 400 });
      }
    }
  }

  const url = new URL(request.url);
  const query: Record<string, string | string[] | undefined> = { ...params };
  for (const [k, v] of url.searchParams.entries()) {
    const existing = query[k];
    if (existing === undefined) query[k] = v;
    else if (Array.isArray(existing)) existing.push(v);
    else query[k] = [existing as string, v];
  }

  let status = 200;
  let payload: unknown = undefined;
  let resolved = false;

  const res: NextStyleRes = {
    status: (code: number) => ({
      json: (p: unknown) => {
        status = code;
        payload = p;
        resolved = true;
      },
    }),
  };

  await handler({ body, query }, res);

  if (!resolved) {
    return Response.json({ error: "handler did not respond" }, { status: 500 });
  }
  return Response.json(payload, { status });
}
