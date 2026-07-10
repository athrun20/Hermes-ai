import type { OpportunityScore } from "@/lib/hermes-brain";
import type { HermesIntelligenceLayer } from "@/lib/hermes-intelligence-layer";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";
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
  hermesScore?: HermesScoreResult;
  tradeQuality?: TradeQualityResult;
  intelligence?: HermesIntelligenceLayer;
};

export type DecisionChecklistItem = {
  id: string;
  section: "Plan" | "Risk" | "Market" | "You";
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
  hermesScore?: HermesScoreResult;
  tradeQualityResult?: TradeQualityResult;
  tradeQuality: DecisionQuality;
  disciplineScoreImpact: number;
  recommendation: DecisionRecommendation;
  mentorNote: string;
  whyNotPerfect: string;
  finalThought: string;
  wisdomEarned: number;
  riskReward: number | null;
  checklist: DecisionChecklistItem[];
};
