/**
 * Hermes Learning Engine — Phase 1–3 public surface.
 *
 * Market Intelligence (lib/intelligence-v2) and Trader Learning (this module)
 * are separate systems. Learning Engine affects coaching memory only.
 */

export type {
  BehaviorCountMap,
  BehaviorKey,
  CoachingEvidence,
  DataSufficiency,
  DetectedPattern,
  HermesCoachMemory,
  HoldBucket,
  LearningEvent,
  LearningEventOutcome,
  LearningEventSource,
  LearningEventType,
  PersonalizedCoachingSummary,
  PnlSign,
  TradeLearningSummary,
  TradeQualityBand,
  TraderLearningProfile,
  TraderMemoryStore,
  TrendDirection,
  WeeklyLearningReview,
} from "@/lib/learning-engine/types";

export { LEARNING_MEMORY_CAPS, COACHING_DATA_THRESHOLDS } from "@/lib/learning-engine/types";

export {
  createLearningEvent,
  createTradeCompletedEvent,
  createTradeReviewedEvent,
  createJournalReflectionEvent,
  createReplayCompletedEvent,
  createCoachingFeedbackEvent,
  outcomeFromPnl,
  type CreateLearningEventInput,
  type TradeCompletedInput,
} from "@/lib/learning-engine/events";

export {
  createEmptyTraderMemoryStore,
  ingestLearningEvent,
  ingestLearningEvents,
  serializeTraderMemory,
  deserializeTraderMemory,
} from "@/lib/learning-engine/memory-store";

export { detectTraderPatterns } from "@/lib/learning-engine/pattern-detection";

export { buildTraderLearningProfile } from "@/lib/learning-engine/profile-builder";

export { buildHermesCoachMemory } from "@/lib/learning-engine/coach-memory";

export {
  paperTradeToLearningEvent,
  reviewToLearningEvent,
  journalToLearningEvent,
  replayToLearningEvent,
  shouldEmitTradeCompleted,
  type PaperTradeCloseKind,
  type PaperTradeLearningInput,
  type DecisionReflectionLearningInput,
  type DecisionJournalEntryLearningInput,
  type ReplaySessionLearningInput,
} from "@/lib/learning-engine/adapters";

export { buildLearningEventId, type LearningEventIdParts } from "@/lib/learning-engine/event-ids";

export {
  TRADER_MEMORY_STORAGE_KEY,
  loadTraderMemoryStore,
  saveTraderMemoryStore,
  clearTraderMemoryStorage,
  type LoadTraderMemoryResult,
  type PersistenceStatus,
} from "@/lib/learning-engine/persistence";

export {
  recordLearningEvent,
  ensureLearningMemoryLoaded,
  getLearningMemorySnapshot,
  getLearningProfileSnapshot,
  getPersonalizedCoachingSnapshot,
  getWeeklyLearningReviewSnapshot,
  resetLearningMemoryCache,
  inspectLearningEngine,
  printLearningEngineInspection,
  registerLearningEngineDevHelper,
  type RecordLearningEventResult,
  type LearningEngineInspection,
} from "@/lib/learning-engine/service";

export {
  dataSufficiencyFromSampleSize,
  canClaimRecurringBehavior,
  coachingConfidenceFromSufficiency,
} from "@/lib/learning-engine/data-sufficiency";

export {
  getPracticeExercise,
  patternKeyToPracticeFocus,
  type PracticeFocusKey,
  type PracticeExercise,
} from "@/lib/learning-engine/practice-library";

export { buildPersonalizedCoachingSummary } from "@/lib/learning-engine/personalized-coaching";

export {
  buildWeeklyLearningReview,
  resolveWeekWindow,
  type WeeklyReviewOptions,
} from "@/lib/learning-engine/weekly-review";
