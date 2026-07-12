/**
 * Learning Engine Phase 1 tests.
 * Isolated from intelligence-v2 and paper-trading behavior.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  LEARNING_MEMORY_CAPS,
  buildHermesCoachMemory,
  buildTraderLearningProfile,
  createCoachingFeedbackEvent,
  createEmptyTraderMemoryStore,
  createJournalReflectionEvent,
  createLearningEvent,
  createReplayCompletedEvent,
  createTradeCompletedEvent,
  createTradeReviewedEvent,
  deserializeTraderMemory,
  detectTraderPatterns,
  ingestLearningEvent,
  ingestLearningEvents,
  serializeTraderMemory,
} from "../lib/learning-engine/index";

const T0 = 1_700_000_000_000;

test("learning event creation requires id/type/source and normalizes tags", () => {
  const event = createLearningEvent({
    id: "e1",
    timestamp: T0,
    eventType: "TradeCompleted",
    source: "paper-trading",
    tags: [" Win ", "win", "Plan_Followed"],
  });
  assert.equal(event.id, "e1");
  assert.equal(event.eventType, "TradeCompleted");
  assert.deepEqual(event.tags, ["win", "plan_followed"]);
  assert.throws(() =>
    createLearningEvent({
      id: "",
      timestamp: T0,
      eventType: "TradeCompleted",
      source: "paper-trading",
    }),
  );
});

test("TradeCompleted maps pnl to outcome", () => {
  const win = createTradeCompletedEvent({
    id: "t-win",
    timestamp: T0,
    symbol: "BTC",
    pnl: 120,
    followedPlan: true,
    qualityScore: 82,
    holdMinutes: 90,
  });
  assert.equal(win.outcome, "Win");
  assert.ok(win.tags.includes("plan_followed"));

  const loss = createTradeCompletedEvent({
    id: "t-loss",
    timestamp: T0 + 1,
    symbol: "ETH",
    pnl: -40,
    followedPlan: false,
  });
  assert.equal(loss.outcome, "Loss");
  assert.ok(loss.tags.includes("plan_broken"));
});

test("memory persistence serialize/deserialize round-trip", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(
    store,
    createTradeCompletedEvent({
      id: "t1",
      timestamp: T0,
      symbol: "BTC",
      pnl: 10,
      followedPlan: true,
      qualityScore: 80,
    }),
  );
  const raw = serializeTraderMemory(store);
  const restored = deserializeTraderMemory(raw);
  assert.ok(restored);
  assert.equal(restored!.eventCount, 1);
  assert.equal(restored!.tradeSummaries.length, 1);
  assert.equal(deserializeTraderMemory("not-json"), null);
  assert.equal(deserializeTraderMemory(JSON.stringify({ kind: "other" })), null);
});

test("duplicate event handling ignores second ingest", () => {
  const event = createTradeCompletedEvent({
    id: "dup",
    timestamp: T0,
    symbol: "BTC",
    pnl: 5,
    followedPlan: true,
  });
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(store, event);
  const afterFirst = store.eventCount;
  const behaviors = { ...store.behaviorCounts };
  store = ingestLearningEvent(store, event);
  assert.equal(store.eventCount, afterFirst);
  assert.deepEqual(store.behaviorCounts, behaviors);
});

test("small sample protection — one bad trade is not a firm weakness", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(
    store,
    createTradeCompletedEvent({
      id: "bad-1",
      timestamp: T0,
      symbol: "BTC",
      pnl: -100,
      followedPlan: false,
      tags: ["revenge", "chase"],
      qualityScore: 40,
    }),
  );
  const profile = buildTraderLearningProfile(store, T0 + 1);
  assert.equal(profile.sampleSize, 1);
  assert.ok(profile.confidenceInProfile < 30);
  assert.equal(profile.recurringMistakes.length, 0);
  assert.ok(profile.learningSummary.toLowerCase().includes("too small") || profile.sampleSize < 5);
  assert.equal(profile.disciplineTrend, "Insufficient Data");
  // patterns may exist but not reliable
  const revenge = profile.patterns.find((p) => p.key === "revenge_trading");
  assert.ok(revenge);
  assert.equal(revenge!.reliable, false);
});

test("strength detection with sufficient sample", () => {
  let store = createEmptyTraderMemoryStore(T0);
  const events = Array.from({ length: 6 }, (_, i) =>
    createTradeCompletedEvent({
      id: `good-${i}`,
      timestamp: T0 + i * 60_000,
      symbol: "BTC",
      pnl: 20 + i,
      followedPlan: true,
      qualityScore: 80,
      holdMinutes: 300,
      strategyContext: "Trend Pullback",
      tags: ["risk_control"],
    }),
  );
  store = ingestLearningEvents(store, events);
  const profile = buildTraderLearningProfile(store, T0 + 1_000_000);
  assert.ok(profile.sampleSize >= LEARNING_MEMORY_CAPS.minSampleForProfileClaims);
  assert.ok(profile.strengths.length > 0 || profile.successfulPatterns.length > 0);
  assert.ok(profile.confidenceInProfile >= 45);
  const patterns = detectTraderPatterns(store);
  assert.ok(patterns.some((p) => p.kind === "strength" && p.reliable));
});

test("weakness detection with sufficient sample", () => {
  let store = createEmptyTraderMemoryStore(T0);
  const events = Array.from({ length: 6 }, (_, i) =>
    createTradeCompletedEvent({
      id: `weak-${i}`,
      timestamp: T0 + i * 60_000,
      symbol: "ETH",
      pnl: -15,
      followedPlan: false,
      qualityScore: 40,
      holdMinutes: 10,
      tags: ["chase", "early_entry", "against_htf"],
    }),
  );
  store = ingestLearningEvents(store, events);
  const profile = buildTraderLearningProfile(store, T0 + 1);
  assert.ok(
    profile.improvementAreas.length > 0 ||
      profile.recurringMistakes.length > 0 ||
      profile.patterns.some((p) => p.kind === "weakness" && p.reliable),
  );
});

test("profile updates over time as events accumulate", () => {
  let store = createEmptyTraderMemoryStore(T0);
  const first = buildTraderLearningProfile(store, T0);
  assert.equal(first.sampleSize, 0);

  store = ingestLearningEvent(
    store,
    createTradeCompletedEvent({
      id: "p1",
      timestamp: T0 + 1,
      symbol: "BTC",
      pnl: 10,
      followedPlan: true,
      qualityScore: 78,
    }),
  );
  const mid = buildTraderLearningProfile(store, T0 + 2);
  assert.equal(mid.sampleSize, 1);
  assert.ok(mid.confidenceInProfile > first.confidenceInProfile);

  for (let i = 0; i < 5; i += 1) {
    store = ingestLearningEvent(
      store,
      createTradeCompletedEvent({
        id: `p-more-${i}`,
        timestamp: T0 + 10 + i,
        symbol: "BTC",
        pnl: 12,
        followedPlan: true,
        qualityScore: 80,
      }),
    );
  }
  const later = buildTraderLearningProfile(store, T0 + 100);
  assert.ok(later.sampleSize >= 5);
  assert.ok(later.confidenceInProfile >= mid.confidenceInProfile);
});

test("deterministic output for identical memory", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvents(store, [
    createTradeCompletedEvent({
      id: "d1",
      timestamp: T0,
      symbol: "BTC",
      pnl: 10,
      followedPlan: true,
      qualityScore: 80,
    }),
    createTradeCompletedEvent({
      id: "d2",
      timestamp: T0 + 1,
      symbol: "ETH",
      pnl: -5,
      followedPlan: false,
      tags: ["chase"],
    }),
  ]);
  const a = buildTraderLearningProfile(store, T0 + 99);
  const b = buildTraderLearningProfile(store, T0 + 99);
  assert.deepEqual(a, b);
  const coachA = buildHermesCoachMemory(a, store, T0 + 99);
  const coachB = buildHermesCoachMemory(b, store, T0 + 99);
  assert.deepEqual(coachA, coachB);
});

test("review/journal/replay/coach events create lessons without inventing market scores", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvents(store, [
    createTradeReviewedEvent({
      id: "r1",
      timestamp: T0,
      symbol: "BTC",
      lesson: "Wait for confirmation next time.",
    }),
    createJournalReflectionEvent({
      id: "j1",
      timestamp: T0 + 1,
      reflection: "Felt rushed before entry.",
      tags: ["early_entry"],
    }),
    createReplayCompletedEvent({
      id: "rp1",
      timestamp: T0 + 2,
      symbol: "SPY",
      timeframe: "1H",
      lesson: "HTF bias first.",
    }),
    createCoachingFeedbackEvent({
      id: "c1",
      timestamp: T0 + 3,
      feedback: "Protect process over urgency.",
    }),
  ]);
  assert.equal(store.eventCount, 4);
  assert.ok(store.lessonSummaries.length >= 3);
  assert.equal(store.tradeSummaries.length, 0);
});

test("memory caps prevent unlimited history growth", () => {
  let store = createEmptyTraderMemoryStore(T0);
  for (let i = 0; i < LEARNING_MEMORY_CAPS.maxTradeSummaries + 10; i += 1) {
    store = ingestLearningEvent(
      store,
      createTradeCompletedEvent({
        id: `cap-${i}`,
        timestamp: T0 + i,
        symbol: "BTC",
        pnl: i % 2 === 0 ? 5 : -3,
        followedPlan: i % 3 === 0,
      }),
    );
  }
  assert.ok(store.tradeSummaries.length <= LEARNING_MEMORY_CAPS.maxTradeSummaries);
  assert.ok(store.seenEventIds.length <= LEARNING_MEMORY_CAPS.maxSeenEventIds);
});

test("coach memory is internal-only shape and uses small-sample caution", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(
    store,
    createTradeCompletedEvent({
      id: "cm1",
      timestamp: T0,
      symbol: "BTC",
      pnl: -20,
      followedPlan: false,
    }),
  );
  const profile = buildTraderLearningProfile(store, T0 + 1);
  const coach = buildHermesCoachMemory(profile, store, T0 + 2);
  assert.equal(coach.kind, "hermes-coach-memory-v1");
  assert.ok(coach.currentFocus.length > 0);
  assert.ok(coach.recommendedPractice.length > 0);
  assert.ok(coach.evidenceFromHistory.some((e) => /small-sample|sample size/i.test(e)));
});

test("no market score fields exist on learning outputs", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(
    store,
    createTradeCompletedEvent({
      id: "ns1",
      timestamp: T0,
      symbol: "BTC",
      pnl: 1,
      followedPlan: true,
    }),
  );
  const profile = buildTraderLearningProfile(store, T0 + 1);
  const coach = buildHermesCoachMemory(profile, store, T0 + 2);
  for (const obj of [profile, coach, store] as Array<Record<string, unknown>>) {
    assert.equal("confidenceScore" in obj, false);
    assert.equal("tradeReadinessScore" in obj, false);
    assert.equal("tradeQualityScore" in obj, false);
    assert.equal("hermesScore" in obj, false);
    assert.equal("wouldTakeTrade" in obj, false);
    assert.equal("sizingBias" in obj, false);
  }
});

test("learning-engine does not import intelligence-v2 or paper-trading modules", async () => {
  // Structural isolation: no runtime imports from market intelligence or execution.
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "lib", "learning-engine");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    assert.equal(
      /from\s+["']@\/lib\/intelligence-v2/.test(text),
      false,
      `${file} must not import intelligence-v2`,
    );
    assert.equal(
      /from\s+["']@\/lib\/paper-trading/.test(text),
      false,
      `${file} must not import paper-trading`,
    );
  }
});
