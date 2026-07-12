/**
 * Hermes Intelligence v2 — contracts (Phases 0–5 + Orchestrator).
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

/**
 * How strongly Hermes would act given Judgment/Opinion + regime/risk context.
 * Not Confidence, Readiness, Trade Quality, Judgment, or position size.
 * Internal only — never a primary UI metric.
 */
export type ConvictionLevel = "None" | "Low" | "Moderate" | "High";

/**
 * Descriptive risk posture only. Does NOT change paper position-size math.
 * "Eligible for Higher Risk" is not an order or size instruction.
 */
export type ConvictionSizingBias =
  | "No New Risk"
  | "Reduced Risk"
  | "Standard Risk"
  | "Eligible for Higher Risk";

/**
 * Hermes Conviction — pure internal stage.
 * Answers: how strongly would Hermes act on Judgment/Opinion under current constraints?
 * Does not recompute Confidence/Readiness/TQ, size positions, or emit Buy/Sell.
 */
export type HermesConviction = {
  kind: "hermes-conviction-v1";
  level: ConvictionLevel;
  sizingBias: ConvictionSizingBias;
  summary: string;
  primaryDriver: string;
  supportingDrivers: string[];
  reducingDrivers: string[];
  riskConstraints: string[];
  conditionsForIncrease: string[];
  conditionsForDecrease: string[];
  sourceTimestamp: number;
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

/** Freshness label for provenance — never implies a new score. */
export type DataFreshness = "live" | "delayed" | "stale" | "fixture" | "unknown";

export type StageStatus = "ok" | "degraded" | "skipped" | "missing";

/** Per-stage provenance for audit / coaching transparency. */
export type StageProvenance = {
  stage: string;
  sourceModules: string[];
  sourceTimestamp: number;
  inputRefs: string[];
  limitations: string[];
  freshness: DataFreshness;
  status: StageStatus;
};

export type HermesIntelligenceProvenance = {
  stages: StageProvenance[];
  overallFreshness: DataFreshness;
  sourceModules: string[];
  limitations: string[];
};

/**
 * Coach-ready fields derived only from the composed bundle.
 * Not a second coaching engine. No Buy/Sell language.
 */
export type HermesCoachReady = {
  headline: string;
  explanation: string;
  primaryRisk: string;
  nextFocus: string;
  conditionsToProceed: string[];
  conditionsToAvoid: string[];
  sourceEvidenceIds: string[];
};

/**
 * Decision / Trade Quality / Hermes Score references only.
 * Orchestrator never recomputes these.
 */
export type HermesDecisionPackage = {
  source: "supplied" | "absent";
  tradeQualityScore?: number;
  tradeQualityGrade?: string;
  tradeQualityLabel?: string;
  tradeQualitySummary?: string;
  suggestedNextAction?: string;
  riskReward?: number | null;
  planCompleteness?: number;
  decisionRecommendation?: string;
  decisionConfidence?: number;
  /** Secondary score reference when caller supplied Hermes Score — not recomputed. */
  hermesScore?: number;
  hermesScoreLabel?: string;
};

/**
 * Reasoning package on the bundle — mirrors existing ReasoningResult scores.
 * confidenceBreakdown is attached when packaging succeeds; scores are not recomputed.
 */
export type HermesReasoningPackage = {
  source: "supplied" | "absent";
  thesis?: string;
  confidence?: number;
  readiness?: number;
  readinessState?: string;
  readinessBlockers?: string[];
  recommendedAction?: string;
  riskQuality?: string;
  traderFit?: string;
  dataState?: "Ready" | "Insufficient Data" | "Stale";
  coachingMessage?: string;
  confirmationConditions?: string[];
  invalidationConditions?: string[];
  timestamp?: number;
};

/**
 * Full Intelligence v2 bundle produced by `runHermesIntelligence`.
 * Composition boundary only — not product UI source of truth until wired.
 */
export type HermesIntelligenceBundle = {
  kind: "hermes-intelligence-bundle-v2";
  version: 2;
  symbol: CoinSymbol;
  timeframe?: string;
  generatedAt: number;
  sourceTimestamp: number;
  dataQuality: DataQuality;
  /** True when one or more stages degraded or were skipped due to incomplete inputs. */
  degraded: boolean;
  warnings: string[];
  regime: MarketRegime;
  evidence: HermesEvidence[];
  reasoning: HermesReasoningPackage;
  confidenceBreakdown?: ConfidenceBreakdown;
  judgment: HermesJudgment;
  opinion?: HermesOpinion;
  conviction: HermesConviction;
  decision: HermesDecisionPackage;
  coach: HermesCoachReady;
  provenance: HermesIntelligenceProvenance;
};
