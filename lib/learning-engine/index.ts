/**
 * Hermes Learning Engine — Phase 1–4 public surface.
 *
 * Market Intelligence (lib/intelligence-v2) and Trader Learning (this module)
 * are separate systems. Learning Engine affects coaching memory only.
 * Phase 4 surfaces read-only personalized coaching via existing Hermes Coach.
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

export {
  learningCoachingToCoachMessage,
  stablePersonalizedMessageId,
  buildEvidenceLabel,
  buildImprovementSentence,
  buildStrengthSentence,
  weeklyLearningToBriefLines,
  type PersonalizedCoachPresentation,
  type PersonalizedCoachMode,
  type WeeklyLearningBriefLines,
} from "@/lib/learning-engine/coach-presentation";

export {
  resolveCoachDisplayLane,
  canSurfacePersonalizedLearning,
  coachLanePriorityRank,
  HIGH_PRIORITY_COACH_MOMENTS,
  type CoachDisplayLane,
  type CoachPriorityContext,
} from "@/lib/learning-engine/coach-priority";

export {
  createEmptyLearningCoachDisplayState,
  shouldShowPersonalizedMessage,
  applyMessageShown,
  applyMessageDismissed,
  loadLearningCoachDisplayState,
  saveLearningCoachDisplayState,
  PERSONALIZED_COACH_COOLDOWN_MS,
  LEARNING_COACH_DISPLAY_STORAGE_KEY,
  type LearningCoachDisplayState,
  type PersonalizedShowDecision,
} from "@/lib/learning-engine/coach-cooldown";

export {
  buildPersonalizedHermesCoachMessage,
  presentationToHermesCoachMessage,
  recordPersonalizedCoachDismiss,
  buildPersonalizedHabitAdviceLine,
  getWeeklyLearningBriefLinesSafe,
  type BuildPersonalizedCoachOptions,
  type PersonalizedCoachBuildResult,
} from "@/lib/learning-engine/coach-integration";
