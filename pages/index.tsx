import Head from "next/head";
import Link from "next/link";
import React, { useState } from "react";
import type { FormEvent, CSSProperties, ReactNode } from "react";
import type {
  ClassifierResult,
  DevotionPlanV2,
  RouteLabel,
  SafetyPrescreen,
  SaintMatch,
} from "../types";
import { saveActivePlan } from "../lib/web/active-plan";

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

const CHIPS = [
  "Grieving",
  "Discernment",
  "Burned out",
  "Family tension",
  "Doubt",
  "New role",
];

const MAX_CHARS = 1500;

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

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let r = n;
  for (const [v, s] of map) {
    while (r >= v) {
      out += s;
      r -= v;
    }
  }
  return out;
}

export default function Home() {
  const [userText, setUserText] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
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
  };

  const busy = stage === "classifying" || stage === "matching" || stage === "planning";
  const ready = userText.trim().length >= 5 || selectedChip !== null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) {
      setError("Please describe a few words about your situation, or pick a season.");
      return;
    }
    reset();

    const text = userText.trim().length >= 5 ? userText.trim() : (selectedChip ?? "");

    try {
      setStage("classifying");
      const classification = await postJson<{ user_text: string }, ClassifyOutcome>(
        "/api/classify",
        { user_text: text },
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
        user_text: text,
        saints: matched.saints,
      });
      setPlan(planResp);
      setStage("done");

      // Persist the plan to Supabase (or localStorage if anon auth is off) so
      // the user can resume it from the Today page across sessions.
      void saveActivePlan(planResp).catch((err) => {
        console.warn("Could not save plan; ephemeral session only:", err);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  };

  const stageLabel = (() => {
    switch (stage) {
      case "classifying":
        return "Discerning your situation…";
      case "matching":
        return "Calling the company of saints…";
      case "planning":
        return "Composing your devotional plan…";
      default:
        return null;
    }
  })();

  return (
    <>
      <Head>
        <title>Sancti — A companion of saints for the season you are in</title>
        <meta
          name="description"
          content="Sancti pairs your situation with relevant Catholic saints and generates a structured 5–7 day devotional reflection."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={mainStyle}>
        {/* Hero */}
        <header style={{ textAlign: "center", paddingTop: 64, paddingBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <Crest size={56} />
          </div>
          <SmallCaps color="var(--ink-muted)" size={10}>
            est. anno · MMXXVI
          </SmallCaps>

          <h1 style={wordmarkStyle}>Sancti</h1>

          <div style={{ maxWidth: 360, margin: "0 auto", padding: "0 8px" }}>
            <OrnateRule />
          </div>

          <p style={taglineStyle}>
            A companion of saints
            <br />
            for the season you are in.
          </p>
        </header>

        {/* Intake card */}
        <section style={{ ...cardStyle, marginTop: 36 }}>
          <SmallCaps color="var(--brass)" size={11}>
            step i · iii
          </SmallCaps>
          <h2 style={displayHeadingStyle}>
            What are you <em style={brassItalic}>carrying</em> today?
          </h2>
          <p style={mutedSerifStyle}>
            A few sentences is enough. You can also choose from the list below.
          </p>

          <form onSubmit={onSubmit} style={{ marginTop: 24 }}>
            <div style={textareaWrapStyle}>
              <textarea
                id="situation"
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="A few sentences about your situation…"
                rows={5}
                maxLength={MAX_CHARS}
                style={textareaStyle}
              />
              <div style={textareaMetaStyle}>
                <SmallCaps color="var(--ink-faint)" size={9}>
                  {`${userText.length} / ${MAX_CHARS}`}
                </SmallCaps>
                <SmallCaps color="var(--ink-muted)" size={9}>
                  private to you
                </SmallCaps>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <SmallCaps color="var(--ink-muted)" size={10}>
                or pick a season
              </SmallCaps>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {CHIPS.map((chip) => {
                  const active = chip === selectedChip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setSelectedChip((c) => (c === chip ? null : chip))}
                      style={chipStyle(active)}
                      aria-pressed={active}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
              <PillButton type="submit" disabled={busy || !ready}>
                {busy ? "Working…" : "Find saints"}
                <ArrowIcon />
              </PillButton>
              {stageLabel && (
                <span style={{ color: "var(--ink-muted)", fontStyle: "italic" }}>
                  {stageLabel}
                </span>
              )}
            </div>
          </form>
        </section>

        {error && (
          <section style={{ ...cardStyle, borderColor: "var(--cardinal)", marginTop: 20 }}>
            <SmallCaps color="var(--cardinal)" size={11}>
              something went amiss
            </SmallCaps>
            <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>{error}</p>
          </section>
        )}

        {/* Classification */}
        {classifyOut && (
          <section style={{ ...cardStyle, marginTop: 20 }}>
            <SmallCaps color="var(--brass)" size={11}>
              {HUMAN_ROUTE[classifyOut.classification.primary_route]}
            </SmallCaps>
            <p style={{ ...mutedSerifStyle, marginTop: 10 }}>
              Confidence{" "}
              <span style={{ color: "var(--ink-soft)" }}>
                {Math.round(classifyOut.classification.confidence * 100)}%
              </span>
              {classifyOut.classification.themes.length > 0 && (
                <>
                  {" · "}themes:{" "}
                  <span style={{ color: "var(--ink-soft)" }}>
                    {classifyOut.classification.themes.join(", ")}
                  </span>
                </>
              )}
            </p>
            {classifyOut.safety.severity !== "none" && (
              <p style={{ marginTop: 12, color: "var(--cardinal)" }}>
                <strong>Pastoral note:</strong> {classifyOut.safety.reason}
              </p>
            )}
          </section>
        )}

        {/* Saints */}
        {saints && saints.length > 0 && (
          <section style={{ ...cardStyle, marginTop: 20 }}>
            <SmallCaps color="var(--brass)" size={11}>
              step ii · iii
            </SmallCaps>
            <h2 style={displayHeadingStyle}>
              {saints.length === 1 ? "One saint" : `${toRoman(saints.length)} saints`}{" "}
              will <em style={brassItalic}>walk with you.</em>
            </h2>
            <p style={mutedSerifStyle}>
              Drawn from your words and the company of the Church.
            </p>

            <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
              {saints.map((s, i) => (
                <article key={s.name} style={saintCardStyle}>
                  <Medallion name={s.name} size={64} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={saintNameStyle}>{s.name}</h3>
                    <p style={saintEraStyle}>Feast · {s.feast_day}</p>
                    <p style={saintReasonStyle}>{s.reason}</p>
                  </div>
                  <span style={romanBadgeStyle}>{toRoman(i + 1)}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Plan */}
        {plan && (
          <section style={{ ...cardStyle, marginTop: 20 }}>
            <SmallCaps color="var(--brass)" size={11}>
              step iii · iii
            </SmallCaps>
            <h2 style={displayHeadingStyle}>
              A {toRoman(plan.total_days)}-day{" "}
              <em style={brassItalic}>reflection.</em>
            </h2>
            <p style={mutedSerifStyle}>{plan.situation_summary}</p>

            <div style={{ marginTop: 18, marginBottom: 8 }}>
              <Link href="/today" style={ctaLinkStyle}>
                Begin day i in <em style={brassItalic}>Today</em> →
              </Link>
              <p style={{ ...mutedSerifStyle, fontSize: 13, marginTop: 6 }}>
                Your plan is saved. Open it day by day, or read it all below.
              </p>
            </div>

            {plan.safety_note && (
              <div style={safetyNoteStyle}>
                <SmallCaps color="var(--cardinal)" size={10}>
                  pastoral note
                </SmallCaps>
                <p style={{ margin: "6px 0 0" }}>{plan.safety_note}</p>
              </div>
            )}

            <div style={{ display: "grid", gap: 16, marginTop: 22 }}>
              {plan.days.map((day) => (
                <details
                  key={day.day_index}
                  open={day.day_index === 0}
                  style={dayCardStyle}
                >
                  <summary style={daySummaryStyle}>
                    <span style={dayRomanStyle}>{toRoman(day.day_index + 1)}</span>
                    <span style={dayThemeStyle}>{day.theme}</span>
                  </summary>
                  {day.liturgical_note && (
                    <p style={liturgicalNoteStyle}>{day.liturgical_note}</p>
                  )}
                  <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                    {day.prompts.map((p, i) => (
                      <div key={i} style={promptStyle}>
                        <SmallCaps color="var(--ink-muted)" size={9}>
                          {p.type} · ~{p.estimated_minutes} min
                        </SmallCaps>
                        <h4 style={promptTitleStyle}>{p.title}</h4>
                        <p style={promptBodyStyle}>{p.body}</p>
                        {p.citations.length > 0 && (
                          <p style={citationStyle}>
                            {p.citations.map((c) => c.label).join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <div style={{ marginTop: 26, padding: "0 8px" }}>
              <OrnateRule />
            </div>
            <p style={teachingAuthorityStyle}>{plan.teaching_authority_note}</p>
          </section>
        )}

        <footer style={footerStyle}>
          <OrnateRule />
          <p>
            Devotional reflection — not official Church teaching, not a substitute
            for a priest or counselor.
          </p>
          <p style={{ marginTop: 6 }}>
            Source on{" "}
            <a href="https://github.com/alzxandzr/sancti">GitHub</a>. Built with
            Next.js, Gemini, Supabase.
          </p>
        </footer>
      </main>
    </>
  );
}

/* ─── Components ───────────────────────────────────────────────────────── */

function Crest({ size = 56 }: { size?: number }) {
  const height = Math.round(size * (56 / 42));
  return (
    <svg width={size} height={height} viewBox="0 0 42 56" aria-hidden>
      <circle cx={21} cy={28} r={20} stroke="var(--brass)" strokeWidth={0.8} fill="none" />
      <circle
        cx={21}
        cy={28}
        r={17}
        stroke="var(--brass)"
        strokeWidth={0.4}
        strokeDasharray="1 2"
        fill="none"
      />
      <path
        d="M21 13 L21 43 M11 28 L31 28"
        stroke="var(--brass)"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M21 9 L21 14 M19 11 L23 11"
        stroke="var(--brass)"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  );
}

function OrnateRule({ label }: { label?: string } = {}) {
  return (
    <div style={ornateRuleStyle}>
      <span style={hairlineStyle} />
      {label ? (
        <SmallCaps color="var(--ink-muted)" size={9}>
          {label}
        </SmallCaps>
      ) : (
        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
          <path
            d="M5 1 L9 5 L5 9 L1 5 Z"
            fill="none"
            stroke="var(--brass)"
            strokeWidth={0.8}
          />
        </svg>
      )}
      <span style={hairlineStyle} />
    </div>
  );
}

function SmallCaps({
  children,
  color = "var(--ink-muted)",
  size = 10,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: size,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 500,
        color,
      }}
    >
      {children}
    </span>
  );
}

function PillButton({
  children,
  type = "button",
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 52,
        borderRadius: 26,
        background: disabled ? "var(--ink-muted)" : "var(--ink)",
        color: "var(--bg)",
        border: 0,
        padding: "0 26px",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "var(--font-body)",
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: "0.02em",
        transition: "opacity 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M1 7h12M8 2l5 5-5 5"
        stroke="var(--bg)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function Medallion({ name, size = 64 }: { name: string; size?: number }) {
  // Two letters from the saint name, set in display italic on a brass ring.
  const initials = name
    .replace(/^St\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        border: "1px solid var(--brass)",
        background: "var(--surface-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
      }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: (size - 8) / 2,
          border: "1px dashed var(--brass)",
          opacity: 0.5,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: size * 0.34,
          color: "var(--brass-deep)",
          letterSpacing: "-0.02em",
        }}
      >
        {initials}
      </span>
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────────── */

const mainStyle: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "0 24px 120px",
};

const wordmarkStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "5.4rem",
  fontWeight: 400,
  margin: "16px 0 14px",
  letterSpacing: "-0.02em",
  lineHeight: 1,
  color: "var(--ink)",
};

const taglineStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: "1.25rem",
  lineHeight: 1.5,
  color: "var(--ink-soft)",
  margin: "22px auto 0",
  maxWidth: 420,
};

const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 18,
  padding: "28px 28px 30px",
};

const ctaLinkStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-display)",
  fontSize: "1.25rem",
  color: "var(--brass-deep)",
  textDecoration: "none",
  padding: "10px 18px",
  border: "1px solid var(--brass)",
  borderRadius: 999,
  background: "rgba(168,130,58,0.06)",
};

const displayHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "2.2rem",
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: "-0.01em",
  margin: "14px 0 10px",
  color: "var(--ink)",
};

const brassItalic: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontWeight: 500,
  color: "var(--brass)",
};

const mutedSerifStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: "1rem",
  color: "var(--ink-muted)",
  margin: 0,
  lineHeight: 1.55,
};

const textareaWrapStyle: CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--hairline)",
  borderRadius: 14,
  padding: 16,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 96,
  border: 0,
  outline: "none",
  background: "transparent",
  resize: "vertical",
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: "1.05rem",
  lineHeight: 1.55,
  color: "var(--ink)",
  padding: 0,
};

const textareaMetaStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
};

const chipStyle = (active: boolean): CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 999,
  border: `1px solid ${active ? "var(--brass)" : "var(--hairline)"}`,
  background: active ? "rgba(168, 130, 58, 0.10)" : "transparent",
  color: active ? "var(--brass)" : "var(--ink-soft)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
});

const saintCardStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  background: "var(--bg)",
  border: "1px solid var(--hairline)",
  borderRadius: 16,
  padding: 16,
};

const saintNameStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 500,
  fontSize: "1.25rem",
  margin: 0,
  color: "var(--ink)",
  lineHeight: 1.2,
};

const saintEraStyle: CSSProperties = {
  margin: "4px 0 8px",
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: ".82rem",
  color: "var(--ink-muted)",
};

const saintReasonStyle: CSSProperties = {
  margin: 0,
  fontSize: ".9rem",
  lineHeight: 1.5,
  color: "var(--ink-soft)",
};

const romanBadgeStyle: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 16,
  fontFamily: "var(--font-display)",
  fontWeight: 500,
  letterSpacing: "0.08em",
  fontSize: ".82rem",
  color: "var(--brass)",
};

const dayCardStyle: CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--hairline)",
  borderRadius: 14,
  padding: "14px 16px",
};

const daySummaryStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 14,
  cursor: "pointer",
  listStyle: "none",
};

const dayRomanStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  color: "var(--brass)",
  fontSize: "1.1rem",
  fontWeight: 500,
  letterSpacing: "0.06em",
  minWidth: 32,
};

const dayThemeStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.15rem",
  fontWeight: 500,
  color: "var(--ink)",
};

const liturgicalNoteStyle: CSSProperties = {
  marginTop: 10,
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: ".88rem",
  color: "var(--ink-muted)",
};

const promptStyle: CSSProperties = {
  paddingTop: 10,
  borderTop: "1px solid var(--hairline)",
};

const promptTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 500,
  fontSize: "1.02rem",
  margin: "6px 0 6px",
  color: "var(--ink)",
};

const promptBodyStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: ".94rem",
  lineHeight: 1.6,
  color: "var(--ink-soft)",
};

const citationStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: ".82rem",
  color: "var(--ink-muted)",
};

const safetyNoteStyle: CSSProperties = {
  marginTop: 18,
  padding: 14,
  background: "rgba(122, 30, 33, 0.06)",
  border: "1px solid rgba(122, 30, 33, 0.25)",
  borderRadius: 12,
  color: "var(--ink-soft)",
};

const teachingAuthorityStyle: CSSProperties = {
  marginTop: 18,
  textAlign: "center",
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: ".88rem",
  color: "var(--ink-muted)",
  lineHeight: 1.55,
};

const footerStyle: CSSProperties = {
  marginTop: 56,
  textAlign: "center",
  color: "var(--ink-muted)",
  fontSize: ".85rem",
  paddingTop: 24,
};

const ornateRuleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  opacity: 0.85,
};

const hairlineStyle: CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--hairline)",
};
