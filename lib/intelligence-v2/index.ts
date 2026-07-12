/**
 * Hermes Intelligence v2 — Phases 0–5 + Orchestrator public surface.
 * Independent of dashboard composition. Not product source of truth.
 */

export type {
  ConfidenceAdjustment,
  ConfidenceBreakdown,
  ConfidenceCapApplied,
  ConfidenceContribution,
  ConvictionLevel,
  ConvictionSizingBias,
  DataFreshness,
  DataQuality,
  DirectionalBias,
  EventRegime,
  EvidenceCategory,
  EvidenceChartReference,
  EvidenceDirection,
  EvidenceReliability,
  HermesCoachReady,
  HermesConviction,
  HermesDecisionPackage,
  HermesEvidence,
  HermesIntelligenceBundle,
  HermesIntelligenceProvenance,
  HermesJudgment,
  HermesJudgmentStance,
  HermesOpinion,
  HermesOpinionEvidenceRef,
  HermesReasoningPackage,
  IntelligenceStage,
  JudgmentRegimeEffect,
  JudgmentTraderFitEffect,
  LiquidityRegime,
  MarketRegime,
  StageProvenance,
  StageStatus,
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

export {
  runHermesIntelligence,
  bundleContainsTradeCommands,
  bundleHasPositionSizeFields,
  type HermesIntelligenceInput,
} from "@/lib/intelligence-v2/orchestrator";

export type {
  ComparableStatus,
  HermesShadowComparison,
  HermesShadowCurrentSnapshot,
  HermesShadowV2Snapshot,
  ShadowFieldComparison,
  ShadowParityStatus,
  ShadowScalar,
} from "@/lib/intelligence-v2/shadow-mode-types";

export {
  buildShadowMemoKey,
  clearShadowComparisons,
  compareCurrentToV2,
  extractV2Snapshot,
  getLatestShadowComparison,
  getRecentShadowComparisons,
  isShadowModeEnabled,
  logShadowComparisonSummary,
  recordShadowComparison,
  runHermesShadowComparison,
  textsAreSemanticallySimilar,
  withShadowStoreReset,
  type RunHermesShadowComparisonInput,
} from "@/lib/intelligence-v2/shadow-mode";
