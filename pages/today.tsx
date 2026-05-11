import Head from "next/head";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { loadActivePlan, markCurrentDayDone, type ActivePlan } from "../lib/web/active-plan";
import type { Citation, DevotionPromptV2, PlanDay, RouteLabel } from "../types";

const HUMAN_ROUTE: Record<RouteLabel, string> = {
  VOCATION_DISCERNMENT: "Vocation & discernment",
  SUFFERING_HARDSHIP: "Suffering & hardship",
  RELATIONSHIPS_FAMILY: "Relationships & family",
  WORK_PURPOSE: "Work & purpose",
  GENERAL_GUIDANCE: "General guidance",
  SAFETY_REVIEW: "Safety review",
};

const ROMAN_ONES = ["", "i", "ii", "iii", "iv", "v", "vi", "vii"];
const toLowerRoman = (n: number): string => ROMAN_ONES[n] ?? String(n);

const PROMPT_LABEL: Record<DevotionPromptV2["type"], string> = {
  reflection: "reflection",
  prayer: "prayer",
  journal: "journal",
  practice: "practice",
};

const formatCitation = (c: Citation): string => {
  switch (c.kind) {
    case "scripture":
      return c.label;
    case "catechism":
      return c.label;
    case "saint_writing":
      return c.label;
    case "liturgy":
      return c.label;
    default: {
      const exhaustive: never = c;
      return String(exhaustive);
    }
  }
};

export default function TodayPage() {
  const [active, setActive] = useState<ActivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadActivePlan()
      .then((p) => {
        if (!cancelled) {
          setActive(p);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onMarkDone = useCallback(async () => {
    if (!active || marking) return;
    setMarking(true);
    try {
      const next = await markCurrentDayDone();
      if (next) setActive(next);
    } finally {
      setMarking(false);
    }
  }, [active, marking]);

  // ─── Render branches ───────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        <p style={mutedSerifStyle}>Loading your plan…</p>
      </Shell>
    );
  }

  if (!active) {
    return (
      <Shell>
        <h1 style={headingStyle}>No plan yet</h1>
        <p style={mutedSerifStyle}>
          Start an intake on the home page and a 5–7 day reflection will be composed for you.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link href="/" style={ctaLinkStyle}>
            Begin an intake →
          </Link>
        </div>
      </Shell>
    );
  }

  const { plan, current_day_index, completed_days } = active;
  const totalCompleted = completed_days.length;
  const planFinished = totalCompleted >= plan.total_days;
  const day: PlanDay | undefined = plan.days[current_day_index];
  const lead = plan.saint_matches[0];

  // ─── Finished celebration ──────────────────────────────────────────────
  if (planFinished) {
    return (
      <Shell>
        <SmallCaps>{HUMAN_ROUTE[plan.primary_route]}</SmallCaps>
        <h1 style={headingStyle}>You finished.</h1>
        <p style={mutedSerifStyle}>
          You walked all {toLowerRoman(plan.total_days)} days with{" "}
          {lead ? <em style={brassItalic}>{lead.name}</em> : "the saints"}.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link href="/" style={ctaLinkStyle}>
            Begin another →
          </Link>
        </div>
      </Shell>
    );
  }

  if (!day) {
    return (
      <Shell>
        <p style={mutedSerifStyle}>Plan data is missing for the current day.</p>
        <Link href="/" style={ctaLinkStyle}>
          Begin again →
        </Link>
      </Shell>
    );
  }

  const todayDone = completed_days.includes(current_day_index);

  return (
    <Shell>
      <Head>
        <title>Sancti — Today (Day {current_day_index + 1} of {plan.total_days})</title>
      </Head>

      {/* Top meta */}
      <SmallCaps>{HUMAN_ROUTE[plan.primary_route]}</SmallCaps>
      <h1 style={headingStyle}>
        Day{" "}
        <em style={brassItalic}>
          {toLowerRoman(current_day_index + 1)}
        </em>{" "}
        · {day.theme.toLowerCase()}
      </h1>

      <p style={progressStyle}>
        Day {current_day_index + 1} of {plan.total_days}
        {totalCompleted > 0 ? ` · ${totalCompleted} complete` : ""}
        {lead ? ` · with ${lead.name}` : ""}
      </p>

      {day.liturgical_note && (
        <p style={liturgicalStyle}>{day.liturgical_note}</p>
      )}

      {/* Prompts */}
      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {day.prompts.map((p, idx) => (
          <article key={`${current_day_index}-${idx}`} style={promptCardStyle}>
            <div style={promptHeaderStyle}>
              <SmallCaps color="var(--brass)">
                {PROMPT_LABEL[p.type]}
                {p.estimated_minutes ? ` · ${p.estimated_minutes} min` : ""}
              </SmallCaps>
              <span style={promptOrdinalStyle}>{toLowerRoman(idx + 1)}</span>
            </div>
            <h3 style={promptTitleStyle}>{p.title}</h3>
            <p style={promptBodyStyle}>{p.body}</p>
            {p.citations.length > 0 && (
              <ul style={citationListStyle}>
                {p.citations.map((c, ci) => (
                  <li key={ci} style={citationItemStyle}>
                    <SmallCaps color="var(--ink-muted)" size={9}>
                      source · {c.kind}
                    </SmallCaps>
                    <div style={{ marginTop: 2 }}>{formatCitation(c)}</div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {/* Action */}
      <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onMarkDone}
          disabled={marking || todayDone}
          style={primaryButtonStyle(marking || todayDone)}
        >
          {todayDone
            ? "Day complete · advance"
            : marking
              ? "Saving…"
              : "Mark day complete"}
        </button>
        <Link href="/" style={secondaryLinkStyle}>
          Back to home
        </Link>
      </div>

      {plan.safety_note && (
        <div style={safetyNoteStyle}>
          <SmallCaps color="var(--cardinal)" size={10}>
            pastoral note
          </SmallCaps>
          <p style={{ margin: "6px 0 0" }}>{plan.safety_note}</p>
        </div>
      )}

      <p style={authorityNoteStyle}>{plan.teaching_authority_note}</p>
    </Shell>
  );
}

// ─── tiny helpers ─────────────────────────────────────────────────────────

const Shell = ({ children }: { children: ReactNode }) => (
  <main style={mainStyle}>
    <div style={cardStyle}>{children}</div>
  </main>
);

const SmallCaps = ({
  children,
  color = "var(--brass)",
  size = 11,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
}) => (
  <span
    style={{
      display: "inline-block",
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      fontSize: size,
      fontWeight: 600,
      color,
    }}
  >
    {children}
  </span>
);

// ─── styles ───────────────────────────────────────────────────────────────

const mainStyle: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "48px 18px 64px",
};
const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 18,
  padding: "30px 28px 34px",
};
const headingStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "2rem",
  fontWeight: 400,
  lineHeight: 1.15,
  margin: "10px 0 8px",
  color: "var(--ink)",
};
const brassItalic: CSSProperties = {
  fontStyle: "italic",
  color: "var(--brass-deep)",
};
const progressStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "var(--ink-muted)",
  marginTop: 2,
};
const liturgicalStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  color: "var(--ink-soft)",
  marginTop: 14,
  padding: "10px 14px",
  borderLeft: "2px solid var(--brass)",
  background: "rgba(168,130,58,0.06)",
};
const mutedSerifStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  color: "var(--ink-soft)",
  fontSize: 16,
};
const promptCardStyle: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--hairline)",
  borderRadius: 14,
  padding: "16px 18px 18px",
};
const promptHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 6,
};
const promptOrdinalStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  color: "var(--brass-deep)",
  fontSize: 14,
};
const promptTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.2rem",
  fontWeight: 500,
  margin: "4px 0 6px",
  color: "var(--ink)",
};
const promptBodyStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  lineHeight: 1.55,
  color: "var(--ink-soft)",
  margin: 0,
};
const citationListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "12px 0 0",
  display: "grid",
  gap: 6,
};
const citationItemStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--ink-muted)",
};
const primaryButtonStyle = (disabled: boolean): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontSize: "1.05rem",
  padding: "10px 22px",
  border: "1px solid var(--brass)",
  borderRadius: 999,
  background: disabled ? "var(--surface-2)" : "var(--brass)",
  color: disabled ? "var(--ink-muted)" : "var(--surface)",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.7 : 1,
});
const secondaryLinkStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1rem",
  padding: "10px 18px",
  border: "1px solid var(--hairline)",
  borderRadius: 999,
  color: "var(--ink-soft)",
  textDecoration: "none",
  background: "transparent",
};
const ctaLinkStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-display)",
  fontSize: "1.15rem",
  color: "var(--brass-deep)",
  textDecoration: "none",
  padding: "10px 18px",
  border: "1px solid var(--brass)",
  borderRadius: 999,
  background: "rgba(168,130,58,0.06)",
};
const safetyNoteStyle: CSSProperties = {
  marginTop: 22,
  padding: "12px 14px",
  borderLeft: "2px solid var(--cardinal)",
  background: "rgba(122,30,33,0.06)",
  fontFamily: "var(--font-display)",
  color: "var(--ink-soft)",
};
const authorityNoteStyle: CSSProperties = {
  marginTop: 24,
  paddingTop: 16,
  borderTop: "1px solid var(--hairline)",
  fontSize: 12,
  color: "var(--ink-muted)",
  fontStyle: "italic",
};
