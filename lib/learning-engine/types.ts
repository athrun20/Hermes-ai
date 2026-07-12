/**
 * Hermes Learning Engine — contracts (Phase 1).
 *
 * Trader Learning Intelligence is separate from Market Intelligence (intelligence-v2).
 * Learning Engine outputs coaching memory only — never market scores or execution.
 */

import type { CoinSymbol } from "@/lib/market-data";

export type LearningEventType =
  | "TradeCompleted"
  | "TradeReviewed"
  | "JournalReflectionAdded"
  | "ReplayCompleted"
  | "CoachingFeedbackReceived";

export type LearningEventOutcome =
  | "Win"
  | "Loss"
  | "Breakeven"
  | "Neutral"
  | "Incomplete";

export type LearningEventSource =
  | "paper-trading"
  | "decision-journal"
  | "replay-mode"
  | "coach"
  | "manual"
  | "system";

/**
 * Typed learning event — append-only intake for the Learning Engine.
 * Does not store unlimited raw tape; consumers summarize into memory.
 */
export type LearningEvent = {
  id: string;
  timestamp: number;
  eventType: LearningEventType;
  source: LearningEventSource | string;
  symbol?: CoinSymbol | string;
  timeframe?: string;
  strategyContext?: string;
  outcome?: LearningEventOutcome;
  tags: string[];
  metadata?: Record<string, string | number | boolean | null>;
};

export type TradeQualityBand = "High" | "Medium" | "Low" | "Unknown";
export type HoldBucket = "Scalp" | "Intraday" | "Swing" | "Unknown";
export type PnlSign = "positive" | "negative" | "flat";

/**
 * Compact trade summary retained in long-term memory (not raw order history).
 */
export type TradeLearningSummary = {
  eventId: string;
  timestamp: number;
  symbol?: string;
  timeframe?: string;
  strategyContext?: string;
  outcome: LearningEventOutcome;
  pnlSign: PnlSign;
  followedPlan?: boolean;
  qualityBand: TradeQualityBand;
  holdBucket: HoldBucket;
  tags: string[];
};

export type BehaviorKey =
  | "good_risk_control"
  | "strong_patience"
  | "good_trend_identification"
  | "good_entry_timing"
  | "good_exit_discipline"
  | "entering_too_early"
  | "chasing_breakouts"
  | "ignoring_stops"
  | "overtrading"
  | "trading_against_htf"
  | "revenge_trading"
  | "plan_followed"
  | "plan_broken";

export type BehaviorCountMap = Partial<Record<BehaviorKey, number>>;

/**
 * Summarized long-term trader memory — capped, not unlimited history.
 */
export type TraderMemoryStore = {
  kind: "hermes-trader-memory-v1";
  version: 1;
  updatedAt: number;
  eventCount: number;
  /** Recently seen event ids for dedupe (capped). */
  seenEventIds: string[];
  /** Rolling summarized trades (capped). */
  tradeSummaries: TradeLearningSummary[];
  /** Aggregated observable behavior counts. */
  behaviorCounts: BehaviorCountMap;
  /** Short lesson strings retained from reviews/journals (capped). */
  lessonSummaries: string[];
  lastEventAt?: number;
};

export type TrendDirection = "Improving" | "Stable" | "Declining" | "Insufficient Data";

export type DetectedPattern = {
  key: BehaviorKey | string;
  label: string;
  kind: "strength" | "weakness" | "success_pattern" | "recurring_mistake";
  occurrences: number;
  evidence: string[];
  /** False when sample size is too small to claim a pattern. */
  reliable: boolean;
};

/**
 * Personalized trader learning profile — coaching authority only.
 * Never a market score.
 */
export type TraderLearningProfile = {
  kind: "hermes-trader-learning-profile-v1";
  generatedAt: number;
  strengths: string[];
  improvementAreas: string[];
  recurringMistakes: string[];
  successfulPatterns: string[];
  disciplineTrend: TrendDirection;
  executionTrend: TrendDirection;
  learningSummary: string;
  /** 0–100 confidence in the profile given sample size / consistency. */
  confidenceInProfile: number;
  sampleSize: number;
  patterns: DetectedPattern[];
};

/**
 * Future-ready coaching memory object — not displayed in UI in Phase 1.
 */
export type HermesCoachMemory = {
  kind: "hermes-coach-memory-v1";
  generatedAt: number;
  previousLesson: string;
  currentFocus: string;
  recommendedPractice: string;
  evidenceFromHistory: string[];
};

/** Caps keep memory bounded (summaries, not unlimited raw history). */
export const LEARNING_MEMORY_CAPS = {
  maxSeenEventIds: 200,
  maxTradeSummaries: 50,
  maxLessonSummaries: 20,
  minSampleForReliablePattern: 3,
  minSampleForProfileClaims: 5,
} as const;
