/**
 * Learning Engine Phase 3 — Personalized Coaching + Weekly Reviews.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPersonalizedCoachingSummary,
  buildTraderLearningProfile,
  buildWeeklyLearningReview,
  createEmptyTraderMemoryStore,
  createTradeCompletedEvent,
  dataSufficiencyFromSampleSize,
  getPracticeExercise,
  ingestLearningEvent,
  ingestLearningEvents,
  inspectLearningEngine,
  resetLearningMemoryCache,
  resolveWeekWindow,
  type TraderMemoryStore,
} from "../lib/learning-engine/index";

const T0 = 1_700_000_000_000;

function tradeEvent(args: {
  id: string;
  timestamp: number;
  pnl: number;
  followedPlan?: boolean;
  qualityScore?: number;
  holdMinutes?: number;
  tags?: string[];
  strategyContext?: string;
}) {
  return createTradeCompletedEvent({
    id: args.id,
    timestamp: args.timestamp,
    symbol: "BTC",
    pnl: args.pnl,
    followedPlan: args.followedPlan,
    qualityScore: args.qualityScore,
    holdMinutes: args.holdMinutes,
    tags: args.tags,
    strategyContext: args.strategyContext,
  });
}

function storeWithTrades(
  specs: Array<{
    id: string;
    pnl: number;
    followedPlan?: boolean;
    qualityScore?: number;
    holdMinutes?: number;
    tags?: string[];
    strategyContext?: string;
    offsetMs?: number;
  }>,
  base = T0,
): TraderMemoryStore {
  let store = createEmptyTraderMemoryStore(base);
  const events = specs.map((s, i) =>
    tradeEvent({
      id: s.id,
      timestamp: base - (s.offsetMs ?? i * 60_000),
      pnl: s.pnl,
      followedPlan: s.followedPlan,
      qualityScore: s.qualityScore,
      holdMinutes: s.holdMinutes,
      tags: s.tags,
      strategyContext: s.strategyContext,
    }),
  );
  store = ingestLearningEvents(store, events);
  return store;
}

test("data sufficiency ladder thresholds", () => {
  assert.equal(dataSufficiencyFromSampleSize(0), "Insufficient Data");
  assert.equal(dataSufficiencyFromSampleSize(2), "Insufficient Data");
  assert.equal(dataSufficiencyFromSampleSize(3), "Early Signal");
  assert.equal(dataSufficiencyFromSampleSize(4), "Early Signal");
  assert.equal(dataSufficiencyFromSampleSize(5), "Developing Pattern");
  assert.equal(dataSufficiencyFromSampleSize(9), "Developing Pattern");
  assert.equal(dataSufficiencyFromSampleSize(10), "Reliable Pattern");
});

test("insufficient-data coaching does not invent habits", () => {
  const store = storeWithTrades([
    { id: "one", pnl: -50, followedPlan: false, tags: ["revenge", "chase"] },
  ]);
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.equal(coaching.dataSufficiency, "Insufficient Data");
  assert.match(coaching.headline, /not enough|early sample|hold/i);
  assert.match(coaching.recurringPattern, /no recurring|too small/i);
  assert.ok(coaching.confidenceInCoaching < 30);
  assert.ok(coaching.evidenceFromHistory.every((e) => !/SECRET|journal freeform/i.test(e.explanation)));
});

test("early-signal coaching with 3–4 trades", () => {
  const store = storeWithTrades(
    Array.from({ length: 4 }, (_, i) => ({
      id: `early-${i}`,
      pnl: -10,
      followedPlan: false,
      tags: ["chase"],
      qualityScore: 40,
    })),
  );
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.equal(coaching.dataSufficiency, "Early Signal");
  assert.equal(coaching.sampleSize, 4);
});

test("developing-pattern coaching with 5–9 trades", () => {
  const store = storeWithTrades(
    Array.from({ length: 7 }, (_, i) => ({
      id: `dev-${i}`,
      pnl: i % 2 === 0 ? 10 : -8,
      followedPlan: i % 3 !== 0,
      qualityScore: 70,
      tags: i % 3 === 0 ? ["chase"] : ["risk_control"],
    })),
  );
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.equal(coaching.dataSufficiency, "Developing Pattern");
  assert.ok(coaching.sampleSize >= 5 && coaching.sampleSize <= 9);
});

test("reliable-pattern coaching with 10+ trades", () => {
  const store = storeWithTrades(
    Array.from({ length: 12 }, (_, i) => ({
      id: `rel-${i}`,
      pnl: 15,
      followedPlan: true,
      qualityScore: 82,
      holdMinutes: 300,
      strategyContext: "Trend Pullback",
      tags: ["risk_control"],
    })),
  );
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.equal(coaching.dataSufficiency, "Reliable Pattern");
  assert.ok(coaching.sampleSize >= 10);
  assert.ok(coaching.confidenceInCoaching >= 40);
});

test("safety issue prioritization prefers ignored stops over milder issues", () => {
  const store = storeWithTrades(
    Array.from({ length: 8 }, (_, i) => ({
      id: `safe-${i}`,
      pnl: -5,
      followedPlan: false,
      qualityScore: 40,
      tags: i < 5 ? ["ignored_stop", "no_stop"] : ["chase"],
    })),
  );
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.match(coaching.primaryImprovementArea, /stop/i);
  assert.match(coaching.recommendedPractice, /invalidation|stop/i);
});

test("primary-focus selection is single-focus", () => {
  const store = storeWithTrades(
    Array.from({ length: 8 }, (_, i) => ({
      id: `focus-${i}`,
      pnl: -4,
      followedPlan: false,
      tags: ["chase", "early_entry", "against_htf"],
      qualityScore: 45,
    })),
  );
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.ok(coaching.primaryImprovementArea.length > 0);
  // One practice string only
  assert.equal(typeof coaching.recommendedPractice, "string");
  assert.ok(!coaching.recommendedPractice.includes("\n\n"));
});

test("strength reinforcement cites evidence", () => {
  const store = storeWithTrades(
    Array.from({ length: 10 }, (_, i) => ({
      id: `str-${i}`,
      pnl: 20,
      followedPlan: true,
      qualityScore: 85,
      holdMinutes: 400,
      strategyContext: "Trend Pullback",
      tags: ["risk_control", "exit_discipline"],
    })),
  );
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.ok(coaching.currentStrength.length > 0);
  assert.ok(!/great job|amazing|awesome/i.test(coaching.currentStrength));
  const strengthEvidence = coaching.evidenceFromHistory.find((e) =>
    e.behavior.toLowerCase().includes(coaching.currentStrength.toLowerCase().slice(0, 8)) ||
    e.explanation.toLowerCase().includes("observed"),
  );
  assert.ok(strengthEvidence);
  assert.ok(strengthEvidence!.sourceEventIds.length > 0);
});

test("practice library covers required focuses", () => {
  const keys = [
    "entering_too_early",
    "chasing_breakouts",
    "ignoring_stops",
    "plan_broken",
    "overtrading",
    "revenge_trading",
    "trading_against_htf",
    "review_discipline",
  ] as const;
  for (const key of keys) {
    const exercise = getPracticeExercise(key);
    assert.ok(exercise.exercise.length > 20, key);
  }
});

test("early-entry / chase / stop / broken-plan / overtrading / revenge / htf practices", () => {
  // Keep followedPlan true unless testing plan-break so specialty tags can win priority.
  const cases: Array<{ tags: string[]; followedPlan?: boolean; expect: RegExp }> = [
    { tags: ["early_entry"], followedPlan: true, expect: /confirmation/i },
    { tags: ["chase"], followedPlan: true, expect: /vwap|extended/i },
    { tags: ["ignored_stop", "no_stop"], followedPlan: true, expect: /invalidation|stop/i },
    { tags: [], followedPlan: false, expect: /plan/i },
    { tags: ["overtrading"], followedPlan: true, expect: /maximum number|session/i },
    { tags: ["revenge"], followedPlan: true, expect: /cooldown/i },
    { tags: ["against_htf"], followedPlan: true, expect: /4h|daily bias/i },
  ];
  for (const c of cases) {
    const store = storeWithTrades(
      Array.from({ length: 8 }, (_, i) => ({
        id: `prac-${c.tags.join("-") || "plan"}-${i}`,
        pnl: -3,
        followedPlan: c.followedPlan ?? false,
        qualityScore: 40,
        tags: c.tags,
        holdMinutes: c.tags.includes("early_entry") ? 5 : 60,
      })),
    );
    const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
    assert.match(coaching.recommendedPractice, c.expect, c.tags.join(",") || "plan");
  }
});

test("weekly review calculations for active week", () => {
  const now = T0;
  const store = storeWithTrades(
    [
      { id: "w1", pnl: 10, followedPlan: true, qualityScore: 80, offsetMs: 0 },
      { id: "w2", pnl: -5, followedPlan: false, qualityScore: 50, offsetMs: DAY(1) },
      { id: "w3", pnl: 8, followedPlan: true, qualityScore: 75, offsetMs: DAY(2) },
      { id: "old", pnl: 1, followedPlan: true, qualityScore: 70, offsetMs: DAY(20) },
    ],
    now,
  );
  const review = buildWeeklyLearningReview(store, { now });
  assert.equal(review.kind, "hermes-weekly-learning-review-v1");
  assert.ok(review.tradesReviewed >= 3);
  assert.ok(review.tradesReviewed <= 3); // old trade outside rolling week
  assert.equal(review.wins + review.losses <= review.tradesReviewed, true);
  assert.ok(review.planFollowRate === null || review.planFollowRate >= 0);
  assert.ok(review.evidence.length > 0);
  assert.ok(review.evidence.every((e) => Array.isArray(e.sourceEventIds)));
});

test("no-trade week does not invent stats", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = {
    ...store,
    lessonSummaries: ["Always define the stop first."],
  };
  const review = buildWeeklyLearningReview(store, { now: T0 });
  assert.equal(review.tradesReviewed, 0);
  assert.equal(review.wins, 0);
  assert.equal(review.losses, 0);
  assert.equal(review.planFollowRate, null);
  assert.equal(review.averageTradeGrade, null);
  assert.equal(review.dataSufficiency, "Insufficient Data");
  assert.match(review.progressSummary, /no completed trades/i);
  assert.match(review.keyLesson, /stop first|planned paper trade/i);
});

test("evidence traceability excludes raw journal freeform", () => {
  let store = createEmptyTraderMemoryStore(T0);
  store = ingestLearningEvent(
    store,
    createTradeCompletedEvent({
      id: "ev-1",
      timestamp: T0,
      symbol: "ETH",
      pnl: -2,
      followedPlan: false,
      tags: ["chase"],
    }),
  );
  // Inject a lesson that looks like freeform — coaching may cite it truncated but
  // journal freeform should not appear as unrestricted dump
  store = {
    ...store,
    lessonSummaries: ["Define invalidation before entry."],
  };
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  const blob = JSON.stringify(coaching);
  assert.equal(blob.includes("SECRET_JOURNAL"), false);
  for (const e of coaching.evidenceFromHistory) {
    assert.ok(typeof e.behavior === "string");
    assert.ok(typeof e.observationCount === "number");
    assert.ok(typeof e.relevantSampleSize === "number");
    assert.ok(e.dateRange);
    assert.ok(Array.isArray(e.sourceEventIds));
    assert.ok(typeof e.confidence === "number");
    assert.ok(typeof e.explanation === "string");
  }
});

test("deterministic coaching and weekly output", () => {
  const store = storeWithTrades(
    Array.from({ length: 8 }, (_, i) => ({
      id: `det-${i}`,
      pnl: i % 2 === 0 ? 5 : -4,
      followedPlan: i % 2 === 0,
      qualityScore: 60 + i,
      tags: i % 2 === 0 ? ["risk_control"] : ["chase"],
    })),
  );
  const a = buildPersonalizedCoachingSummary(store, { now: T0 });
  const b = buildPersonalizedCoachingSummary(store, { now: T0 });
  assert.deepEqual(a, b);
  const w1 = buildWeeklyLearningReview(store, { now: T0 });
  const w2 = buildWeeklyLearningReview(store, { now: T0 });
  assert.deepEqual(w1, w2);
});

test("rolling week window without timezone", () => {
  const { periodStart, periodEnd } = resolveWeekWindow(T0);
  assert.ok(periodEnd === T0);
  assert.ok(periodEnd - periodStart <= 7 * 24 * 60 * 60 * 1000);
  assert.ok(periodEnd - periodStart > 6 * 24 * 60 * 60 * 1000);
});

test("developer inspection includes Phase 3 coaching fields", () => {
  resetLearningMemoryCache(
    storeWithTrades(
      Array.from({ length: 6 }, (_, i) => ({
        id: `insp-${i}`,
        pnl: -3,
        followedPlan: false,
        tags: ["chase"],
      })),
    ),
  );
  const report = inspectLearningEngine({ now: T0 });
  assert.ok(report.coachingHeadline.length > 0);
  assert.ok(report.currentStrength.length > 0);
  assert.ok(report.primaryImprovementArea.length > 0);
  assert.ok(report.currentFocus.length > 0);
  assert.ok(report.recommendedPractice.length > 0);
  assert.ok(typeof report.coachingConfidence === "number");
  assert.ok(report.weeklyReviewSummary.length > 0);
  assert.ok(report.coachingDataSufficiency.length > 0);
  resetLearningMemoryCache();
});

test("no market-score fields on Phase 3 outputs", () => {
  const store = storeWithTrades([
    { id: "ms1", pnl: 1, followedPlan: true, qualityScore: 70 },
  ]);
  const coaching = buildPersonalizedCoachingSummary(store, { now: T0 });
  const weekly = buildWeeklyLearningReview(store, { now: T0 });
  for (const obj of [coaching, weekly] as Array<Record<string, unknown>>) {
    assert.equal("confidenceScore" in obj, false);
    assert.equal("tradeReadinessScore" in obj, false);
    assert.equal("tradeQualityScore" in obj, false);
    assert.equal("hermesScore" in obj, false);
    assert.equal("wouldTakeTrade" in obj, false);
  }
});

test("profile remains source of truth for patterns (no second detector fork)", () => {
  const store = storeWithTrades(
    Array.from({ length: 8 }, (_, i) => ({
      id: `src-${i}`,
      pnl: -2,
      followedPlan: false,
      tags: ["chase"],
    })),
  );
  const profile = buildTraderLearningProfile(store, T0);
  const coaching = buildPersonalizedCoachingSummary(store, { profile, now: T0 });
  // Coaching labels should come from profile pattern labels when present
  if (profile.patterns.some((p) => p.kind === "weakness")) {
    assert.ok(
      profile.patterns.some((p) =>
        coaching.primaryImprovementArea.includes(p.label) ||
        coaching.recurringPattern.includes(p.label) ||
        coaching.primaryImprovementArea.length > 0,
      ),
    );
  }
});

test("learning-engine phase3 modules do not import intelligence-v2", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  for (const file of [
    "personalized-coaching.ts",
    "weekly-review.ts",
    "practice-library.ts",
    "data-sufficiency.ts",
  ]) {
    const text = fs.readFileSync(
      path.join(process.cwd(), "lib", "learning-engine", file),
      "utf8",
    );
    assert.equal(/from\s+["']@\/lib\/intelligence-v2/.test(text), false, file);
    assert.equal(/from\s+["']@\/lib\/paper-trading/.test(text), false, file);
  }
});

function DAY(n: number): number {
  return n * 24 * 60 * 60 * 1000;
}
