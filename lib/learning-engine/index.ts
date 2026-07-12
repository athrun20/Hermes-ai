/**
 * Hermes Learning Engine — Phase 1 public surface.
 *
 * Market Intelligence (lib/intelligence-v2) and Trader Learning (this module)
 * are separate systems. Learning Engine affects coaching memory only.
 */

export type {
  BehaviorCountMap,
  BehaviorKey,
  DetectedPattern,
  HermesCoachMemory,
  HoldBucket,
  LearningEvent,
  LearningEventOutcome,
  LearningEventSource,
  LearningEventType,
  PnlSign,
  TradeLearningSummary,
  TradeQualityBand,
  TraderLearningProfile,
  TraderMemoryStore,
  TrendDirection,
} from "@/lib/learning-engine/types";

export { LEARNING_MEMORY_CAPS } from "@/lib/learning-engine/types";

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
} from "@/lib/learning-engine/adapters";

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
  resetLearningMemoryCache,
  inspectLearningEngine,
  printLearningEngineInspection,
  registerLearningEngineDevHelper,
  type RecordLearningEventResult,
  type LearningEngineInspection,
} from "@/lib/learning-engine/service";
