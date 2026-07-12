/**
 * Trader Memory Store — summarized, capped, pure updates.
 * Persistence is serialize/deserialize only in Phase 1 (no UI/localStorage wiring).
 */

import type { LearningEvent } from "@/lib/learning-engine/types";
import {
  LEARNING_MEMORY_CAPS,
  type BehaviorCountMap,
  type BehaviorKey,
  type HoldBucket,
  type PnlSign,
  type TradeLearningSummary,
  type TradeQualityBand,
  type TraderMemoryStore,
} from "@/lib/learning-engine/types";

export function createEmptyTraderMemoryStore(now = Date.now()): TraderMemoryStore {
  return {
    kind: "hermes-trader-memory-v1",
    version: 1,
    updatedAt: now,
    eventCount: 0,
    seenEventIds: [],
    tradeSummaries: [],
    behaviorCounts: {},
    lessonSummaries: [],
  };
}

/**
 * Ingest a learning event into memory.
 * Pure: returns a new store. Duplicate event ids are ignored.
 */
export function ingestLearningEvent(
  store: TraderMemoryStore,
  event: LearningEvent,
): TraderMemoryStore {
  if (store.seenEventIds.includes(event.id)) {
    return store;
  }

  const seenEventIds = capList([event.id, ...store.seenEventIds], LEARNING_MEMORY_CAPS.maxSeenEventIds);
  let tradeSummaries = store.tradeSummaries;
  let behaviorCounts = { ...store.behaviorCounts };
  let lessonSummaries = [...store.lessonSummaries];

  if (event.eventType === "TradeCompleted") {
    const summary = summarizeTradeEvent(event);
    tradeSummaries = capList([summary, ...tradeSummaries], LEARNING_MEMORY_CAPS.maxTradeSummaries);
    // TradeCompleted owns plan/risk/outcome behavior counts (no secondary tag pass).
    behaviorCounts = applyTradeBehaviors(behaviorCounts, summary, event);
  } else if (event.eventType === "TradeReviewed") {
    // Review owns plan-adherence / process-review signals once.
    behaviorCounts = applyReviewBehaviors(behaviorCounts, event);
    const lesson = extractLesson(event);
    if (lesson) {
      lessonSummaries = capList([lesson, ...lessonSummaries], LEARNING_MEMORY_CAPS.maxLessonSummaries);
    }
  } else if (event.eventType === "JournalReflectionAdded") {
    // Journal owns emotion/context signals only — never re-counts plan_followed.
    behaviorCounts = applyJournalBehaviors(behaviorCounts, event);
  } else {
    behaviorCounts = applyNonTradeBehaviors(behaviorCounts, event);
    const lesson = extractLesson(event);
    if (lesson) {
      lessonSummaries = capList([lesson, ...lessonSummaries], LEARNING_MEMORY_CAPS.maxLessonSummaries);
    }
  }

  return {
    ...store,
    updatedAt: event.timestamp,
    eventCount: store.eventCount + 1,
    seenEventIds,
    tradeSummaries,
    behaviorCounts,
    lessonSummaries,
    lastEventAt: event.timestamp,
  };
}

export function ingestLearningEvents(
  store: TraderMemoryStore,
  events: LearningEvent[],
): TraderMemoryStore {
  return events.reduce((acc, event) => ingestLearningEvent(acc, event), store);
}

/** Serialize memory for optional persistence tests — not wired to product storage. */
export function serializeTraderMemory(store: TraderMemoryStore): string {
  return JSON.stringify(store);
}

/** Deserialize memory; returns null on invalid payload (no throw for corrupt input). */
export function deserializeTraderMemory(raw: string): TraderMemoryStore | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TraderMemoryStore>;
    if (parsed.kind !== "hermes-trader-memory-v1" || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.seenEventIds) || !Array.isArray(parsed.tradeSummaries)) return null;
    return {
      kind: "hermes-trader-memory-v1",
      version: 1,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      eventCount: typeof parsed.eventCount === "number" ? parsed.eventCount : 0,
      seenEventIds: parsed.seenEventIds.map(String),
      tradeSummaries: parsed.tradeSummaries as TradeLearningSummary[],
      behaviorCounts: (parsed.behaviorCounts ?? {}) as BehaviorCountMap,
      lessonSummaries: Array.isArray(parsed.lessonSummaries)
        ? parsed.lessonSummaries.map(String)
        : [],
      lastEventAt: typeof parsed.lastEventAt === "number" ? parsed.lastEventAt : undefined,
    };
  } catch {
    return null;
  }
}

function summarizeTradeEvent(event: LearningEvent): TradeLearningSummary {
  const meta = event.metadata ?? {};
  const pnl = typeof meta.pnl === "number" ? meta.pnl : 0;
  const qualityScore = typeof meta.qualityScore === "number" ? meta.qualityScore : null;
  const holdMinutes = typeof meta.holdMinutes === "number" ? meta.holdMinutes : null;
  const followedPlan =
    typeof meta.followedPlan === "boolean" ? meta.followedPlan : undefined;

  return {
    eventId: event.id,
    timestamp: event.timestamp,
    symbol: event.symbol ? String(event.symbol) : undefined,
    timeframe: event.timeframe,
    strategyContext: event.strategyContext,
    outcome: event.outcome ?? (pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven"),
    pnlSign: pnlSign(pnl),
    followedPlan,
    qualityBand: qualityBand(qualityScore),
    holdBucket: holdBucket(holdMinutes),
    tags: [...event.tags],
  };
}

function applyTradeBehaviors(
  counts: BehaviorCountMap,
  summary: TradeLearningSummary,
  event: LearningEvent,
): BehaviorCountMap {
  const next = { ...counts };

  if (summary.followedPlan === true) {
    bump(next, "plan_followed");
    bump(next, "good_risk_control");
  }
  if (summary.followedPlan === false) {
    bump(next, "plan_broken");
  }
  if (summary.qualityBand === "High" && summary.outcome === "Win") {
    bump(next, "good_entry_timing");
    bump(next, "good_exit_discipline");
  }
  if (summary.holdBucket === "Swing" && summary.outcome === "Win") {
    bump(next, "strong_patience");
  }
  if (summary.holdBucket === "Scalp" && summary.followedPlan === false) {
    bump(next, "entering_too_early");
  }
  if (event.tags.includes("chase") || event.tags.includes("chasing_breakouts")) {
    bump(next, "chasing_breakouts");
  }
  if (event.tags.includes("ignored_stop") || event.tags.includes("no_stop")) {
    bump(next, "ignoring_stops");
  }
  if (event.tags.includes("against_htf") || event.tags.includes("countertrend")) {
    bump(next, "trading_against_htf");
  }
  if (event.tags.includes("revenge")) {
    bump(next, "revenge_trading");
  }
  if (event.tags.includes("overtrading")) {
    bump(next, "overtrading");
  }
  if (event.tags.includes("early_entry")) {
    bump(next, "entering_too_early");
  }
  if (summary.strategyContext?.toLowerCase().includes("trend") && summary.outcome === "Win") {
    bump(next, "good_trend_identification");
  }

  return next;
}

function applyReviewBehaviors(counts: BehaviorCountMap, event: LearningEvent): BehaviorCountMap {
  const next = { ...counts };
  // Plan adherence counted once on review (not again on journal for same save).
  if (event.tags.includes("plan_followed")) bump(next, "plan_followed");
  if (event.tags.includes("plan_broken")) bump(next, "plan_broken");
  if (event.tags.includes("reason_impulse") || event.tags.some((t) => t === "reason:impulse")) {
    // Impulse as review process note — not the same as journal early_entry emotion path
  }
  return next;
}

function applyJournalBehaviors(counts: BehaviorCountMap, event: LearningEvent): BehaviorCountMap {
  const next = { ...counts };
  // Emotion / impulse context only — at most one early-entry bump per journal event
  if (event.tags.includes("early_entry") || event.tags.includes("fomo")) {
    bump(next, "entering_too_early");
  }
  // Explicitly do NOT count plan_followed / plan_broken here.
  return next;
}

function applyNonTradeBehaviors(counts: BehaviorCountMap, event: LearningEvent): BehaviorCountMap {
  const next = { ...counts };
  if (event.eventType === "ReplayCompleted") {
    // Replay completion is practice engagement — not a personality claim.
    // No strength inflation from a single replay.
  }
  if (event.tags.includes("overtrading")) {
    bump(next, "overtrading");
  }
  return next;
}

function extractLesson(event: LearningEvent): string | null {
  const meta = event.metadata ?? {};
  const lesson =
    (typeof meta.lesson === "string" && meta.lesson) ||
    (typeof meta.reflection === "string" && meta.reflection) ||
    (typeof meta.feedback === "string" && meta.feedback) ||
    null;
  if (!lesson) return null;
  return lesson.trim().slice(0, 240);
}

function pnlSign(pnl: number): PnlSign {
  if (!Number.isFinite(pnl) || pnl === 0) return "flat";
  return pnl > 0 ? "positive" : "negative";
}

function qualityBand(score: number | null): TradeQualityBand {
  if (score === null || !Number.isFinite(score)) return "Unknown";
  if (score >= 76) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function holdBucket(minutes: number | null): HoldBucket {
  if (minutes === null || !Number.isFinite(minutes)) return "Unknown";
  if (minutes < 30) return "Scalp";
  if (minutes < 240) return "Intraday";
  return "Swing";
}

function bump(counts: BehaviorCountMap, key: BehaviorKey): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function capList<T>(items: T[], max: number): T[] {
  return items.slice(0, max);
}
