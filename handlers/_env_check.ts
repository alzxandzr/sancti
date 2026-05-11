// TEMPORARY diagnostic. Reports only the LENGTH of selected env vars so we
// can verify what the lambda actually receives, without leaking values.
// Delete this file (and its pages/api shim) once verified.

export default async function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (payload: unknown) => void } },
): Promise<void> {
  const names = [
    "GEMINI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GEMINI_MODEL_CLASSIFY",
    "GEMINI_MODEL_PLAN",
    "NODE_ENV",
    "VERCEL_ENV",
    "VERCEL_DEPLOYMENT_ID",
  ];
  const report: Record<string, { present: boolean; length: number }> = {};
  for (const name of names) {
    const v = process.env[name];
    report[name] = {
      present: typeof v === "string",
      length: typeof v === "string" ? v.trim().length : 0,
    };
  }
  res.status(200).json({
    runtime_node_version: process.version,
    env_report: report,
  });
}
