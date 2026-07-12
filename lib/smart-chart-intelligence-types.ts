/**
 * Smart Chart Intelligence contracts (v1 + v2).
 * Chart teaching only — never product market scores or trade execution.
 */

import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesVisionContext, HermesVisionLabel, HermesVisionResult } from "@/lib/hermes-vision-types";
import type {
  ConfidenceContribution,
  HermesEvidence,
  MarketRegime,
} from "@/lib/intelligence-v2/types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { Candle } from "@/lib/market-data";

export type SmartChartAnnotationKind =
  | "structure"
  | "structure-break"
  | "breakout"
  | "retest"
  | "support-resistance"
  | "vwap"
  | "ema"
  | "volume"
  | "liquidity"
  | "zone"
  | "footprint"
  | "momentum"
  | "news"
  | "higher-high"
  | "lower-low"
  | "failed-breakout"
  | "demand-zone"
  | "supply-zone";

export type SmartChartAnnotation = HermesVisionLabel & {
  kind: SmartChartAnnotationKind;
  /** Optional evidence linkage (Intelligence v2 / internal). */
  evidenceIds?: string[];
};

/** Session sequence of important chart teaching events. */
export type MarketStoryEvent = {
  id: string;
  timestamp: number;
  sequence: number;
  title: string;
  kind: SmartChartAnnotationKind | string;
  whatHappened: string;
  whyItMatters: string;
  thesisImpact: string;
  confidenceDelta: number;
  tone: HermesVisionLabel["tone"];
  price?: number;
  sourceModules: string[];
  evidenceIds?: string[];
};

/** Explains a major Confidence-related teaching delta (chart coaching only). */
export type ConfidenceHistoryEntry = {
  id: string;
  timestamp: number;
  confidenceDelta: number;
  /** Human label for the event that drove the delta. */
  causeLabel: string;
  /** Concise explanation of why confidence teaching signal moved. */
  reason: string;
  sourceEventId: string;
  direction: "up" | "down" | "flat";
  sourceModules: string[];
  /** Optional mirrored thesis confidence at build time (not a new score). */
  confidenceSnapshot?: number | null;
};

export type SmartChartIntelligenceInput = {
  candles: Candle[];
  context: HermesVisionContext;
  vision: HermesVisionResult;
  reasoning: ReasoningResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  news: NewsIntelligenceResult;
  /**
   * Optional Intelligence v2 outputs used for dynamic annotation generation.
   * Does not recalculate product Confidence / Readiness / TQ.
   */
  intelligence?: {
    regime?: MarketRegime;
    evidence?: HermesEvidence[];
    confidenceContributions?: ConfidenceContribution[];
    /** Mirrored current thesis confidence for history context only. */
    currentConfidence?: number;
  };
  /** Deterministic clock for tests. */
  now?: number;
};

/**
 * v2 result — chart teaching surface.
 * Keeps v1 fields (annotations, confidenceDelta, thesisImpact) for compatibility.
 */
export type SmartChartIntelligenceResult = {
  kind: "hermes-smart-chart-intelligence-v2";
  annotations: SmartChartAnnotation[];
  confidenceDelta: number;
  thesisImpact: string;
  marketStory: MarketStoryEvent[];
  confidenceHistory: ConfidenceHistoryEntry[];
  /** Active annotation count after ranking (3–5). */
  activeAnnotationCount: number;
};

/** Legacy kind still accepted by evidence adapters. */
export type SmartChartIntelligenceResultV1 = {
  kind: "hermes-smart-chart-intelligence-v1";
  annotations: SmartChartAnnotation[];
  confidenceDelta: number;
  thesisImpact: string;
};

export type AnySmartChartIntelligenceResult =
  | SmartChartIntelligenceResult
  | SmartChartIntelligenceResultV1;

export const SMART_CHART_MAX_ANNOTATIONS = 5;
export const SMART_CHART_MIN_ANNOTATIONS = 3;
export const SMART_CHART_STORY_MAX = 8;
export const SMART_CHART_HISTORY_MAX = 8;
