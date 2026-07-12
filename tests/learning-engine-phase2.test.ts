/**
 * Learning Engine Phase 2 — event integration + persistence.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  TRADER_MEMORY_STORAGE_KEY,
  clearTraderMemoryStorage,
  createEmptyTraderMemoryStore,
  createTradeCompletedEvent,
  getLearningMemorySnapshot,
  inspectLearningEngine,
  journalToLearningEvent,
  loadTraderMemoryStore,
  paperTradeToLearningEvent,
  recordLearningEvent,
  replayToLearningEvent,
  resetLearningMemoryCache,
  reviewToLearningEvent,
  saveTraderMemoryStore,
  serializeTraderMemory,
} from "../lib/learning-engine/index";
import type {
  PaperTradeLearningInput,
  DecisionReflectionLearningInput,
  ReplaySessionLearningInput,
} from "../lib/learning-engine/adapters";

const T0 = 1_700_000_000_000;

/** Minimal in-memory localStorage for Node tests */
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
    id: "trade-1",
    symbol: "BTC",
    side: "Long",
    entryPrice: 100,
    exitPrice: 110,
    stopLoss: 95,
    takeProfit: 110,
    openedAt: T0 - 60 * 60 * 1000,
    closedAt: T0,
    pnl: 50,
    followedPlan: true,
    qualityScore: 82,
    coach: {
      grade: "B+",
    },
    ...overrides,
  };
}

function sampleReflection(
  overrides: Partial<DecisionReflectionLearningInput> = {},
): DecisionReflectionLearningInput {
  return {
    tradeId: "trade-1",
    reason: "Pullback",
    emotion: "Calm",
    followedPlan: "Yes",
    lesson: "Wait for confirmation next time. This freeform text should not flood memory for journal events.",
    updatedAt: T0 + 10,
    ...overrides,
  };
}

test("paper trade event mapping is structured and deterministic", () => {
  const trade = sampleTrade();
  const a = paperTradeToLearningEvent(trade, { timeframe: "1H" });
  const b = paperTradeToLearningEvent(trade, { timeframe: "1H" });
  assert.equal(a.eventType, "TradeCompleted");
  assert.equal(a.id, "trade-completed:trade-1");
  assert.equal(a.symbol, "BTC");
  assert.equal(a.timeframe, "1H");
  assert.equal(a.outcome, "Win");
  assert.ok(a.tags.includes("stop_defined"));
  assert.ok(a.tags.includes("plan_followed"));
  assert.ok(a.tags.includes("target_touched") || a.tags.includes("exit_discipline"));
  assert.deepEqual(a, b);
});

test("review event mapping includes structured review fields", () => {
  const reflection = sampleReflection();
  const event = reviewToLearningEvent({
    reflection,
    entry: {
      tradeId: "trade-1",
      symbol: "BTC",
      direction: "Buy / Sell",
      entry: 100,
      exit: 110,
      pnl: 50,
      outcome: "Win",
      hermesConfidence: 70,
      hermesRecommendation: "Practice",
      tradeQuality: "B+",
      disciplineImpact: 8,
      wisdomEarned: 5,
      traderDnaMatch: "Aligned",
      dailyGoalMatch: "Aligned",
      riskReward: 2,
      positionSize: 500,
      dateTime: T0,
      grade: "B+",
      needsReview: false,
      followedPlan: true,
    },
  });
  assert.equal(event.eventType, "TradeReviewed");
  assert.ok(event.tags.includes("plan_followed"));
  assert.ok(event.tags.some((t) => t.startsWith("grade:")));
  assert.ok(event.metadata?.lesson);
});

test("journal event mapping excludes raw lesson text from event payload", () => {
  const reflection = sampleReflection({
    lesson: "SECRET PERSONAL FREEFORM JOURNAL TEXT THAT MUST NOT BE STORED",
  });
  const event = journalToLearningEvent(reflection);
  assert.equal(event.eventType, "JournalReflectionAdded");
  assert.equal(event.metadata?.reflection ?? null, null);
  assert.equal(event.metadata?.lesson ?? null, null);
  const raw = JSON.stringify(event);
  assert.equal(raw.includes("SECRET PERSONAL"), false);
  assert.ok(event.tags.some((t) => t.startsWith("reason:")));
  assert.ok(event.tags.some((t) => t.startsWith("emotion:")));
});

test("replay event mapping includes grade and plan structure tags", () => {
  const trade = sampleTrade({ stopLoss: undefined, followedPlan: false, qualityScore: 50 });
  const session: ReplaySessionLearningInput = {
    trade,
    review: {
      couldImprove: ["Define stop"],
      decisionQuality: "Weak",
    },
    summary: {
      grade: "C",
      lessonLearned: "Define invalidation before entry.",
    },
  };

  const event = replayToLearningEvent(session);
  assert.equal(event.eventType, "ReplayCompleted");
  assert.ok(event.tags.includes("missed_stop_definition"));
  assert.ok(event.tags.includes("plan_broken"));
  assert.ok(String(event.metadata?.lesson ?? "").includes("invalidation"));
});

test("duplicate prevention via recordLearningEvent", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const event = paperTradeToLearningEvent(sampleTrade());
  const first = recordLearningEvent(event);
  const second = recordLearningEvent(event);
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
  assert.equal(second.duplicate, true);
  assert.equal(first.store.eventCount, 1);
  assert.equal(second.store.eventCount, 1);
});

test("persistence round-trip uses dedicated storage key", () => {
  const storage = installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const event = paperTradeToLearningEvent(sampleTrade({ id: "persist-1" }));
  const result = recordLearningEvent(event);
  assert.equal(result.accepted, true);
  assert.ok(result.persistenceStatus === "saved" || result.persistenceStatus === "ok");
  assert.ok(storage.getItem(TRADER_MEMORY_STORAGE_KEY));

  resetLearningMemoryCache();
  const loaded = loadTraderMemoryStore();
  assert.equal(loaded.store.eventCount, 1);
  assert.equal(loaded.store.tradeSummaries[0]?.eventId, "trade-completed:persist-1");
});

test("malformed storage recovers to empty store", () => {
  const storage = installMemoryLocalStorage();
  storage.setItem(TRADER_MEMORY_STORAGE_KEY, "{not-valid-json");
  resetLearningMemoryCache();
  const loaded = loadTraderMemoryStore();
  assert.equal(loaded.recoveredFromMalformed, true);
  assert.equal(loaded.store.eventCount, 0);
  assert.equal(loaded.store.kind, "hermes-trader-memory-v1");
});

test("storage failure isolation — recordLearningEvent does not throw", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  // Break setItem
  const original = window.localStorage.setItem;
  window.localStorage.setItem = () => {
    throw new Error("quota exceeded");
  };
  const result = recordLearningEvent(
    paperTradeToLearningEvent(sampleTrade({ id: "fail-save" })),
  );
  window.localStorage.setItem = original;
  assert.equal(result.accepted, true); // accepted in-memory
  assert.equal(result.persistenceStatus, "save_failed");
  assert.equal(result.error, undefined);
});

test("raw journal text not copied into memory summaries", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const secret = "DO_NOT_PERSIST_THIS_JOURNAL_FREEFORM_TEXT_XYZ";
  const event = journalToLearningEvent(
    sampleReflection({ lesson: secret, tradeId: "j-secret" }),
  );
  const result = recordLearningEvent(event);
  assert.equal(result.accepted, true);
  const serialized = serializeTraderMemory(result.store);
  assert.equal(serialized.includes(secret), false);
  assert.ok(result.store.lessonSummaries.every((l) => !l.includes(secret)));
});

test("profile updates after accepted events", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const before = inspectLearningEngine();
  assert.equal(before.tradeSampleSize, 0);

  for (let i = 0; i < 6; i += 1) {
    recordLearningEvent(
      paperTradeToLearningEvent(
        sampleTrade({
          id: `profile-${i}`,
          pnl: 10,
          followedPlan: true,
          qualityScore: 80,
          closedAt: T0 + i,
        }),
      ),
    );
  }
  const after = inspectLearningEngine();
  assert.ok(after.tradeSampleSize >= 6);
  assert.ok(after.profileConfidence > before.profileConfidence);
  assert.equal(after.schemaVersion, 1);
});

test("original workflow not blocked by invalid event shape", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  const result = recordLearningEvent({
    // invalid
    id: "",
    timestamp: T0,
    eventType: "TradeCompleted",
    source: "paper-trading",
    tags: [],
  } as never);
  assert.equal(result.accepted, false);
  assert.ok(result.error);
});

test("no score / intelligence-v2 fields introduced by integration outputs", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  const result = recordLearningEvent(paperTradeToLearningEvent(sampleTrade({ id: "iso-1" })));
  assert.equal("confidenceScore" in result.profile, false);
  assert.equal("tradeReadinessScore" in result.profile, false);
  assert.equal("hermesScore" in result.profile, false);
  assert.equal(result.store.kind, "hermes-trader-memory-v1");
});

test("caps remain enforced after many integrated trades", () => {
  installMemoryLocalStorage();
  resetLearningMemoryCache();
  clearTraderMemoryStorage();
  for (let i = 0; i < 60; i += 1) {
    recordLearningEvent(
      paperTradeToLearningEvent(
        sampleTrade({
          id: `cap-${i}`,
          closedAt: T0 + i,
          pnl: i % 2 === 0 ? 5 : -3,
        }),
      ),
    );
  }
  const store = getLearningMemorySnapshot();
  assert.ok(store.tradeSummaries.length <= 50);
  assert.ok(store.seenEventIds.length <= 200);
});

test("saveTraderMemoryStore rejects nothing when store is valid v1", () => {
  installMemoryLocalStorage();
  const store = createEmptyTraderMemoryStore(T0);
  assert.equal(saveTraderMemoryStore(store), true);
  const loaded = loadTraderMemoryStore();
  assert.equal(loaded.store.version, 1);
});

test("createTradeCompletedEvent still works through integration path deterministically", () => {
  const event = createTradeCompletedEvent({
    id: "legacy-factory",
    timestamp: T0,
    symbol: "ETH",
    pnl: -1,
    followedPlan: false,
  });
  assert.equal(event.outcome, "Loss");
});
