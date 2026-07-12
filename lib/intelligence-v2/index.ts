/**
 * Hermes Intelligence v2 — Phases 0–5 Opinion + Conviction public surface.
 * Independent of dashboard composition. Not product source of truth.
 */

export type {
  ConfidenceAdjustment,
  ConfidenceBreakdown,
  ConfidenceCapApplied,
  ConfidenceContribution,
  ConvictionLevel,
  ConvictionSizingBias,
  DataQuality,
  DirectionalBias,
  EventRegime,
  EvidenceCategory,
  EvidenceChartReference,
  EvidenceDirection,
  EvidenceReliability,
  HermesConviction,
  HermesEvidence,
  HermesIntelligenceBundle,
  HermesJudgment,
  HermesJudgmentStance,
  HermesOpinion,
  HermesOpinionEvidenceRef,
  IntelligenceStage,
  JudgmentRegimeEffect,
  JudgmentTraderFitEffect,
  LiquidityRegime,
  MarketRegime,
  StructureRegime,
  VolatilityRegime,
} from "@/lib/intelligence-v2/types";

export { buildMarketRegime, type MarketRegimeInput } from "@/lib/intelligence-v2/market-regime";

export {
  collectHermesEvidence,
  type CollectEvidenceInput,
} from "@/lib/intelligence-v2/collect-evidence";

export { dedupeHermesEvidence, type DedupeOptions } from "@/lib/intelligence-v2/dedupe-evidence";

export {
  adaptFootprintEvidence,
  adaptMemoryDnaEvidence,
  adaptMultiTimeframeEvidence,
  adaptNewsEvidence,
  adaptRegimeEvidence,
  adaptSmartChartEvidence,
  adaptVisionEvidence,
} from "@/lib/intelligence-v2/evidence-adapters";

export {
  packageConfidenceBreakdown,
  assertConfidenceParity,
  reconstructTotal,
  type PackageConfidenceBreakdownInput,
} from "@/lib/intelligence-v2/confidence-breakdown";

export {
  buildHermesJudgment,
  buildRegimeEffect,
  buildTraderFitEffect,
  isRegimeCaution,
  isRegimeHostile,
  type BuildHermesJudgmentInput,
  type JudgmentPlanInput,
  type JudgmentProfileInput,
} from "@/lib/intelligence-v2/judgment";

export {
  buildHermesOpinion,
  isJudgmentStance,
  opinionContainsTradeCommands,
  type BuildHermesOpinionInput,
} from "@/lib/intelligence-v2/opinion";

export {
  buildHermesConviction,
  convictionContainsSizeRecommendations,
  convictionContainsTradeCommands,
  type BuildHermesConvictionInput,
} from "@/lib/intelligence-v2/conviction";
