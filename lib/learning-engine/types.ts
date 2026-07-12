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

/**
 * Data-sufficiency ladder for coaching conclusions (Phase 3).
 * Never treat one mistake as a habit.
 */
export type DataSufficiency =
  | "Insufficient Data"
  | "Early Signal"
  | "Developing Pattern"
  | "Reliable Pattern";

/**
 * Structured evidence for a coaching conclusion (no raw journal text).
 */
export type CoachingEvidence = {
  behavior: string;
  observationCount: number;
  relevantSampleSize: number;
  dateRange: { start: number | null; end: number | null };
  sourceEventIds: string[];
  confidence: number;
  explanation: string;
};

/**
 * Deterministic personalized coaching summary — internal only in Phase 3.
 * Not a market score. Not user-facing chrome yet.
 */
export type PersonalizedCoachingSummary = {
  kind: "hermes-personalized-coaching-v1";
  headline: string;
  currentStrength: string;
  primaryImprovementArea: string;
  recurringPattern: string;
  disciplineTrend: TrendDirection;
  executionTrend: TrendDirection;
  currentFocus: string;
  recommendedPractice: string;
  evidenceFromHistory: CoachingEvidence[];
  confidenceInCoaching: number;
  sampleSize: number;
  dataSufficiency: DataSufficiency;
  generatedAt: number;
};

/**
 * Weekly learning review — rolling 7-day or optional calendar week.
 * Internal only in Phase 3.
 */
export type WeeklyLearningReview = {
  kind: "hermes-weekly-learning-review-v1";
  periodStart: number;
  periodEnd: number;
  tradesReviewed: number;
  wins: number;
  losses: number;
  planFollowRate: number | null;
  averageTradeGrade: string | null;
  strongestBehavior: string;
  mostFrequentMistake: string;
  disciplineTrend: TrendDirection;
  executionTrend: TrendDirection;
  progressSummary: string;
  keyLesson: string;
  nextWeekFocus: string;
  recommendedPractice: string;
  evidence: CoachingEvidence[];
  confidence: number;
  dataSufficiency: DataSufficiency;
  generatedAt: number;
};

/** Caps keep memory bounded (summaries, not unlimited raw history). */
export const LEARNING_MEMORY_CAPS = {
  maxSeenEventIds: 200,
  maxTradeSummaries: 50,
  maxLessonSummaries: 20,
  minSampleForReliablePattern: 3,
  minSampleForProfileClaims: 5,
} as const;

/** Sample-size thresholds for coaching data sufficiency. */
export const COACHING_DATA_THRESHOLDS = {
  insufficientMax: 2,
  earlySignalMax: 4,
  developingMax: 9,
  /** 10+ → Reliable Pattern (when behavior also repeats). */
  reliableMin: 10,
} as const;
