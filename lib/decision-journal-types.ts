import type { CoinSymbol } from "@/lib/market-data";
import type { OrderAction, TradeGrade } from "@/lib/paper-trading";

export type DecisionReason =
  | "Trend continuation"
  | "Support bounce"
  | "Breakout"
  | "Pullback"
  | "News / catalyst"
  | "Impulse"
  | "Practice setup"
  | "Other";

export type DecisionEmotion =
  | "Calm"
  | "Confident"
  | "Nervous"
  | "Frustrated"
  | "Tired"
  | "FOMO";

export type PlanFollowResponse = "Yes" | "Partially" | "No";

export type DecisionReflection = {
  tradeId: string;
  reason: DecisionReason;
  emotion: DecisionEmotion;
  followedPlan: PlanFollowResponse;
  lesson: string;
  updatedAt: number;
};

export type DecisionJournalEntry = {
  tradeId: string;
  symbol: CoinSymbol;
  direction: `${OrderAction} / ${OrderAction}`;
  entry: number;
  exit: number;
  pnl: number;
  outcome: "Win" | "Loss" | "Closed";
  hermesConfidence: number;
  hermesRecommendation: string;
  tradeQuality: string;
  disciplineImpact: number;
  wisdomEarned: number;
  traderDnaMatch: string;
  dailyGoalMatch: string;
  riskReward: number | null;
  positionSize: number;
  dateTime: number;
  grade: TradeGrade;
  needsReview: boolean;
  followedPlan: boolean;
  reflection?: DecisionReflection;
};

export type DecisionJournalFilter =
  | "All"
  | "Wins"
  | "Losses"
  | "High Discipline"
  | "Needs Review"
  | "Followed Plan"
  | "Broke Plan";

export type DecisionJournalSummary = {
  totalDecisions: number;
  averageHermesConfidence: number;
  averageDisciplineImpact: number;
  totalWisdomEarned: number;
  mostCommonEmotion: string;
  mostCommonMistake: string;
  hermesInsight: string;
};
