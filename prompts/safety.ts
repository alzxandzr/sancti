// Safety pre-screen prompt — runs BEFORE classification.
// Haiku 4.5, JSON-mode. Returns SafetyPrescreen shape validated by
// `safetyPrescreenSchema`. Combined with `heuristicSafetyScan` in lib/safety.ts;
// the heuristic is the floor, the LLM is the ceiling.

export const safetyPrescreenPrompt = `Task: assess whether the situation in <user_text>...</user_text> indicates a safety concern that should bypass normal devotional planning.

Severity levels:
- "crisis" — any expression of imminent self-harm, suicidal ideation, plan, intent, or means; active suicide attempt; serious self-injury in progress; immediate danger from another person; child or vulnerable-adult abuse currently happening; clear statements like "I want to die", "I am going to kill myself", "no reason to live".
- "concern" — domestic violence (current or recent), ongoing abuse, severe untreated mental illness symptoms, substance overdose risk, or other situations where a devotional plan alone would be irresponsible without first surfacing crisis resources.
- "none" — anything else, including grief, anxiety, doubt, vocational struggle, family tension, work stress, etc., even if the user is suffering.

Categories (choose 0–4 short labels): self_harm_or_suicide, abuse_or_violence, substance_misuse, severe_mental_distress, child_safety, vulnerable_adult, other.

Reason: 1 sentence in your own words, ≤ 200 characters, NEVER quoting the user verbatim. Describe what kind of signal triggered the severity, not the user's words.

If you are unsure between two severities, choose the higher (more cautious) one.

Return JSON with exactly:
{
  "severity": "none" | "concern" | "crisis",
  "categories": ["..."],
  "reason": "..."
}
`;
