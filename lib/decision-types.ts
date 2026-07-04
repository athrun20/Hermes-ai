import type { OpportunityScore } from "@/lib/hermes-brain";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { AssetQuote } from "@/lib/market-data";
import type { OrderAction, PositionSide, PortfolioSnapshot } from "@/lib/paper-trading";

export type DecisionMood = "Bullish" | "Neutral" | "Bearish";

export type DecisionReviewTicket = {
  action: OrderAction;
  side: PositionSide;
  notional: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type DecisionContext = {
  ticket: DecisionReviewTicket;
  quote: AssetQuote;
  portfolio: PortfolioSnapshot;
  opportunity: OpportunityScore;
  memory: HermesMemorySnapshot;
  marketMood: DecisionMood;
  dailyGoal: string;
};

export type DecisionChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type DecisionRecommendation =
  | "Ready to Practice"
  | "Wait for Pullback"
  | "Reduce Position Size"
  | "Observe Instead"
  | "Not Beginner Friendly";

export type DecisionQuality = "Excellent" | "Good" | "Developing" | "Needs Patience";

export type DecisionReview = {
  kind: "hermes-decision-review";
  symbol: AssetQuote["symbol"];
  action: OrderAction;
  side: PositionSide;
  confidence: number;
  tradeQuality: DecisionQuality;
  disciplineScoreImpact: number;
  recommendation: DecisionRecommendation;
  mentorNote: string;
  riskReward: number | null;
  checklist: DecisionChecklistItem[];
};
