/**
 * Hermes Intelligence v3 — contracts (Phase 0).
 *
 * Interpretation only: caveats, uncertainty, missing confirmations.
 * Does not recalculate Confidence, Trade Readiness, Trade Quality, or Hermes Score.
 */

import type { WorkspaceDataQuality } from "@/lib/market-data";

export type IntelligenceV3Severity =
  | "none"
  | "info"
  | "caution"
  | "block-process";

export type MentorCaveatCategory =
  | "data-quality"
  | "timeframe"
  | "readiness"
  | "plan-quality"
  | "alignment"
  | "regime"
  | "process";

export type MentorCaveat = {
  id: string;
  category: MentorCaveatCategory;
  severity: Exclude<IntelligenceV3Severity, "none">;
  title: string;
  detail: string;
  processGuidance: string;
};

export type MissingConfirmation = {
  id: string;
  label: string;
  whyItMatters: string;
  relatedMetric?: "confidence" | "tradeReadiness" | "tradeQuality" | "data" | "mtf";
};

export type ContextNote = {
  id: string;
  kind:
    | "fixture"
    | "delayed"
    | "live"
    | "unsupported-tf"
    | "unavailable"
    | "stale"
    | "partial"
    | "satellite"
    | "session"
    | "general";
  text: string;
};

export type IntelligenceV3AnalysisSurface =
  | "workspace"
  | "paper-trading"
  | "scanner"
  | "briefing"
  | "replay";

export type IntelligenceV3AnalysisMode = "practice" | "review" | "live-analysis";

/**
 * Pure input — all score fields are read-only mirrors of product authority.
 */
export type IntelligenceV3Input = {
  symbol: string;
  timeframe: string;

  confidence: {
    score: number;
    thesisSummary?: string;
  };

  tradeReadiness: {
    score: number;
    state?: string;
    blockers?: string[];
  };

  tradeQuality?: {
    score: number;
    grade?: string;
    notes?: string[];
  };

  dataQuality?: WorkspaceDataQuality;

  multiTimeframe?: {
    alignmentScore?: number;
    status?: string;
    pattern?: string;
    countertrendWarning?: string | null;
  };

  intelligenceV2Shadow?: {
    regime?: unknown;
    warnings?: string[];
    degraded?: boolean;
  };

  analysisContext?: {
    surface: IntelligenceV3AnalysisSurface;
    mode: IntelligenceV3AnalysisMode;
  };
};

export type IntelligenceV3Package = {
  kind: "hermes-intelligence-v3";

  /** Product scores echoed exactly — never recalculated. */
  mirrored: {
    confidenceScore: number;
    tradeReadinessScore: number;
    tradeQualityScore?: number;
  };

  headlineCaveat: string;
  severity: IntelligenceV3Severity;

  caveats: MentorCaveat[];

  uncertainty: {
    summary: string;
    drivers: string[];
    whatWouldReduceUncertainty: string[];
  };

  missingConfirmations: MissingConfirmation[];
  contextNotes: ContextNote[];

  flags: {
    isFixturePractice: boolean;
    isDelayedFeed: boolean;
    isLiveFeed: boolean;
    isDataUnavailable: boolean;
    isTimeframeUnsupported: boolean;
    hasMtfConflict: boolean;
    hasReadinessBlockers: boolean;
  };

  deterministicKey: string;
  warnings: string[];
};

/** Internal partial contributions from rule modules. */
export type RuleContribution = {
  caveats: MentorCaveat[];
  missingConfirmations: MissingConfirmation[];
  contextNotes: ContextNote[];
  uncertaintyDrivers: string[];
  reduceUncertainty: string[];
  warnings: string[];
};
