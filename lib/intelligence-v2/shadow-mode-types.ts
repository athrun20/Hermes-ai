/**
 * Intelligence v2 Shadow Mode contracts.
 * Internal only — never user-facing. Current dashboard pipeline remains authority.
 */

import type { CoinSymbol } from "@/lib/market-data";
import type { HermesIntelligenceProvenance } from "@/lib/intelligence-v2/types";

export type ComparableStatus = "Comparable" | "Partially Comparable" | "Not Comparable";

export type ShadowParityStatus = "Pass" | "Partial" | "Fail" | "Error" | "Skipped";

export type ShadowScalar = string | number | boolean | null;

export type ShadowFieldComparison = {
  field: string;
  currentValue: ShadowScalar;
  v2Value: ShadowScalar;
  comparableStatus: ComparableStatus;
  difference: string | number | null;
  tolerance: number | null;
  /** null when Not Comparable */
  passed: boolean | null;
  explanation: string;
};

/** Snapshot of current production pipeline values (authority). */
export type HermesShadowCurrentSnapshot = {
  symbol: CoinSymbol | string;
  timeframe?: string;
  confidence: number;
  readiness: number;
  readinessState?: string;
  tradeQualityScore?: number;
  hermesScore?: number;
  thesis?: string;
  marketContext?: string;
  coachMessage?: string;
  dataState?: string;
  hasOpenPosition: boolean;
};

/** Slim v2 snapshot extracted for comparison (not a second product surface). */
export type HermesShadowV2Snapshot = {
  confidence?: number;
  readiness?: number;
  tradeQualityScore?: number;
  hermesScore?: number;
  opinionSummary?: string;
  opinionStance?: string;
  judgmentStance?: string;
  convictionLevel?: string;
  convictionSizingBias?: string;
  coachHeadline?: string;
  coachExplanation?: string;
  dataQuality?: string;
  degraded?: boolean;
  managementPath?: boolean;
  bundleVersion?: number;
};

export type HermesShadowComparison = {
  kind: "hermes-shadow-comparison-v1";
  /** Explicit: shadow never becomes product authority. */
  authority: "current-pipeline";
  symbol: string;
  timeframe?: string;
  timestamp: number;
  currentSnapshot: HermesShadowCurrentSnapshot;
  v2Snapshot: HermesShadowV2Snapshot;
  comparisons: ShadowFieldComparison[];
  parityStatus: ShadowParityStatus;
  warnings: string[];
  missingInputs: string[];
  degraded: boolean;
  provenance?: HermesIntelligenceProvenance;
  error?: string;
  durationMs: number;
};
