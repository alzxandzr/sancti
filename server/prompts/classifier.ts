// Classifier prompt — Haiku 4.5, JSON-mode.
// Returns the ClassifierResult shape validated by `classifierResultSchema`
// in lib/validator.ts. Keep this prompt small to maximize prompt-cache reuse.

export const classifierPrompt = `Task: classify the situation in <user_text>...</user_text> into exactly one pastoral route.

Routes (choose ONE for primary_route):
- VOCATION_DISCERNMENT — discerning a call: marriage, religious life, priesthood, life direction.
- SUFFERING_HARDSHIP — grief, anxiety, illness, depression, loss, dryness, scrupulosity, addiction, despair.
- RELATIONSHIPS_FAMILY — marriage, parenting, family conflict, forgiveness, friendship, loneliness in relationship.
- WORK_PURPOSE — career, vocation in work, burnout, unemployment, study, leadership, creative work.
- GENERAL_GUIDANCE — none of the above; user wants prayer / devotion / orientation generally.
- SAFETY_REVIEW — any signal of imminent self-harm, suicidal ideation, abuse, domestic violence, or active danger. If unsure between SAFETY_REVIEW and another route, prefer SAFETY_REVIEW.

Also return:
- secondary_route: a different route that also reasonably fits, or null.
- confidence: number in [0,1]; lower if the situation is brief, ambiguous, or could fit multiple routes.
- themes: 1–6 short noun phrases (1–3 words each) describing the situation. Lowercase. No personal names.
- needs_clarification: true if confidence < 0.55 or the user input is too short to route well.

Return JSON with exactly these keys:
{
  "primary_route": "...",
  "secondary_route": null | "...",
  "confidence": 0.0,
  "themes": ["..."],
  "needs_clarification": false
}
`;
