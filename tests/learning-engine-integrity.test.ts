/**
 * Learning Engine Phase 2.1 — Event Integrity tests.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLearningEventId,
  clearTraderMemoryStorage,
  createEmptyTraderMemoryStore,
  ingestLearningEvent,
  journalToLearningEvent,
  paperTradeToLearningEvent,
  recordLearningEvent,
  replayToLearningEvent,
  resetLearningMemoryCache,
  reviewToLearningEvent,
  shouldEmitTradeCompleted,
  type PaperTradeLearningInput,
  type DecisionReflectionLearningInput,
} from "../lib/learning-engine/index";

const T0 = 1_700_000_000_000;

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  (globalThis as { window?: { localStorage: typeof storage } }).window = {
    localStorage: storage,
  };
  return storage;
}

function sampleTrade(overrides: Partial<PaperTradeLearningInput> = {}): PaperTradeLearningInput {
  return {
    id: "pos-1",
    symbol: "BTC",
    side: "Long",
    entryPrice: 100,
    exitPrice: 110,
    stopLoss: 95,
    takeProfit: 110,
    openedAt: T0 - 3_600_000,
    closedAt: T0,
    pnl: 50,
    followedPlan: true,
    qualityScore: 82,
    coach: { grade: "B+" },
    ...overrides,
  };
}

function sampleReflection(
  overrides: Partial<DecisionReflectionLearningInput> = {},
): DecisionReflectionLearningInput {
  return {
    tradeId: "pos-1",
    reason: "Impulse",
    emotion: "FOMO",
    followedPlan: "No",
    lesson: "Do not chase.",
    updatedAt: T0 + 50,
    ...overrides,
  };
}

test("deterministic source-derived event IDs", () => {
  const id = buildLearningEventId({
    sourceType: "paper-trading",
    sourceRecordId: "pos-1",
    action: "trade-completed",
    completedTimestamp: T0,
  });
  assert.equal(id, "paper-trading:trade-completed:pos-1:1700000000000");
  const trade = sampleTrade();
  const a = paperTradeToLearningEvent(trade, { closeKind: "full" });
  const b = paperTradeToLearningEvent(trade, { closeKind: "full" });
  assert.equal(a!.id, b!.id);
  assert.equal(a!.id, id);
});

test("partial reduction does not emit TradeCompleted", () => {
  assert.equal(shouldEmitTradeCompleted("partial"), false);
  const event = paperTradeToLearningEvent(sampleTrade(), { closeKind: "partial" });
  assert.equal(event, null);
});

test("full close emits exactly one TradeCompleted event", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const event = paperTradeToLearningEvent(sampleTrade(), { closeKind: "full" });
  assert.ok(event);
  const first = recordLearningEvent(event!);
  const second = recordLearningEvent(event!);
  assert.equal(first.accepted, true);
  assert.equal(second.duplicate, true);
  assert.equal(first.store.tradeSummaries.length, 1);
});

test("final close after partial uses stable full-close id only once", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();

  // Simulate partial: no learning event
  const partial = paperTradeToLearningEvent(
    sampleTrade({ id: "pos-1-partial-1", closedAt: T0 - 1000, pnl: 10 }),
    { closeKind: "partial" },
  );
  assert.equal(partial, null);

  // Final full close of remaining position (same source position id)
  const finalEvent = paperTradeToLearningEvent(
    sampleTrade({ id: "pos-1", closedAt: T0, pnl: 40 }),
    { closeKind: "full" },
  );
  assert.ok(finalEvent);
  const accepted = recordLearningEvent(finalEvent!);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.store.tradeSummaries.length, 1);
  assert.equal(accepted.store.tradeSummaries[0]?.eventId, finalEvent!.id);

  // React-style repeated callback
  const again = recordLearningEvent(finalEvent!);
  assert.equal(again.duplicate, true);
  assert.equal(again.store.tradeSummaries.length, 1);
});

test("React-style repeated callback does not duplicate an event", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const event = paperTradeToLearningEvent(sampleTrade({ id: "strict-1" }), {
    closeKind: "full",
  });
  assert.ok(event);
  recordLearningEvent(event!);
  recordLearningEvent(event!);
  recordLearningEvent(event!);
  assert.equal(recordLearningEvent(event!).store.eventCount, 1);
});

test("refresh / reload does not re-ingest previous events", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const event = paperTradeToLearningEvent(sampleTrade({ id: "reload-1" }), {
    closeKind: "full",
  });
  assert.ok(event);
  recordLearningEvent(event!);
  // Simulate page refresh: drop memory cache, keep localStorage
  resetLearningMemoryCache();
  const afterReload = recordLearningEvent(event!);
  assert.equal(afterReload.duplicate, true);
  assert.equal(afterReload.accepted, false);
  assert.equal(afterReload.store.eventCount, 1);
});

test("review and journal events do not double-count plan behavior", () => {
  const reflection = sampleReflection({ followedPlan: "No" });
  const review = reviewToLearningEvent({ reflection });
  const journal = journalToLearningEvent(reflection);

  // Journal must not carry plan_followed / plan_broken
  assert.equal(journal.tags.includes("plan_followed"), false);
  assert.equal(journal.tags.includes("plan_broken"), false);
  assert.ok(review.tags.includes("plan_broken"));

  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(store, review);
  store = ingestLearningEvent(store, journal);

  // plan_broken counted once (review only)
  assert.equal(store.behaviorCounts.plan_broken, 1);
  // early_entry from journal impulse/FOMO path counted once
  assert.equal(store.behaviorCounts.entering_too_early, 1);
});

test("replay adapter produces stable id but start path is not wired (documented)", () => {
  const trade = sampleTrade();
  const session = {
    trade,
    completedAt: T0 + 99,
    summary: { grade: "B", lessonLearned: "Wait for confirmation." },
  };
  const a = replayToLearningEvent(session);
  const b = replayToLearningEvent(session);
  assert.equal(a.id, b.id);
  assert.equal(
    a.id,
    buildLearningEventId({
      sourceType: "paper-replay",
      sourceRecordId: trade.id,
      action: "replay-completed",
      completedTimestamp: T0 + 99,
    }),
  );
  // Product path must not call this on session announcement — covered by policy docs.
  // Emitting twice via service still dedupes:
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  assert.equal(recordLearningEvent(a).accepted, true);
  assert.equal(recordLearningEvent(b).duplicate, true);
});

test("TradeCompleted does not double-count plan tags within one event", () => {
  const event = paperTradeToLearningEvent(sampleTrade({ followedPlan: true }), {
    closeKind: "full",
  });
  assert.ok(event);
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(store, event!);
  // previously tags + followedPlan both bumped plan_followed → 2; now once
  assert.equal(store.behaviorCounts.plan_followed, 1);
});

test("persistence reload preserves deduplication set", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const event = paperTradeToLearningEvent(sampleTrade({ id: "persist-dedupe" }), {
    closeKind: "full",
  });
  assert.ok(event);
  recordLearningEvent(event!);
  resetLearningMemoryCache();
  const r = recordLearningEvent(event!);
  assert.equal(r.duplicate, true);
  assert.ok(r.store.seenEventIds.includes(event!.id));
});
