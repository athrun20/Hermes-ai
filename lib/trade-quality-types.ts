import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { PortfolioSnapshot, PositionSide } from "@/lib/paper-trading";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { ReasoningResult } from "@/lib/reasoning-types";

export type TradeQualityCategory =
  | "Trend"
  | "Momentum"
  | "Volume"
  | "Structure"
  | "Multi-Timeframe Alignment"
  | "Institutional Footprint"
  | "News Context"
  | "Entry Quality"
  | "Stop Quality"
  | "Target Quality"
  | "Risk / Reward"
  | "Position Size"
  | "Strategy Fit"
  | "Trader DNA Fit"
  | "Daily Goal Alignment"
  | "Plan Completeness";

export type TradeQualityStatus = "Strong" | "Constructive" | "Needs Work" | "Weak";

export type TradeQualityGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "D" | "F";

export type TradeQualityBreakdownItem = {
  category: TradeQualityCategory;
  earned: number;
  max: number;
  percentage: number;
  status: TradeQualityStatus;
  reason: string;
};

export type TradeQualityCap = {
  id: string;
  cap: number;
  reason: string;
};

export type TradeQualityPlan = {
  side: PositionSide;
  notional: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type TradeQualityContext = {
  symbol: string;
  price: number;
  plan: TradeQualityPlan;
  portfolio?: PortfolioSnapshot;
  vision: HermesVisionResult;
  visionContext: HermesVisionContext;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  strategy: StrategyIntelligenceResult;
  news: NewsIntelligenceResult;
  memory: HermesMemorySnapshot;
  dailyGoal: string;
  reasoning?: ReasoningResult;
};

export type TradeQualityResult = {
  kind: "hermes-trade-quality-v1";
  symbol: string;
  score: number;
  rawScore: number;
  grade: TradeQualityGrade;
  label: string;
  breakdown: TradeQualityBreakdownItem[];
  strengths: string[];
  weaknesses: string[];
  missingRequirements: string[];
  improvements: string[];
  whyNotAPlus: string[];
  summary: string;
  suggestedNextAction: "Ready for Decision Review" | "Wait for Confirmation" | "Revise Trade" | "Observe Only" | "Avoid for Now";
  capsApplied: TradeQualityCap[];
  strongestFactor: TradeQualityBreakdownItem;
  weakestFactor: TradeQualityBreakdownItem;
  riskReward: number | null;
  planCompleteness: number;
};
