/**
 * Learning Engine integration service — single ingestion boundary.
 *
 * recordLearningEvent never throws into user workflows for ordinary failures.
 * Learning Engine remains coaching-only (no score / paper-trading changes).
 */

import { ingestLearningEvent } from "@/lib/learning-engine/memory-store";
import {
  loadTraderMemoryStore,
  saveTraderMemoryStore,
  type PersistenceStatus,
} from "@/lib/learning-engine/persistence";
import { buildTraderLearningProfile } from "@/lib/learning-engine/profile-builder";
import { buildHermesCoachMemory } from "@/lib/learning-engine/coach-memory";
import type {
  HermesCoachMemory,
  LearningEvent,
  TraderLearningProfile,
  TraderMemoryStore,
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
  const loaded = loadTraderMemoryStore();
  cachedStore = loaded.store;
  lastPersistenceStatus = loaded.recoveredFromMalformed
    ? "error"
    : loaded.status;
  return cachedStore;
}

/**
 * Validate + dedupe + ingest + persist. Never throws for ordinary storage issues.
 */
export function recordLearningEvent(event: LearningEvent): RecordLearningEventResult {
  try {
    validateEventShape(event);
    const before = ensureLearningMemoryLoaded();
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
};

/**
 * Development-only inspection of Learning Engine memory.
 */
export function inspectLearningEngine(): LearningEngineInspection {
  const store = ensureLearningMemoryLoaded();
  const profile = buildTraderLearningProfile(store);
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
  };
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
