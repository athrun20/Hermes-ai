/**
 * Hermes Intelligence v2 — contracts (Phases 0–3).
 * Independent of the live dashboard pipeline. Not product source of truth.
 */

import type { CoinSymbol } from "@/lib/market-data";

export type IntelligenceStage =
  | "Market Data"
  | "Market Regime"
  | "Evidence Collection"
  | "Market Context"
  | "Technical Structure"
  | "Institutional Activity"
  | "Risk Assessment"
  | "Trader Profile"
  | "Historical Memory"
  | "Hermes Reasoning"
  | "Hermes Judgment"
  | "Decision"
  | "Coach Explanation";

export type EvidenceDirection = "Supportive" | "Contradictory" | "Neutral";

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
  | "Portfolio Exposure"
  | "Market Regime"
  | "Data Quality"
  | "Other Existing Adjustment";

export type EvidenceReliability = "Low" | "Medium" | "High";

export type EvidenceChartReference = {
  price?: number;
  label?: string;
};

export type HermesEvidence = {
  id: string;
  stage: IntelligenceStage;
  category: EvidenceCategory;
  claim: string;
  direction: EvidenceDirection;
  /** 0–100 claim strength (not a product confidence score). */
  strength: number;
  reliability: EvidenceReliability;
  sourceModules: string[];
  timestamp: number;
  symbol?: CoinSymbol;
  timeframe?: string;
  chartReference?: EvidenceChartReference;
  expiration?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type StructureRegime = "Trending" | "Range" | "Transition" | "Unclear";
export type VolatilityRegime = "Low" | "Normal" | "High" | "Extreme";
export type LiquidityRegime = "Healthy" | "Thin" | "Dislocated" | "Unknown";
export type EventRegime = "Normal" | "Elevated Event Risk" | "Event Driven" | "Unknown";
export type DirectionalBias = "Bullish" | "Bearish" | "Neutral" | "Mixed";
export type DataQuality = "Poor" | "Limited" | "Adequate" | "Good";

export type MarketRegime = {
  kind: "hermes-market-regime-v1";
  symbol: CoinSymbol;
  structureRegime: StructureRegime;
  volatilityRegime: VolatilityRegime;
  liquidityRegime: LiquidityRegime;
  eventRegime: EventRegime;
  directionalBias: DirectionalBias;
  summary: string;
  /** Confidence in the regime classification itself (not thesis confidence). */
  confidence: number;
  supportingSignals: string[];
  conflictingSignals: string[];
  sourceTimestamp: number;
  dataQuality: DataQuality;
};

/**
 * Phase 3 contribution row — packages existing reasoning evidence into an auditable line item.
 * `contribution` is a signed score delta (positive increases confidence, negative decreases).
 */
export type ConfidenceContribution = {
  category: EvidenceCategory;
  label: string;
  contribution: number;
  direction: EvidenceDirection;
  evidenceIds: string[];
  sourceModules: string[];
  explanation: string;
  reliability: EvidenceReliability;
  /** Optional legacy fields for weight/raw visibility */
  weight?: number;
  rawScore?: number;
  summary?: string;
};

export type ConfidenceAdjustment = {
  id: string;
  label: string;
  contribution: number;
  explanation: string;
  category: EvidenceCategory;
};

export type ConfidenceCapApplied = {
  id: string;
  label: string;
  /** Signed delta from applying the cap (typically negative when clamping down). */
  contribution: number;
  explanation: string;
  cap: number;
};

/**
 * Structured explanation of existing Reasoning Confidence.
 * finalScore must equal reasoning.confidenceScore for the same inputs.
 */
export type ConfidenceBreakdown = {
  kind: "hermes-confidence-breakdown-v1";
  baseScore: number;
  positiveContributions: ConfidenceContribution[];
  negativeContributions: ConfidenceContribution[];
  neutralContributions: ConfidenceContribution[];
  adjustments: ConfidenceAdjustment[];
  capsApplied: ConfidenceCapApplied[];
  dataQualityAdjustment: number;
  finalScore: number;
  /** Must be 0 after explicit residual reconciliation adjustment (if any). */
  reconciliationDifference: number;
  sourceTimestamp: number;
  maxConfidence: number;
  /** Convenience mirrors for coaching */
  supportiveDrivers: string[];
  reducingDrivers: string[];
  unresolvedConflicts: string[];
};

export type HermesJudgmentStance = "Take" | "Wait" | "Avoid" | "Manage";

/** Reserved for Phase 4 — not produced in Phases 0–3. */
export type HermesJudgment = {
  kind: "hermes-judgment-v1";
  wouldTakeTrade: boolean | "Conditional";
  stance: HermesJudgmentStance;
  reasons: string[];
  conditions: string[];
};

export type ConvictionSizingBias = "None" | "Reduced" | "Standard" | "Elevated";

/** Reserved for Phase 5 — internal only; never a primary UI metric. */
export type HermesConviction = {
  kind: "hermes-conviction-v1";
  level: number;
  sizingBias: ConvictionSizingBias;
  drivers: string[];
  note: string;
};

/**
 * Pipeline bundle contract. Phases 0–2 require regime + evidence.
 * Phase 3 can attach confidenceBreakdown without full reasoning authority.
 */
export type HermesIntelligenceBundle = {
  kind: "hermes-intelligence-bundle-v2";
  version: 2;
  symbol: CoinSymbol;
  generatedAt: number;
  regime: MarketRegime;
  evidence: HermesEvidence[];
  reasoning?: {
    thesis?: string;
    confidence: number;
    readiness?: number;
    confidenceBreakdown: ConfidenceBreakdown;
  };
  judgment?: HermesJudgment;
  conviction?: HermesConviction;
  decision?: {
    tradeQualityScore?: number;
  };
  coach?: {
    explanation: string;
  };
};
