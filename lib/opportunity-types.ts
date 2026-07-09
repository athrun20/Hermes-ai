import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { StrategyQuality, StrategyType } from "@/lib/strategy-types";

export type OpportunityTrend = "Bullish" | "Neutral" | "Bearish";
export type OpportunityRisk = "Low" | "Medium" | "High";
export type SetupType =
  | "Trend Continuation"
  | "Support Bounce"
  | "Breakout"
  | "Pullback"
  | "Range Reversal";
export type TraderDnaMatch = "Excellent Match" | "Moderate Match" | "Poor Match";
export type HermesVerdict =
  | "Worth Studying"
  | "Wait for Pullback"
  | "Observe Only"
  | "Excellent Practice Setup"
  | "Not Beginner Friendly";
export type MarketDirection = "Bullish" | "Neutral" | "Bearish";
export type MarketBreadth = "Strong" | "Mixed" | "Weak";
export type MarketVolatility = "Low" | "Medium" | "High";

export type MarketCandidate = {
  ticker: string;
  companyName: string;
  trend: OpportunityTrend;
  riskLevel: OpportunityRisk;
  potentialRewardPct: number;
  setupType: SetupType;
  aboveMovingAverages: boolean;
  volumeTrend: "Increasing" | "Stable" | "Fading";
  supportHeld: boolean;
  momentumScore: number;
  priceExtended: boolean;
  earningsSoon: boolean;
  sector: "Technology" | "Financials" | "Healthcare" | "Consumer" | "Energy";
};

export type MarketDataProvider = {
  getUniverseCount: () => number;
  getCandidates: () => MarketCandidate[];
  getPipelineStats: () => QualityPipeline;
  getMarketMood: () => MarketMood;
};

export type ConfidenceEngine = {
  analyzeConfidence: (candidate: MarketCandidate) => ConfidenceAnalysis;
};

export type LessonGenerator = {
  generateReasons: (candidate: MarketCandidate) => string[];
  generateCautions: (candidate: MarketCandidate) => string[];
  generateLesson: (candidate: MarketCandidate) => string;
  generateVerdict: (
    candidate: MarketCandidate,
    confidence: number,
    match: TraderDnaMatch,
  ) => HermesVerdict;
};

export type TraderDnaMatcher = {
  match: (
    candidate: MarketCandidate,
    memory?: HermesMemorySnapshot,
  ) => {
    traderDnaMatch: TraderDnaMatch;
    dnaExplanation: string;
  };
};

export type OpportunityStudy = {
  ticker: string;
  companyName: string;
  confidence: number;
  hermesScore: HermesScoreResult;
  confidenceBreakdown: ConfidenceBreakdownItem[];
  trend: OpportunityTrend;
  riskLevel: OpportunityRisk;
  potentialRewardPct: number;
  setupType: SetupType;
  strategyType: StrategyType;
  strategyScore: number;
  strategyQuality: StrategyQuality;
  reasons: string[];
  cautions: string[];
  lesson: string;
  hermesVerdict: HermesVerdict;
  traderDnaMatch: TraderDnaMatch;
  dnaExplanation: string;
};

export type OpportunityScannerSummary = {
  stocksAnalyzed: number;
  opportunitiesFound: number;
  averageHermesConfidence: number;
  marketMood: "Constructive" | "Selective" | "Defensive";
};

export type QualityPipeline = {
  stocksAnalyzed: number;
  passedTechnicalFilters: number;
  showedInstitutionalStrength: number;
  matchedTodayMarket: number;
  matchedTraderDna: number;
};

export type MarketMood = {
  todayMarket: MarketDirection;
  marketBreadth: MarketBreadth;
  volatility: MarketVolatility;
  sectorLeadership: string;
  interpretation: string;
};

export type ConfidenceBreakdownItem = {
  label: "Trend" | "Momentum" | "Volume" | "Support" | "Risk";
  score: number;
};

export type ConfidenceAnalysis = {
  score: number;
  breakdown: ConfidenceBreakdownItem[];
};

export type OpportunityScannerResult = {
  summary: OpportunityScannerSummary;
  pipeline: QualityPipeline;
  marketMood: MarketMood;
  opportunities: OpportunityStudy[];
};
