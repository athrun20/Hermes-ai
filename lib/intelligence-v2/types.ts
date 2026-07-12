/**
 * Hermes Intelligence v2 — contracts (Phases 0–5 Opinion).
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

/**
 * Phase 4 stance values — personal coach authority only.
 * Not Buy/Sell. Not a primary workspace metric.
 */
export type HermesJudgmentStance =
  | "Take"
  | "Take With Caution"
  | "Wait"
  | "Avoid"
  | "Manage Existing Position"
  | "Insufficient Data";

/**
 * How regime conditioned the judgment explanation (not a score).
 */
export type JudgmentRegimeEffect = {
  level: "Supportive" | "Neutral" | "Cautionary" | "Hostile" | "Unknown";
  summary: string;
  factors: string[];
};

/**
 * How trader DNA / memory conditioned judgment (coaching modifier only).
 */
export type JudgmentTraderFitEffect = {
  level: "Aligned" | "Neutral" | "Conflict" | "Unknown";
  summary: string;
  notes: string[];
};

/**
 * Phase 4 — personal take/don't-take stance (internal coach authority).
 * Distinct from Confidence, Trade Readiness, and Trade Quality.
 * Produced by `buildHermesJudgment` — does not recompute those scores.
 */
export type HermesJudgment = {
  kind: "hermes-judgment-v1";
  stance: HermesJudgmentStance;
  wouldTakeTrade: boolean | "Conditional";
  summary: string;
  primaryReason: string;
  supportingReasons: string[];
  blockingReasons: string[];
  conditionsToProceed: string[];
  conditionsToAvoid: string[];
  regimeEffect: JudgmentRegimeEffect;
  traderFitEffect: JudgmentTraderFitEffect;
  sourceTimestamp: number;
};

export type ConvictionSizingBias = "None" | "Reduced" | "Standard" | "Elevated";

/** Reserved — internal only; never a primary UI metric. Not produced in Phase 5 Opinion. */
export type HermesConviction = {
  kind: "hermes-conviction-v1";
  level: number;
  sizingBias: ConvictionSizingBias;
  drivers: string[];
  note: string;
};

/**
 * Traceable evidence line inside Hermes Opinion.
 * Points at Phase 2 evidence, Phase 3 breakdown rows, Judgment, or Regime — not new scores.
 */
export type HermesOpinionEvidenceRef = {
  /** Phase 2 HermesEvidence.id when available */
  evidenceId?: string;
  claim: string;
  category?: EvidenceCategory;
  direction: EvidenceDirection;
  source: "evidence" | "confidence-breakdown" | "judgment" | "regime";
  /** Claim strength or |contribution| for audit — not a product score */
  weightHint?: number;
};

/**
 * Phase 5 — Hermes Opinion (pure orchestration / coaching narrative).
 *
 * Answers what Hermes thinks and why, with full traceability to Regime,
 * Evidence, Confidence Breakdown, and Judgment. Does not recompute scores,
 * calculate Conviction, emit Buy/Sell, or grade Trade Quality.
 */
export type HermesOpinion = {
  kind: "hermes-opinion-v1";
  /** 1. What does Hermes think? */
  opinion: string;
  /** 2. Why? */
  why: string;
  /** 3. Supporting evidence (traceable) */
  supportingEvidence: HermesOpinionEvidenceRef[];
  /** 4. Contradicting evidence (traceable) */
  contradictingEvidence: HermesOpinionEvidenceRef[];
  /** 5. What would change Hermes' opinion? */
  whatWouldChangeOpinion: string[];
  /** 6. Biggest current risk */
  biggestRisk: string;
  /** 7. Most common trader mistake in this situation */
  commonTraderMistake: string;
  /** 8. What the trader should focus on next */
  nextFocus: string;
  /** Judgment stance echoed for audit (not recomputed) */
  stance: HermesJudgmentStance;
  /** Existing Confidence finalScore mirrored for context only */
  confidenceFinalScore: number;
  /** Optional readiness mirror when provided — not recomputed */
  readinessScore?: number;
  regimeSummary: string;
  /** All referenced evidence IDs for audit */
  sourceEvidenceIds: string[];
  sourceTimestamp: number;
  /** Compact one-line coach summary */
  summary: string;
};

/**
 * Pipeline bundle contract. Phases 0–2 require regime + evidence.
 * Phase 3 can attach confidenceBreakdown; Phase 4 judgment; Phase 5 opinion.
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
  opinion?: HermesOpinion;
  conviction?: HermesConviction;
  decision?: {
    tradeQualityScore?: number;
  };
  coach?: {
    explanation: string;
  };
};
