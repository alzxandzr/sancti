import Head from "next/head";
import React, { useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import type {
  ClassifierResult,
  DevotionPlanV2,
  RouteLabel,
  SafetyPrescreen,
  SaintMatch,
} from "../types";

interface ClassifyOutcome {
  classification: ClassifierResult;
  safety: SafetyPrescreen;
  short_circuited: boolean;
  used_fallback: boolean;
}

type Stage = "idle" | "classifying" | "matching" | "planning" | "done" | "error";

const HUMAN_ROUTE: Record<RouteLabel, string> = {
  VOCATION_DISCERNMENT: "Vocation & discernment",
  SUFFERING_HARDSHIP: "Suffering & hardship",
  RELATIONSHIPS_FAMILY: "Relationships & family",
  WORK_PURPOSE: "Work & purpose",
  GENERAL_GUIDANCE: "General guidance",
  SAFETY_REVIEW: "Safety review",
};

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${text}`);
  }
  return JSON.parse(text) as TRes;
}

export default function Home() {
  const [userText, setUserText] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [classifyOut, setClassifyOut] = useState<ClassifyOutcome | null>(null);
  const [saints, setSaints] = useState<SaintMatch[] | null>(null);
  const [plan, setPlan] = useState<DevotionPlanV2 | null>(null);

  const reset = () => {
    setError(null);
    setClassifyOut(null);
    setSaints(null);
    setPlan(null);
    setStage("idle");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (userText.trim().length < 5) {
      setError("Please write at least a few words about your situation.");
      return;
    }
    reset();

    try {
      setStage("classifying");
      const classification = await postJson<{ user_text: string }, ClassifyOutcome>(
        "/api/classify",
        { user_text: userText },
      );
      setClassifyOut(classification);

      setStage("matching");
      const matched = await postJson<
        { route: RouteLabel; themes: string[] },
        { saints: SaintMatch[] }
      >("/api/match-saints", {
        route: classification.classification.primary_route,
        themes: classification.classification.themes,
      });
      setSaints(matched.saints);

      setStage("planning");
      const planResp = await postJson<
        { route: RouteLabel; user_text: string; saints: SaintMatch[] },
        DevotionPlanV2
      >("/api/generate-plan", {
        route: classification.classification.primary_route,
        user_text: userText,
        saints: matched.saints,
      });
      setPlan(planResp);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  };

  const stageLabel = (() => {
    switch (stage) {
      case "classifying":
        return "Classifying your situation…";
      case "matching":
        return "Matching saints…";
      case "planning":
        return "Generating your devotional plan…";
      default:
        return null;
    }
  })();

  return (
    <>
      <Head>
        <title>Sancti — Catholic saint-matching & devotional plans</title>
        <meta
          name="description"
          content="Sancti pairs your situation with relevant Catholic saints and generates a structured 5–7 day devotional reflection."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 120px" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "2.4rem", margin: 0, letterSpacing: "-0.01em" }}>Sancti</h1>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            A Catholic saint-matching and devotional planning experiment. Describe a
            situation in plain language; Sancti routes it to a pastoral category, surfaces
            relevant saints, and drafts a 5–7 day devotional reflection — with theological
            and safety guardrails.
          </p>
          <p style={{ color: "var(--muted)", fontSize: ".88rem", marginTop: 8 }}>
            Devotional reflection only. Not official Church teaching, not a substitute for
            pastoral, medical, or mental-health care.
          </p>
        </header>

        <section
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <form onSubmit={onSubmit}>
            <label htmlFor="situation" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
              Describe your situation
            </label>
            <textarea
              id="situation"
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="e.g. I'm grieving my father and trying to forgive my mother…"
              rows={5}
              maxLength={1500}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--ink)",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <button
                type="submit"
                disabled={stage === "classifying" || stage === "matching" || stage === "planning"}
                style={{
                  padding: "10px 18px",
                  background: "var(--accent)",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  cursor: "pointer",
                  opacity:
                    stage === "classifying" || stage === "matching" || stage === "planning"
                      ? 0.6
                      : 1,
                }}
              >
                Find guidance
              </button>
              {stageLabel && <span style={{ color: "var(--muted)" }}>{stageLabel}</span>}
              <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".85rem" }}>
                {userText.length}/1500
              </span>
            </div>
          </form>
        </section>

        {error && (
          <section
            style={{
              border: "1px solid var(--warn)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 24,
              color: "var(--warn)",
              background: "#fff",
            }}
          >
            <strong>Error:</strong> {error}
          </section>
        )}

        {classifyOut && (
          <section style={cardStyle}>
            <h2 style={h2Style}>Classification</h2>
            <p style={{ margin: "4px 0" }}>
              <strong>Route:</strong>{" "}
              {HUMAN_ROUTE[classifyOut.classification.primary_route]} · confidence{" "}
              {Math.round(classifyOut.classification.confidence * 100)}%
            </p>
            {classifyOut.classification.themes.length > 0 && (
              <p style={{ margin: "4px 0", color: "var(--muted)" }}>
                Themes: {classifyOut.classification.themes.join(", ")}
              </p>
            )}
            {classifyOut.safety.severity !== "none" && (
              <p style={{ margin: "8px 0", color: "var(--warn)" }}>
                Safety: {classifyOut.safety.severity} — {classifyOut.safety.reason}
              </p>
            )}
          </section>
        )}

        {saints && saints.length > 0 && (
          <section style={cardStyle}>
            <h2 style={h2Style}>Saint matches</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {saints.map((s) => (
                <div
                  key={s.name}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <strong>{s.name}</strong>
                  <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: ".88rem" }}>
                    Feast: {s.feast_day}
                  </span>
                  <p style={{ margin: "6px 0 0", color: "var(--ink)" }}>{s.reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {plan && (
          <section style={cardStyle}>
            <h2 style={h2Style}>{plan.total_days}-day devotional plan</h2>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>{plan.situation_summary}</p>
            {plan.safety_note && (
              <p style={{ color: "var(--warn)" }}>
                <strong>Safety note:</strong> {plan.safety_note}
              </p>
            )}
            <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
              {plan.days.map((day) => (
                <details
                  key={day.day_index}
                  open={day.day_index === 0}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 12,
                    background: "var(--bg)",
                  }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    Day {day.day_index + 1}: {day.theme}
                  </summary>
                  {day.liturgical_note && (
                    <p style={{ color: "var(--muted)", fontSize: ".88rem", marginTop: 8 }}>
                      {day.liturgical_note}
                    </p>
                  )}
                  <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                    {day.prompts.map((p, i) => (
                      <div key={i}>
                        <div style={{ fontWeight: 600 }}>
                          {p.title}{" "}
                          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                            ({p.type}, ~{p.estimated_minutes} min)
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 6px" }}>{p.body}</p>
                        {p.citations.length > 0 && (
                          <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: 0 }}>
                            {p.citations.map((c) => c.label).join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <p style={{ marginTop: 16, color: "var(--muted)", fontSize: ".82rem" }}>
              {plan.teaching_authority_note}
            </p>
          </section>
        )}

        <footer style={{ marginTop: 48, color: "var(--muted)", fontSize: ".85rem" }}>
          <p>
            Sancti is a portfolio project. Source on{" "}
            <a href="https://github.com/alzxandzr/sancti">GitHub</a>. Built with Next.js,
            Claude, Supabase.
          </p>
        </footer>
      </main>
    </>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: 20,
  marginBottom: 20,
};

const h2Style: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "1.15rem",
  letterSpacing: "-0.005em",
};
