import { classifierInputSchema, classifierResultSchema } from "../lib/validator";
import type { ClassifierResult, RouteLabel } from "../types";

const routeKeywords: Record<RouteLabel, string[]> = {
  VOCATION_DISCERNMENT: ["discern", "calling", "vocation", "purpose", "decision"],
  SUFFERING_HARDSHIP: ["grief", "anxiety", "depressed", "sick", "suffering", "pain"],
  RELATIONSHIPS_FAMILY: ["marriage", "spouse", "family", "parent", "friend", "forgive"],
  WORK_PURPOSE: ["work", "career", "job", "burnout", "boss", "study"],
  GENERAL_GUIDANCE: ["pray", "faith", "guidance"],
  SAFETY_REVIEW: ["self-harm", "suicide", "hurt myself", "abuse", "danger"],
};

const scoreRoute = (text: string, route: RouteLabel): number =>
  routeKeywords[route].reduce((score, keyword) => (text.includes(keyword) ? score + 1 : score), 0);

export const classifyInput = (user_text: string): ClassifierResult => {
  const parsed = classifierInputSchema.parse({ user_text });
  const lower = parsed.user_text.toLowerCase();
  const sortedRoutes = (Object.keys(routeKeywords) as RouteLabel[])
    .map((route) => ({ route, score: scoreRoute(lower, route) }))
    .sort((a, b) => b.score - a.score);

  const primary = sortedRoutes[0];
  const secondary = sortedRoutes[1];
  const confidence = Math.min(0.98, primary.score === 0 ? 0.35 : 0.55 + primary.score * 0.1);

  const themes = lower
    .split(/[^a-z]+/)
    .filter((word) => word.length > 4)
    .slice(0, 6);

  const result: ClassifierResult = {
    primary_route: primary.route,
    secondary_route: secondary.score > 0 ? secondary.route : null,
    confidence,
    themes: themes.length ? themes : ["prayer", "discernment"],
    needs_clarification: confidence < 0.5,
  };

  return classifierResultSchema.parse(result);
};

export default function handler(req: { body: { user_text: string } }, res: { status: (code: number) => { json: (payload: ClassifierResult) => void } }): void {
  const result = classifyInput(req.body.user_text);
  res.status(200).json(result);
}
