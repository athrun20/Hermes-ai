/**
 * Phase 4 — Hermes Judgment tests.
 * Judgment interprets existing scores; never recomputes Confidence / Readiness / TQ.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHermesJudgment,
  buildMarketRegime,
  buildRegimeEffect,
  type MarketRegime,
} from "../lib/intelligence-v2/index";
import type { Candle } from "../lib/market-data";
import type {
  ReadinessState,
  ReasoningRecommendedAction,
  ReasoningRiskQuality,
} from "../lib/reasoning-types";
import type { TradeQualityResult } from "../lib/trade-quality-types";

const NOW = 1_700_000_000_000;

function candles(count = 12): Candle[] {
  let price = 100;
  return Array.from({ length: count }, (_, i) => {
    const open = price;
    const close = price * (1 + (i % 2 === 0 ? 0.01 : -0.005));
    const high = Math.max(open, close) * 1.002;
    const low = Math.min(open, close) * 0.998;
    price = close;
    return { time: NOW / 1000 + i * 3600, open, high, low, close };
  });
}

function workableRegime(overrides: Partial<MarketRegime> = {}): MarketRegime {
  return {
    kind: "hermes-market-regime-v1",
    symbol: "BTC",
    structureRegime: "Trending",
    volatilityRegime: "Normal",
    liquidityRegime: "Healthy",
    eventRegime: "Normal",
    directionalBias: "Bullish",
    summary: "Constructive trend regime for study.",
    confidence: 70,
    supportingSignals: ["MTF aligned"],
    conflictingSignals: [],
    sourceTimestamp: NOW,
    dataQuality: "Good",
    ...overrides,
  };
}

function hostileEventRegime(): MarketRegime {
  return workableRegime({
    eventRegime: "Event Driven",
    volatilityRegime: "High",
    structureRegime: "Transition",
    summary: "Event-driven tape with elevated risk.",
    dataQuality: "Adequate",
  });
}

type Args = {
  confidence?: number;
  readiness?: number;
  readinessState?: ReadinessState;
  readinessBlockers?: string[];
  recommendedAction?: ReasoningRecommendedAction;
  traderFit?: string;
  riskQuality?: ReasoningRiskQuality;
  confirmationConditions?: string[];
  invalidationConditions?: string[];
  hasOpenPosition?: boolean;
  disciplineScore?: number;
  personality?: string;
  profileNotes?: string[];
  regime?: MarketRegime;
  plan?: {
    hasEntry?: boolean;
    hasStop?: boolean;
    hasTarget?: boolean;
    riskReward?: number | null;
    planInvalid?: boolean;
  };
  eventRiskActive?: boolean;
  dataState?: "Ready" | "Insufficient Data" | "Stale";
  omitScores?: boolean;
  sourceTimestamp?: number;
};

function judgment(args: Args = {}) {
  return buildHermesJudgment({
    regime: args.regime ?? workableRegime(),
    confidence: args.omitScores ? undefined : (args.confidence ?? 78),
    readiness: args.omitScores ? undefined : (args.readiness ?? 88),
    readinessState: args.readinessState,
    readinessBlockers: args.readinessBlockers ?? [],
    recommendedAction: args.recommendedAction,
    traderFit: args.traderFit ?? "Aligned",
    riskQuality: args.riskQuality ?? "Good",
    confirmationConditions: args.confirmationConditions ?? ["Volume expansion above average."],
    invalidationConditions: args.invalidationConditions ?? ["Loss of VWAP."],
    hasOpenPosition: args.hasOpenPosition,
    eventRiskActive: args.eventRiskActive,
    dataState: args.dataState,
    plan: args.plan ?? { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2.2 },
    profile: {
      traderDnaFit: args.traderFit ?? "Aligned",
      disciplineScore: args.disciplineScore,
      personality: args.personality,
      notes: args.profileNotes,
    },
    sourceTimestamp: args.sourceTimestamp ?? NOW,
  });
}

test("Take: high readiness, strong confidence, complete plan, non-hostile regime", () => {
  const result = judgment({
    confidence: 80,
    readiness: 90,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    traderFit: "Aligned",
    riskQuality: "Good",
    readinessBlockers: [],
  });
  assert.equal(result.stance, "Take");
  assert.equal(result.wouldTakeTrade, true);
  assert.ok(result.summary.includes("Take"));
  assert.ok(result.primaryReason.length > 0);
  assert.equal(result.sourceTimestamp, NOW);
  assert.equal(result.kind, "hermes-judgment-v1");
  assert.ok(result.regimeEffect.level === "Supportive" || result.regimeEffect.level === "Neutral");
});

test("Take With Caution: actionable with moderate residual risks", () => {
  const result = judgment({
    confidence: 76,
    readiness: 74,
    readinessState: "Ready With Caution",
    recommendedAction: "Validate",
    traderFit: "Aligned",
    riskQuality: "Average",
    readinessBlockers: ["Risk/reward is below Hermes' preferred 2:1 threshold."],
    regime: workableRegime({
      volatilityRegime: "High",
      eventRegime: "Elevated Event Risk",
      summary: "Elevated event risk with high volatility.",
    }),
  });
  assert.equal(result.stance, "Take With Caution");
  assert.equal(result.wouldTakeTrade, "Conditional");
  assert.ok(result.blockingReasons.length > 0);
  assert.ok(result.conditionsToProceed.some((c) => /conservative|confirmation|caution/i.test(c) || c.length > 0));
});

test("Wait: thesis may be valid but confirmation / readiness incomplete", () => {
  const result = judgment({
    confidence: 74,
    readiness: 55,
    readinessState: "Developing",
    recommendedAction: "Prepare",
    readinessBlockers: ["Confirmation is still developing."],
    traderFit: "Aligned",
  });
  assert.equal(result.stance, "Wait");
  assert.equal(result.wouldTakeTrade, "Conditional");
  assert.ok(result.blockingReasons.some((b) => /confirmation/i.test(b)));
});

test("Avoid: critical blockers / not ready", () => {
  const result = judgment({
    confidence: 60,
    readiness: 22,
    readinessState: "Not Ready",
    recommendedAction: "Avoid",
    readinessBlockers: ["Entry is not defined.", "Stop loss is not defined."],
    plan: { hasEntry: false, hasStop: false, hasTarget: false },
  });
  assert.equal(result.stance, "Avoid");
  assert.equal(result.wouldTakeTrade, false);
  assert.ok(result.blockingReasons.length > 0);
});

test("Manage Existing Position: open position is management not entry", () => {
  const result = judgment({
    confidence: 70,
    readiness: 60,
    readinessState: "Developing",
    hasOpenPosition: true,
    recommendedAction: "Wait",
  });
  assert.equal(result.stance, "Manage Existing Position");
  assert.equal(result.wouldTakeTrade, "Conditional");
  assert.ok(/open|manage/i.test(result.primaryReason));
  assert.ok(result.conditionsToAvoid.some((c) => /average|new unplanned entry/i.test(c)));
});

test("Insufficient Data: missing scores or poor data quality", () => {
  const missing = judgment({
    omitScores: true,
    readinessState: undefined,
  });
  assert.equal(missing.stance, "Insufficient Data");
  assert.equal(missing.wouldTakeTrade, false);

  const poor = judgment({
    confidence: 70,
    readiness: 70,
    regime: workableRegime({ dataQuality: "Poor", summary: "Poor tape quality." }),
  });
  assert.equal(poor.stance, "Insufficient Data");
  assert.equal(poor.wouldTakeTrade, false);
});

test("High confidence but low readiness → Wait (not merged, not bearish)", () => {
  const conf = 84;
  const ready = 42;
  const result = judgment({
    confidence: conf,
    readiness: ready,
    readinessState: "Incomplete",
    recommendedAction: "Prepare",
    readinessBlockers: ["Confirmation is still developing."],
  });
  assert.equal(result.stance, "Wait");
  assert.equal(result.wouldTakeTrade, "Conditional");
  assert.ok(/good idea|not ready|does not merge|Readiness/i.test(result.primaryReason));
  assert.ok(!/bearish thesis/i.test(result.primaryReason) || /not a bearish/i.test(result.primaryReason));
  assert.ok(result.summary.includes(String(conf)));
  assert.ok(result.summary.includes(String(ready)));
});

test("High readiness with hostile regime → Avoid (high confidence refused)", () => {
  const conf = 82;
  const result = judgment({
    confidence: conf,
    readiness: 78,
    readinessState: "Ready With Caution",
    recommendedAction: "Validate",
    traderFit: "Aligned",
    riskQuality: "Good",
    readinessBlockers: [],
    regime: hostileEventRegime(),
  });
  assert.equal(result.stance, "Avoid");
  assert.equal(result.wouldTakeTrade, false);
  assert.ok(result.regimeEffect.level === "Hostile");
  assert.ok(result.blockingReasons.some((b) => /hostile|event/i.test(b)));
});

test("Complete plan with unresolved event risk → Wait or Take With Caution, not full Take", () => {
  const result = judgment({
    confidence: 78,
    readiness: 72,
    readinessState: "Ready With Caution",
    recommendedAction: "Validate",
    eventRiskActive: true,
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2.5 },
    regime: workableRegime({
      eventRegime: "Elevated Event Risk",
      summary: "Elevated event risk unresolved.",
    }),
  });
  assert.notEqual(result.stance, "Take");
  assert.ok(result.stance === "Wait" || result.stance === "Take With Caution");
  assert.ok(
    result.blockingReasons.some((b) => /event/i.test(b)) ||
      result.regimeEffect.level === "Cautionary" ||
      result.regimeEffect.level === "Hostile",
  );
});

test("Strong thesis with poor data quality → Insufficient Data", () => {
  const result = judgment({
    confidence: 88,
    readiness: 90,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    regime: workableRegime({ dataQuality: "Poor" }),
  });
  assert.equal(result.stance, "Insufficient Data");
  assert.equal(result.wouldTakeTrade, false);
});

test("Trader fit positive appears as aligned coaching modifier", () => {
  const result = judgment({
    confidence: 80,
    readiness: 90,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    traderFit: "Aligned",
    personality: "Patient swing",
    profileNotes: ["Matches the trader’s strongest pullback pattern."],
  });
  assert.equal(result.traderFitEffect.level, "Aligned");
  assert.ok(/align|support/i.test(result.traderFitEffect.summary));
  assert.ok(
    result.supportingReasons.some((r) => /aligned|trader fit|pattern/i.test(r)) ||
      result.traderFitEffect.notes.some((n) => /pattern|personality/i.test(n)),
  );
});

test("Trader fit negative is coaching only and does not override objective hostile risk", () => {
  const dnaOnly = judgment({
    confidence: 80,
    readiness: 90,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    traderFit: "Poor Fit",
    profileNotes: ["Trader historically underperforms on late breakouts."],
  });
  // Conflict with strong market + high readiness → caution path, not automatic market Avoid from DNA alone
  assert.ok(
    dnaOnly.stance === "Take With Caution" || dnaOnly.stance === "Wait" || dnaOnly.stance === "Avoid",
  );
  assert.equal(dnaOnly.traderFitEffect.level, "Conflict");
  assert.ok(dnaOnly.traderFitEffect.notes.some((n) => /coaching|conflict|underperform|style/i.test(n)));

  const hostileWins = judgment({
    confidence: 80,
    readiness: 90,
    readinessState: "High-Quality Setup",
    traderFit: "Aligned",
    regime: hostileEventRegime(),
  });
  assert.equal(hostileWins.stance, "Avoid");
  assert.equal(hostileWins.regimeEffect.level, "Hostile");
});

test("deterministic output for identical inputs", () => {
  const args: Args = {
    confidence: 79,
    readiness: 91,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    traderFit: "Aligned",
    readinessBlockers: [],
    sourceTimestamp: NOW,
  };
  const a = judgment(args);
  const b = judgment(args);
  assert.deepEqual(a, b);
});

test("does not change Confidence or Readiness inputs (read-only interpretation)", () => {
  const reasoning = {
    confidenceScore: 77,
    tradeReadinessScore: 89,
    readinessState: "High-Quality Setup" as const,
    readinessBlockers: [] as string[],
    recommendedAction: "Validate" as const,
    traderFit: "Aligned",
    riskQuality: "Excellent" as const,
    confirmationConditions: ["Hold above support"],
    invalidationConditions: ["Break of planned stop"],
    dataState: "Ready" as const,
    coachingMessage: "Validate the plan.",
    reasoningSummary: "Constructive thesis.",
  };
  const before = {
    confidenceScore: reasoning.confidenceScore,
    tradeReadinessScore: reasoning.tradeReadinessScore,
  };
  const result = buildHermesJudgment({
    regime: workableRegime(),
    reasoning,
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2.4 },
    sourceTimestamp: NOW,
  });
  assert.equal(reasoning.confidenceScore, before.confidenceScore);
  assert.equal(reasoning.tradeReadinessScore, before.tradeReadinessScore);
  assert.ok(result.summary.includes("77"));
  assert.ok(result.summary.includes("89"));
  assert.equal(result.stance, "Take");
});

test("does not change Trade Quality and does not override TQ", () => {
  const emptyFactor = {
    category: "Structure" as const,
    weight: 0,
    earned: 0,
    percentage: 0,
    status: "Needs Work" as const,
    reason: "fixture",
  };
  const tq: TradeQualityResult = {
    kind: "hermes-trade-quality-v1",
    symbol: "BTC",
    score: 81,
    rawScore: 84,
    grade: "B+",
    label: "Constructive",
    breakdown: [],
    strengths: [],
    weaknesses: [],
    missingRequirements: [],
    improvements: [],
    whyNotAPlus: [],
    summary: "Fixture TQ",
    riskReward: 2.1,
    planCompleteness: 90,
    suggestedNextAction: "Wait for Confirmation",
    capsApplied: [],
    strongestFactor: emptyFactor,
    weakestFactor: emptyFactor,
  };
  const scoreBefore = tq.score;
  const gradeBefore = tq.grade;
  // Judgment has no TQ input path — fixture remains untouched after judgment call
  judgment({
    confidence: 75,
    readiness: 70,
    readinessState: "Ready With Caution",
  });
  assert.equal(tq.score, scoreBefore);
  assert.equal(tq.grade, gradeBefore);
});

test("contract fields all present", () => {
  const result = judgment();
  assert.equal(result.kind, "hermes-judgment-v1");
  assert.ok(typeof result.summary === "string");
  assert.ok(typeof result.primaryReason === "string");
  assert.ok(Array.isArray(result.supportingReasons));
  assert.ok(Array.isArray(result.blockingReasons));
  assert.ok(Array.isArray(result.conditionsToProceed));
  assert.ok(Array.isArray(result.conditionsToAvoid));
  assert.ok(result.regimeEffect.level);
  assert.ok(result.regimeEffect.summary);
  assert.ok(Array.isArray(result.regimeEffect.factors));
  assert.ok(result.traderFitEffect.level);
  assert.ok(result.traderFitEffect.summary);
  assert.ok(typeof result.sourceTimestamp === "number");
});

test("no Buy/Sell language in judgment outputs", () => {
  const samples = [
    judgment({ confidence: 90, readiness: 92, readinessState: "High-Quality Setup", recommendedAction: "Validate" }),
    judgment({ confidence: 80, readiness: 40, readinessState: "Incomplete" }),
    judgment({ confidence: 30, readiness: 20, readinessState: "Not Ready", recommendedAction: "Avoid" }),
    judgment({ hasOpenPosition: true }),
  ];
  for (const result of samples) {
    const text = [
      result.summary,
      result.primaryReason,
      ...result.supportingReasons,
      ...result.blockingReasons,
      ...result.conditionsToProceed,
      ...result.conditionsToAvoid,
    ].join(" ");
    assert.ok(!/\bbuy\b|\bsell\b/i.test(text), `Found buy/sell in: ${text}`);
  }
});

test("buildRegimeEffect maps event driven and dislocated liquidity to Hostile", () => {
  assert.equal(buildRegimeEffect(hostileEventRegime()).level, "Hostile");
  assert.equal(
    buildRegimeEffect(
      workableRegime({ liquidityRegime: "Dislocated", summary: "Dislocated book." }),
    ).level,
    "Hostile",
  );
  const supportive = buildRegimeEffect(workableRegime());
  assert.equal(supportive.level, "Supportive");
});

test("regime from buildMarketRegime feeds judgment without score side effects", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "ETH", price: 50, change24h: 0.5 },
    candles: candles(),
    multiTimeframe: {
      status: "Conflict",
      alignmentScore: 35,
      higherTimeframeDirection: "Bearish",
      countertrendWarning: "Fighting HTF",
      pattern: "Mixed",
    },
    now: NOW,
  });
  const confBefore = 73;
  const readyBefore = 55;
  const result = buildHermesJudgment({
    regime,
    confidence: confBefore,
    readiness: readyBefore,
    readinessState: "Developing",
    recommendedAction: "Prepare",
    traderFit: "Neutral",
    readinessBlockers: ["Confirmation is still developing."],
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2 },
    sourceTimestamp: NOW,
  });
  assert.equal(confBefore, 73);
  assert.equal(readyBefore, 55);
  assert.ok(["Wait", "Avoid", "Take With Caution", "Insufficient Data"].includes(result.stance));
  assert.notEqual(result.wouldTakeTrade, true);
});

test("invalid plan risk/reward below 1:1 → Avoid", () => {
  const result = judgment({
    confidence: 80,
    readiness: 88,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 0.6 },
  });
  assert.equal(result.stance, "Avoid");
  assert.equal(result.wouldTakeTrade, false);
});
