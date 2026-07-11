/**
 * Hermes Intelligence v2 — Phases 0–2 public surface.
 * Independent of dashboard composition. Not product source of truth.
 */

export type {
  ConfidenceBreakdown,
  ConfidenceContribution,
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
  IntelligenceStage,
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
