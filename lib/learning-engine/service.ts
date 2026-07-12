/**
 * Learning Engine integration service — single ingestion boundary.
 *
 * recordLearningEvent never throws into user workflows for ordinary failures.
 * Learning Engine remains coaching-only (no score / paper-trading changes).
 */

import { learningCoachingToCoachMessage } from "@/lib/learning-engine/coach-presentation";
import { ingestLearningEvent } from "@/lib/learning-engine/memory-store";
import {
  loadTraderMemoryStore,
  saveTraderMemoryStore,
  type PersistenceStatus,
} from "@/lib/learning-engine/persistence";
import { buildTraderLearningProfile } from "@/lib/learning-engine/profile-builder";
import { buildHermesCoachMemory } from "@/lib/learning-engine/coach-memory";
import { buildPersonalizedCoachingSummary } from "@/lib/learning-engine/personalized-coaching";
import { buildWeeklyLearningReview } from "@/lib/learning-engine/weekly-review";
import type {
  HermesCoachMemory,
  LearningEvent,
  PersonalizedCoachingSummary,
  TraderLearningProfile,
  TraderMemoryStore,
  WeeklyLearningReview,
} from "@/lib/learning-engine/types";

export type RecordLearningEventResult = {
  accepted: boolean;
  duplicate: boolean;
  store: TraderMemoryStore;
  profile: TraderLearningProfile;
  coachMemory: HermesCoachMemory;
  persistenceStatus: PersistenceStatus | "saved" | "save_failed";
  error?: string;
};

let cachedStore: TraderMemoryStore | null = null;
let sessionAccepted = 0;
let sessionDuplicatesIgnored = 0;
let lastPersistenceStatus: PersistenceStatus | "saved" | "save_failed" = "empty";

/**
 * Load memory into process cache (safe on startup / first use).
 */
export function ensureLearningMemoryLoaded(): TraderMemoryStore {
  if (cachedStore) return cachedStore;
  return refreshStoreFromPersistence();
}

/**
 * Re-read disk before ingest to reduce cross-tab duplicate acceptance.
 * Prefer disk when it has equal/more events; otherwise keep richer in-memory cache
 * (e.g. after a prior save failure).
 */
function refreshStoreFromPersistence(): TraderMemoryStore {
  const loaded = loadTraderMemoryStore();
  lastPersistenceStatus = loaded.recoveredFromMalformed
    ? "error"
    : loaded.status;
  if (!cachedStore || loaded.store.eventCount >= cachedStore.eventCount) {
    cachedStore = loaded.store;
  }
  return cachedStore;
}

/**
 * Validate + dedupe + ingest + persist. Never throws for ordinary storage issues.
 */
export function recordLearningEvent(event: LearningEvent): RecordLearningEventResult {
  try {
    validateEventShape(event);
    // Always consult latest persisted store before accept (reload integrity).
    const before = refreshStoreFromPersistence();
    const alreadySeen = before.seenEventIds.includes(event.id);
    if (alreadySeen) {
      sessionDuplicatesIgnored += 1;
      const profile = buildTraderLearningProfile(before);
      const coachMemory = buildHermesCoachMemory(profile, before);
      return {
        accepted: false,
        duplicate: true,
        store: before,
        profile,
        coachMemory,
        persistenceStatus: lastPersistenceStatus,
      };
    }

    const next = ingestLearningEvent(before, event);
    // ingestLearningEvent also dedupes; if unchanged, treat as duplicate
    if (next === before || next.eventCount === before.eventCount) {
      sessionDuplicatesIgnored += 1;
      const profile = buildTraderLearningProfile(before);
      const coachMemory = buildHermesCoachMemory(profile, before);
      return {
        accepted: false,
        duplicate: true,
        store: before,
        profile,
        coachMemory,
        persistenceStatus: lastPersistenceStatus,
      };
    }

    cachedStore = next;
    sessionAccepted += 1;

    let persistenceStatus: RecordLearningEventResult["persistenceStatus"] = lastPersistenceStatus;
    try {
      const saved = saveTraderMemoryStore(next);
      persistenceStatus = saved ? "saved" : "save_failed";
      lastPersistenceStatus = saved ? "ok" : "error";
      if (!saved) {
        devWarn("Learning Engine persistence save failed; workflow continues.");
      }
    } catch (error) {
      persistenceStatus = "save_failed";
      lastPersistenceStatus = "error";
      devWarn("Learning Engine persistence threw; workflow continues.", error);
    }

    const profile = buildTraderLearningProfile(next);
    const coachMemory = buildHermesCoachMemory(profile, next);
    return {
      accepted: true,
      duplicate: false,
      store: next,
      profile,
      coachMemory,
      persistenceStatus,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    devWarn("Learning Engine recordLearningEvent failed; workflow continues.", error);
    const store = cachedStore ?? createFallbackStore();
    const profile = buildTraderLearningProfile(store);
    const coachMemory = buildHermesCoachMemory(profile, store);
    return {
      accepted: false,
      duplicate: false,
      store,
      profile,
      coachMemory,
      persistenceStatus: "save_failed",
      error: message,
    };
  }
}

export function getLearningMemorySnapshot(): TraderMemoryStore {
  return ensureLearningMemoryLoaded();
}

export function getLearningProfileSnapshot(): TraderLearningProfile {
  return buildTraderLearningProfile(ensureLearningMemoryLoaded());
}

/** Reset in-memory cache (tests). Does not clear localStorage unless caller does. */
export function resetLearningMemoryCache(store?: TraderMemoryStore): void {
  cachedStore = store ?? null;
  if (!store) {
    sessionAccepted = 0;
    sessionDuplicatesIgnored = 0;
    lastPersistenceStatus = "empty";
  }
}

export type LearningEngineInspection = {
  totalAcceptedEvents: number;
  sessionAcceptedEvents: number;
  duplicateEventsIgnored: number;
  tradeSampleSize: number;
  detectedStrengths: string[];
  detectedImprovementAreas: string[];
  profileConfidence: number;
  persistenceStatus: PersistenceStatus | "saved" | "save_failed";
  schemaVersion: 1;
  eventCount: number;
  /** Phase 3 coaching (internal) */
  coachingHeadline: string;
  currentStrength: string;
  primaryImprovementArea: string;
  currentFocus: string;
  recommendedPractice: string;
  coachingConfidence: number;
  coachingDataSufficiency: string;
  coachingEvidenceCount: number;
  weeklyReviewSummary: string;
  weeklyDataSufficiency: string;
  weeklyEvidenceCount: number;
  /** Phase 4 presentation (internal) */
  presentationMessageId: string | null;
  presentationTitle: string | null;
  presentationEligible: boolean;
};

/**
 * Development-only inspection of Learning Engine memory + Phase 3–4 coaching.
 */
export function inspectLearningEngine(options?: {
  now?: number;
  timeZone?: string;
}): LearningEngineInspection {
  const store = ensureLearningMemoryLoaded();
  const profile = buildTraderLearningProfile(store, options?.now);
  const coaching = buildPersonalizedCoachingSummary(store, {
    profile,
    now: options?.now,
  });
  const weekly = buildWeeklyLearningReview(store, {
    profile,
    now: options?.now,
    timeZone: options?.timeZone,
  });
  const presentation = learningCoachingToCoachMessage(coaching);
  return {
    totalAcceptedEvents: store.eventCount,
    sessionAcceptedEvents: sessionAccepted,
    duplicateEventsIgnored: sessionDuplicatesIgnored,
    tradeSampleSize: store.tradeSummaries.length,
    detectedStrengths: profile.strengths,
    detectedImprovementAreas: profile.improvementAreas,
    profileConfidence: profile.confidenceInProfile,
    persistenceStatus: lastPersistenceStatus,
    schemaVersion: 1,
    eventCount: store.eventCount,
    coachingHeadline: coaching.headline,
    currentStrength: coaching.currentStrength,
    primaryImprovementArea: coaching.primaryImprovementArea,
    currentFocus: coaching.currentFocus,
    recommendedPractice: coaching.recommendedPractice,
    coachingConfidence: coaching.confidenceInCoaching,
    coachingDataSufficiency: coaching.dataSufficiency,
    coachingEvidenceCount: coaching.evidenceFromHistory.length,
    weeklyReviewSummary: weekly.progressSummary,
    weeklyDataSufficiency: weekly.dataSufficiency,
    weeklyEvidenceCount: weekly.evidence.length,
    presentationMessageId: presentation?.messageId ?? null,
    presentationTitle: presentation?.title ?? null,
    presentationEligible: Boolean(presentation),
  };
}

export function getPersonalizedCoachingSnapshot(options?: {
  now?: number;
}): PersonalizedCoachingSummary {
  const store = ensureLearningMemoryLoaded();
  return buildPersonalizedCoachingSummary(store, { now: options?.now });
}

export function getWeeklyLearningReviewSnapshot(options?: {
  now?: number;
  timeZone?: string;
}): WeeklyLearningReview {
  const store = ensureLearningMemoryLoaded();
  return buildWeeklyLearningReview(store, {
    now: options?.now,
    timeZone: options?.timeZone,
  });
}

export function printLearningEngineInspection(): LearningEngineInspection {
  const report = inspectLearningEngine();
  if (typeof console !== "undefined" && typeof console.info === "function") {
    // eslint-disable-next-line no-console
    console.info("[Hermes Learning Engine]", report);
  }
  return report;
}

export function registerLearningEngineDevHelper(
  globalRef: typeof globalThis = globalThis,
  env: { NODE_ENV?: string } = { NODE_ENV: process.env.NODE_ENV },
): void {
  if (env.NODE_ENV === "production") return;
  const target = globalRef as typeof globalThis & {
    __hermesLearningEngine?: () => LearningEngineInspection;
  };
  target.__hermesLearningEngine = printLearningEngineInspection;
}

function validateEventShape(event: LearningEvent): void {
  if (!event || typeof event !== "object") {
    throw new Error("recordLearningEvent: event must be an object.");
  }
  if (!event.id || typeof event.id !== "string") {
    throw new Error("recordLearningEvent: event.id is required.");
  }
  if (!Number.isFinite(event.timestamp)) {
    throw new Error("recordLearningEvent: event.timestamp must be finite.");
  }
  if (!event.eventType) {
    throw new Error("recordLearningEvent: event.eventType is required.");
  }
  if (!event.source) {
    throw new Error("recordLearningEvent: event.source is required.");
  }
  if (!Array.isArray(event.tags)) {
    throw new Error("recordLearningEvent: event.tags must be an array.");
  }
}

function createFallbackStore(): TraderMemoryStore {
  return {
    kind: "hermes-trader-memory-v1",
    version: 1,
    updatedAt: Date.now(),
    eventCount: 0,
    seenEventIds: [],
    tradeSummaries: [],
    behaviorCounts: {},
    lessonSummaries: [],
  };
}

function devWarn(message: string, error?: unknown): void {
  if (typeof console === "undefined" || typeof console.warn !== "function") return;
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.warn(`[Hermes Learning Engine] ${message}`, error ?? "");
}
