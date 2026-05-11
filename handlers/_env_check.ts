// TEMPORARY diagnostic. Reports env presence and exercises a minimal
// Gemini call so we can capture the actual SDK error inside the lambda.
// Delete this file (and its pages/api shim) once verified.

import { GoogleGenAI } from "@google/genai";

export default async function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (payload: unknown) => void } },
): Promise<void> {
  const names = [
    "GEMINI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
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

  let geminiProbe: {
    ok: boolean;
    model: string;
    error?: string;
    errorName?: string;
    sample?: string;
  } = { ok: false, model: "gemini-2.5-flash" };

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length >= 20) {
    try {
      const client = new GoogleGenAI({ apiKey: apiKey.trim() });
      const t0 = Date.now();
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "reply with just the word ok" }] }],
        config: {
          responseMimeType: "text/plain",
          maxOutputTokens: 32,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const text = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? "(empty)";
      geminiProbe = {
        ok: true,
        model: "gemini-2.5-flash",
        sample: typeof text === "string" ? text.slice(0, 40) : "(non-string)",
      };
      void t0;
    } catch (err) {
      geminiProbe = {
        ok: false,
        model: "gemini-2.5-flash",
        error: err instanceof Error ? err.message.slice(0, 400) : String(err).slice(0, 400),
        errorName: err instanceof Error ? err.name : "Unknown",
      };
    }
  } else {
    geminiProbe.error = "GEMINI_API_KEY missing or <20 chars";
  }

  res.status(200).json({
    runtime_node_version: process.version,
    env_report: report,
    gemini_probe: geminiProbe,
  });
}
