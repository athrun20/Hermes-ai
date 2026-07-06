import type { HermesCoachCategory, HermesCoachMoment } from "@/lib/hermes-coach-types";

export const coachCategoryByMoment: Record<HermesCoachMoment, HermesCoachCategory> = {
  "morning-briefing-completed": "Preparation",
  "trade-plan-created": "Decision",
  "decision-review-completed": "Discipline",
  "paper-trade-executed": "Risk",
  "replay-finished": "Reflection",
  "reflection-saved": "Growth",
  "end-of-day": "Growth",
};

export const coachTitlesByCategory: Record<HermesCoachCategory, string> = {
  Preparation: "Preparation",
  Decision: "Decision",
  Discipline: "Discipline",
  Risk: "Risk",
  Reflection: "Reflection",
  Growth: "Growth",
};
