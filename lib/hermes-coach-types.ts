import type { HermesIntelligenceLayer } from "@/lib/hermes-intelligence-layer";

export type HermesCoachMoment =
  | "morning-briefing-completed"
  | "trade-plan-created"
  | "decision-review-completed"
  | "paper-trade-executed"
  | "replay-finished"
  | "reflection-saved"
  | "end-of-day";

export type HermesCoachCategory =
  | "Preparation"
  | "Decision"
  | "Discipline"
  | "Risk"
  | "Reflection"
  | "Growth";

export type HermesCoachContext = {
  traderPersonality?: string;
  morningGoal?: string;
  livingScrollTitle?: string;
  disciplineScore?: number;
  disciplineStreak?: number;
  decisionRecommendation?: string;
  decisionConfidence?: number;
  tradeSymbol?: string;
  tradeOutcome?: "Win" | "Loss" | "Closed";
  replayLesson?: string;
  journalEmotion?: string;
  journalReason?: string;
  journalFollowedPlan?: string;
  intelligence?: HermesIntelligenceLayer;
};

export type HermesCoachMessage = {
  id: string;
  moment: HermesCoachMoment;
  category: HermesCoachCategory;
  title: string;
  message: string;
  actionLabel?: string;
};

export type HermesCoachTrigger = {
  moment: HermesCoachMoment;
  context?: HermesCoachContext;
};
