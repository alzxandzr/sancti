import { generatePlanInputSchema, devotionPlanSchema, assertGuardrails } from "../lib/validator";
import type { DevotionPlan, DevotionPrompt, RouteLabel, SaintMatch } from "../types";

const routePromptTemplate: Record<RouteLabel, DevotionPrompt[]> = {
  VOCATION_DISCERNMENT: [
    { type: "reflection", title: "Discern with Freedom", text: "Devotional reflection: Where do you sense peace when you pray about your path?" },
    { type: "journal", title: "Daily Examen", text: "Devotional reflection: Note moments of consolation and desolation in your decisions today." },
    { type: "prayer", title: "Prayer for Light", text: "Devotional reflection: Ask for wisdom, patience, and a willing heart." },
    { type: "action", title: "One Faithful Step", text: "Devotional reflection: Take one concrete next step and entrust the result to God." },
  ],
  SUFFERING_HARDSHIP: [
    { type: "reflection", title: "Christ Near You", text: "Devotional reflection: Name your burden and place it in Christ's hands." },
    { type: "prayer", title: "Prayer for Consolation", text: "Devotional reflection: Pray for courage, healing, and trust." },
    { type: "action", title: "Small Mercy", text: "Devotional reflection: Receive help from one trusted person today." },
    { type: "journal", title: "Evening Hope", text: "Devotional reflection: Record one grace you noticed despite hardship." },
  ],
  RELATIONSHIPS_FAMILY: [
    { type: "reflection", title: "See with Charity", text: "Devotional reflection: Consider what the other person may be carrying." },
    { type: "prayer", title: "Intercession for Loved Ones", text: "Devotional reflection: Pray blessing and healing over one relationship." },
    { type: "action", title: "Concrete Kindness", text: "Devotional reflection: Offer one act of patient service today." },
    { type: "journal", title: "Forgiveness Check", text: "Devotional reflection: Note where reconciliation is needed and possible." },
  ],
  WORK_PURPOSE: [
    { type: "reflection", title: "Work as Offering", text: "Devotional reflection: Offer today's labor for God's glory and others' good." },
    { type: "action", title: "Virtue Focus", text: "Devotional reflection: Practice diligence in one delayed task." },
    { type: "prayer", title: "Prayer for Integrity", text: "Devotional reflection: Ask for humility, focus, and perseverance." },
    { type: "journal", title: "Evening Examen", text: "Devotional reflection: Review where you served with love at work." },
  ],
  GENERAL_GUIDANCE: [
    { type: "reflection", title: "Walk with the Lord", text: "Devotional reflection: Ask what one invitation God may be placing before you." },
    { type: "prayer", title: "Simple Prayer", text: "Devotional reflection: Pray slowly with trust and gratitude." },
    { type: "action", title: "Next Good Thing", text: "Devotional reflection: Choose one practical good act and complete it." },
  ],
  SAFETY_REVIEW: [
    { type: "reflection", title: "Seek Immediate Support", text: "Devotional reflection: Your safety matters and immediate help is important." },
    { type: "prayer", title: "Prayer for Protection", text: "Devotional reflection: Pray briefly and contact emergency support now." },
    { type: "action", title: "Reach Out", text: "Devotional reflection: Contact local emergency services or a trusted person immediately." },
  ],
};

const summarize = (userText: string): string =>
  `Devotional reflection summary: ${userText.slice(0, 180)}${userText.length > 180 ? "..." : ""}`;

export const buildPlan = (route: RouteLabel, user_text: string, saints: SaintMatch[]): DevotionPlan => {
  const parsed = generatePlanInputSchema.parse({ route, user_text, saints });

  if (parsed.route === "SAFETY_REVIEW") {
    return devotionPlanSchema.parse({
      primary_route: parsed.route,
      situation_summary: summarize(parsed.user_text),
      saint_matches: parsed.saints.slice(0, 3),
      devotion_prompts: routePromptTemplate.SAFETY_REVIEW.slice(0, 3),
      safety_note:
        "If you are in immediate danger, contact local emergency services now. You can also reach a trusted person or crisis line in your area.",
      sources_used: ["internal_guardrail_policy"],
    });
  }

  const prompts = routePromptTemplate[parsed.route].slice(0, 4);
  prompts.forEach((prompt) => assertGuardrails(prompt.text));

  return devotionPlanSchema.parse({
    primary_route: parsed.route,
    situation_summary: summarize(parsed.user_text),
    saint_matches: parsed.saints.slice(0, 3),
    devotion_prompts: prompts,
    safety_note: null,
    sources_used: ["sancti_seed_data", "route_prompt_template"],
  });
};

export default function handler(
  req: { body: { route: RouteLabel; user_text: string; saints: SaintMatch[] } },
  res: { status: (code: number) => { json: (payload: DevotionPlan) => void } },
): void {
  const plan = buildPlan(req.body.route, req.body.user_text, req.body.saints);
  res.status(200).json(plan);
}
