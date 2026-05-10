import type { RouteLabel } from "../../types";
import { vocationRoutePrompt } from "./vocation";
import { sufferingRoutePrompt } from "./suffering";
import { familyRoutePrompt } from "./family";
import { workRoutePrompt } from "./work";
import { generalRoutePrompt } from "./general";
import { safetyRoutePrompt } from "./safety";

export const routePrompts: Record<RouteLabel, string> = {
  VOCATION_DISCERNMENT: vocationRoutePrompt,
  SUFFERING_HARDSHIP: sufferingRoutePrompt,
  RELATIONSHIPS_FAMILY: familyRoutePrompt,
  WORK_PURPOSE: workRoutePrompt,
  GENERAL_GUIDANCE: generalRoutePrompt,
  SAFETY_REVIEW: safetyRoutePrompt,
};

export {
  vocationRoutePrompt,
  sufferingRoutePrompt,
  familyRoutePrompt,
  workRoutePrompt,
  generalRoutePrompt,
  safetyRoutePrompt,
};
