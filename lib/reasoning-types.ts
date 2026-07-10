import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { TradeQualityPlan, TradeQualityResult } from "@/lib/trade-quality-types";

export type ReasoningPipelineStage =
  | "Observe"
  | "Interpret"
  | "Challenge"
  | "Validate"
  | "Decide"
  | "Coach"
  | "Learn";

export type ReasoningMarketContext =
  | "Trending Bullish"
  | "Trending Bearish"
  | "Range"
  | "Compression"
  | "Expansion"
  | "High Volatility"
  | "Low Liquidity"
  | "Event-Driven"
  | "Unclear";

export type ReasoningStructure =
  | "Higher Highs and Higher Lows"
  | "Lower Highs and Lower Lows"
  | "Breakout"
  | "Failed Breakout"
  | "Retest"
  | "Liquidity Sweep"
  | "Accumulation"
  | "Distribution"
  | "Support Hold"
  | "Resistance Rejection"
  | "Structure Break"
  | "No Clear Structure";

export type ReasoningTrendQuality = "Strong" | "Moderate" | "Weak" | "Mixed" | "Exhausted";
export type ReasoningInstitutionalActivity =
  | "Accumulation"
  | "Distribution"
  | "Aggressive Buying"
  | "Aggressive Selling"
  | "Neutral"
  | "Unclear";
export type ReasoningRiskQuality = "Excellent" | "Good" | "Average" | "Poor" | "Unacceptable";
export type ReasoningRecommendedAction =
  | "Wait"
  | "Observe"
  | "Prepare"
  | "Validate"
  | "Avoid"
  | "Manage Existing Position";
export type EvidenceDirection = "Supportive" | "Contradictory" | "Neutral";
export type EvidenceImpact = "High" | "Medium" | "Low";
export type EvidenceCategory =
  | "Market Structure"
  | "Multi-Timeframe Alignment"
  | "Trend Quality"
  | "Institutional Activity"
  | "Volume Quality"
  | "Momentum"
  | "Risk/Reward"
  | "News and Event Risk"
  | "Trader DNA Fit"
  | "Trade Plan"
  | "Portfolio Exposure";
export type ReadinessState =
  | "Not Ready"
  | "Incomplete"
  | "Developing"
  | "Ready With Caution"
  | "High-Quality Setup";

export type ReasoningEvidence = {
  id: string;
  label: string;
  category: EvidenceCategory;
  direction: EvidenceDirection;
  impact: EvidenceImpact;
  confidenceContribution: number;
  explanation: string;
  sourceModule: string;
  timeframe?: string;
  timestamp: number;
};

export type ReasoningConfidenceExplanation = {
  baseConfidence: number;
  positiveContributors: ReasoningEvidence[];
  negativeContributors: ReasoningEvidence[];
  dataQualityAdjustment: number;
  traderDnaAdjustment: number;
  finalConfidence: number;
};

export type ReasoningScenario = {
  thesis: string;
  supportingConditions: string[];
  trigger: string;
  invalidation: string;
  likelyTargetZone: string;
  estimatedProbability: number;
  majorRisk: string;
};

export type ReasoningResult = {
  kind: "hermes-reasoning-v1";
  symbol: string;
  pipeline: ReasoningPipelineStage[];
  marketContext: ReasoningMarketContext;
  trendQuality: ReasoningTrendQuality;
  marketStructure: ReasoningStructure;
  timeframeAlignment: string;
  institutionalActivity: ReasoningInstitutionalActivity;
  volumeQuality: string;
  momentumCondition: string;
  newsImpact: string;
  volatilityCondition: string;
  riskQuality: ReasoningRiskQuality;
  traderFit: string;
  supportingEvidence: ReasoningEvidence[];
  conflictingEvidence: ReasoningEvidence[];
  neutralEvidence: ReasoningEvidence[];
  invalidationConditions: string[];
  confirmationConditions: string[];
  recommendedAction: ReasoningRecommendedAction;
  confidenceScore: number;
  confidenceDrivers: string[];
  confidenceReducers: string[];
  confidenceExplanation: ReasoningConfidenceExplanation;
  tradeReadinessScore: number;
  readinessState: ReadinessState;
  readinessBlockers: string[];
  bullCase: ReasoningScenario;
  bearCase: ReasoningScenario;
  coachingMessage: string;
  reasoningSummary: string;
  dataState: "Ready" | "Insufficient Data" | "Stale";
  timestamp: number;
};

export type ReasoningSnapshot = {
  id: string;
  symbol: string;
  timestamp: number;
  phase: "Initial Thesis" | "Entry Thesis" | "Mid-Trade Thesis" | "Exit Thesis" | "Final Market Outcome";
  confidenceScore: number;
  tradeReadinessScore: number;
  thesis: string;
  marketState: {
    marketContext: ReasoningMarketContext;
    marketStructure: ReasoningStructure;
    trendQuality: ReasoningTrendQuality;
    riskQuality: ReasoningRiskQuality;
  };
  evidence: ReasoningEvidence[];
};

export type ReasoningEngineInput = {
  context: HermesVisionContext;
  vision: HermesVisionResult;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
  news?: NewsIntelligenceResult;
  strategy?: StrategyIntelligenceResult;
  hermesScore?: HermesScoreResult;
  tradeQuality?: TradeQualityResult;
  memory?: HermesMemorySnapshot;
  portfolio?: PortfolioSnapshot;
  plan?: TradeQualityPlan;
  previousReasoning?: ReasoningResult;
};
