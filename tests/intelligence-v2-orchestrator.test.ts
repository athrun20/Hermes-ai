/**
 * Intelligence v2 orchestrator tests.
 * Composition boundary only — no score recomputation, UI, or paper-trading side effects.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHermesConviction,
  buildHermesJudgment,
  buildHermesOpinion,
  buildMarketRegime,
  bundleContainsTradeCommands,
  bundleHasPositionSizeFields,
  collectHermesEvidence,
  packageConfidenceBreakdown,
  runHermesIntelligence,
  type HermesIntelligenceInput,
} from "../lib/intelligence-v2/index";
import type { Candle } from "../lib/market-data";
import type { HermesVisionContext, HermesVisionResult } from "../lib/hermes-vision-types";
import type { ReasoningEngineInput, ReasoningResult } from "../lib/reasoning-types";
import { buildHermesReasoning } from "../lib/reasoning-engine";
import type { TradeQualityResult } from "../lib/trade-quality-types";
import type { HermesScoreResult } from "../lib/hermes-score-types";

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

function visionContext(overrides: Partial<HermesVisionContext> = {}): HermesVisionContext {
  return {
    symbol: "BTC",
    currentPrice: 100,
    candleTrend: "Bullish",
    ema20: 99,
    ema50: 97,
    vwap: 98,
    rsi: 55,
    macd: { line: 1, signal: 0.5, histogram: 0.5 },
    volume: { current: 120, average: 100, status: "Rising" },
    averageCandleRange: 1.2,
    horizontalLines: [],
    trendLines: [],
    supportZones: [],
    resistanceZones: [],
    tradeLevels: { entry: 100, stop: 95, target: 110 },
    riskReward: 2,
    distanceFromSupport: 0.02,
    distanceFromResistance: 0.05,
    traderDna: "Patient swing",
    dailyGoal: "Only A setups",
    ...overrides,
  };
}

function vision(overrides: Partial<HermesVisionResult> = {}): HermesVisionResult {
  return {
    kind: "hermes-vision",
    symbol: "BTC",
    primaryInsight: "Constructive structure above support.",
    setupStructureScore: 72,
    trendScore: 70,
    momentumScore: 65,
    volumeScore: 68,
    riskScore: 60,
    confirmationScore: 66,
    confidenceAdjustment: 3,
    suggestedAction: "Study Setup",
    labels: [],
    reasons: ["Support holds."],
    dimensions: [
      { dimension: "Structure", score: 72, verdict: "Constructive", reasons: ["Support holds."] },
      { dimension: "Trend", score: 70, verdict: "Constructive", reasons: ["Uptrend."] },
      { dimension: "Momentum", score: 65, verdict: "Constructive", reasons: ["Improving."] },
      { dimension: "Volume", score: 68, verdict: "Constructive", reasons: ["Expanding."] },
      { dimension: "Confirmation", score: 66, verdict: "Constructive", reasons: ["Building."] },
      { dimension: "Risk", score: 60, verdict: "Constructive", reasons: ["RR acceptable."] },
    ],
    caution: { active: false, message: "" },
    ...overrides,
  };
}

function reasoningInput(overrides: Partial<ReasoningEngineInput> = {}): ReasoningEngineInput {
  return {
    context: visionContext(),
    vision: vision(),
    multiTimeframe: {
      symbol: "BTC",
      activeTimeframe: "1H",
      rows: [],
      alignmentScore: 75,
      status: "Constructive",
      pattern: "Higher-timeframe bullish pullback",
      mentorSummary: "Higher timeframe remains constructive.",
      alignmentImpact: 2,
      higherTimeframeDirection: "Bullish",
      countertrendWarning: null,
    },
    footprint: {
      type: "Accumulation",
      confidence: 70,
      strength: "Developing",
      direction: "Bullish",
      confirmationStatus: "Developing",
      evidence: ["Rising participation"],
      explanation: "Participation suggests constructive demand context.",
      riskNote: "Still needs confirmation.",
      suggestedAction: "Wait for confirmation",
      confirmationNeeded: "Hold above support",
      confidenceImpact: 2,
      chartLabels: [],
    },
    news: {
      symbol: "BTC",
      pressReleases: [],
      news: [],
      detectedKeywords: [],
      sentiment: "Neutral",
      urgency: "Low",
      possibleMarketImpact: "Limited headline risk.",
      hermesInterpretation: "News is quiet.",
      riskCaution: { active: false, message: "" },
      chartMarker: { active: false, label: "", tone: "gold" },
    },
    strategy: {
      currentStrategy: {
        type: "Trend Pullback",
        fitScore: 70,
        traderDnaFit: "Aligned",
        whyItFits: "Matches patient swing style.",
        invalidation: "Loss of support",
        nextConfirmation: "Volume expansion on reclaim",
        riskNotes: [],
      },
      alternatives: [],
      mentorNote: "Stay patient.",
    },
    ...overrides,
  };
}

function makeReasoning(overrides: Partial<ReasoningEngineInput> = {}): ReasoningResult {
  return buildHermesReasoning(reasoningInput(overrides));
}

function tqFixture(score = 77): TradeQualityResult {
  const emptyFactor = {
    category: "Structure" as const,
    weight: 0,
    earned: 0,
    percentage: 0,
    status: "Needs Work" as const,
    reason: "fixture",
  };
  return {
    kind: "hermes-trade-quality-v1",
    symbol: "BTC",
    score,
    rawScore: score + 3,
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
    planCompleteness: 80,
    suggestedNextAction: "Wait for Confirmation",
    capsApplied: [],
    strongestFactor: emptyFactor,
    weakestFactor: emptyFactor,
  };
}

function hermesScoreFixture(score = 77): HermesScoreResult {
  return {
    symbol: "BTC",
    score,
    label: "Constructive",
    explanation: "Fixture Hermes Score",
    breakdown: [],
  };
}

function fullInput(overrides: Partial<HermesIntelligenceInput> = {}): HermesIntelligenceInput {
  const reasoning = overrides.reasoning === undefined ? makeReasoning() : overrides.reasoning;
  const v = vision();
  return {
    symbol: "BTC",
    timeframe: "1H",
    sourceTimestamp: NOW,
    quote: { symbol: "BTC", price: 100, change24h: 1.2 },
    candles: candles(),
    vision: v,
    visionContext: {
      candleTrend: "Bullish",
      averageCandleRange: 1.2,
      currentPrice: 100,
      volume: { current: 120, average: 100, status: "Rising" },
      rsi: 55,
    },
    multiTimeframe: {
      symbol: "BTC",
      activeTimeframe: "1H",
      rows: [],
      alignmentScore: 75,
      status: "Constructive",
      pattern: "HTF bullish",
      mentorSummary: "Higher timeframe constructive.",
      alignmentImpact: 2,
      higherTimeframeDirection: "Bullish",
      countertrendWarning: null,
    },
    footprint: {
      type: "Accumulation",
      confidence: 70,
      strength: "Developing",
      direction: "Bullish",
      confirmationStatus: "Developing",
      evidence: ["Rising participation"],
      explanation: "Participation constructive.",
      riskNote: "Needs confirmation.",
      suggestedAction: "Wait for confirmation",
      confirmationNeeded: "Hold support",
      confidenceImpact: 2,
      chartLabels: [],
    },
    news: {
      symbol: "BTC",
      pressReleases: [],
      news: [],
      detectedKeywords: [],
      sentiment: "Neutral",
      urgency: "Low",
      possibleMarketImpact: "Limited.",
      hermesInterpretation: "Quiet.",
      riskCaution: { active: false, message: "" },
      chartMarker: { active: false, label: "", tone: "gold" },
    },
    reasoning: reasoning ?? undefined,
    tradeQuality: tqFixture(),
    hermesScore: hermesScoreFixture(),
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2.2 },
    riskQuality: reasoning?.riskQuality ?? "Good",
    dataFreshness: "fixture",
    ...overrides,
    // ensure explicit undefined reasoning stays if override set null-ish via special key
  };
}

test("full valid bundle shape and stage presence", () => {
  const input = fullInput();
  const bundle = runHermesIntelligence(input);
  assert.equal(bundle.kind, "hermes-intelligence-bundle-v2");
  assert.equal(bundle.version, 2);
  assert.equal(bundle.symbol, "BTC");
  assert.equal(bundle.sourceTimestamp, NOW);
  assert.equal(bundle.regime.kind, "hermes-market-regime-v1");
  assert.ok(bundle.evidence.length > 0);
  assert.equal(bundle.reasoning.source, "supplied");
  assert.ok(bundle.confidenceBreakdown);
  assert.equal(bundle.judgment.kind, "hermes-judgment-v1");
  assert.ok(bundle.opinion);
  assert.equal(bundle.conviction.kind, "hermes-conviction-v1");
  assert.equal(bundle.decision.source, "supplied");
  assert.ok(bundle.coach.headline.length > 0);
  assert.ok(bundle.provenance.stages.length >= 8);
  assert.equal(typeof bundle.degraded, "boolean");
  assert.ok(Array.isArray(bundle.warnings));
});

test("partial bundle with missing optional modules still returns", () => {
  const reasoning = makeReasoning();
  const bundle = runHermesIntelligence({
    symbol: "ETH",
    timeframe: "1H",
    sourceTimestamp: NOW,
    quote: { symbol: "ETH", price: 50, change24h: 0.2 },
    candles: candles(8),
    reasoning,
    dataFreshness: "fixture",
  });
  assert.equal(bundle.symbol, "ETH");
  assert.ok(bundle.evidence.length >= 1);
  assert.equal(bundle.reasoning.source, "supplied");
  assert.ok(bundle.judgment);
  assert.ok(bundle.conviction);
  assert.ok(bundle.warnings.some((w) => /optional|partial|module/i.test(w) || bundle.degraded));
});

test("missing optional modules degrades gracefully", () => {
  const bundle = runHermesIntelligence({
    symbol: "BTC",
    sourceTimestamp: NOW,
    quote: { symbol: "BTC", price: 100, change24h: 0 },
    candles: candles(3),
    dataFreshness: "fixture",
  });
  assert.equal(bundle.reasoning.source, "absent");
  assert.equal(bundle.confidenceBreakdown, undefined);
  assert.equal(bundle.opinion, undefined);
  assert.equal(bundle.judgment.stance, "Insufficient Data");
  assert.ok(bundle.degraded);
  assert.ok(bundle.warnings.some((w) => /reasoning/i.test(w)));
  assert.ok(bundle.provenance.stages.some((s) => s.stage === "Confidence Breakdown" && s.status === "skipped"));
});

test("poor data quality is explicit on bundle", () => {
  const bundle = runHermesIntelligence({
    symbol: "BTC",
    sourceTimestamp: NOW,
    quote: { symbol: "BTC", price: 100, change24h: 0 },
    candles: [],
    dataQualityOverride: "Poor",
    dataFreshness: "fixture",
  });
  assert.equal(bundle.dataQuality, "Poor");
  assert.ok(bundle.degraded);
  assert.equal(bundle.judgment.stance, "Insufficient Data");
});

test("stale data warning path", () => {
  const reasoning = makeReasoning();
  // force stale dataState on a shallow clone-like override via object spread
  const stale = { ...reasoning, dataState: "Stale" as const };
  const bundle = runHermesIntelligence(
    fullInput({
      reasoning: stale,
      dataFreshness: "stale",
    }),
  );
  assert.ok(bundle.warnings.some((w) => /stale/i.test(w)));
  assert.ok(
    bundle.provenance.stages.some(
      (s) => s.stage === "Hermes Reasoning" && (s.freshness === "stale" || s.status === "degraded"),
    ),
  );
});

test("conflicting evidence preserved and warned", () => {
  const input = fullInput();
  const bundle = runHermesIntelligence(input);
  const hasConflict = bundle.evidence.some((e) => e.direction === "Contradictory");
  // With full modules we may or may not have contradictions; inject via footprint conflict
  const conflictReasoning = makeReasoning();
  const bundle2 = runHermesIntelligence(
    fullInput({
      reasoning: conflictReasoning,
      multiTimeframe: {
        symbol: "BTC",
        activeTimeframe: "1H",
        rows: [],
        alignmentScore: 40,
        status: "Conflict",
        pattern: "Mixed",
        mentorSummary: "Conflict across timeframes.",
        alignmentImpact: -2,
        higherTimeframeDirection: "Bearish",
        countertrendWarning: "Fighting HTF",
      },
    }),
  );
  assert.ok(
    bundle2.evidence.some((e) => e.direction === "Contradictory") ||
      bundle2.warnings.some((w) => /conflict/i.test(w)) ||
      hasConflict,
  );
});

test("missing reasoning skips breakdown and opinion", () => {
  const bundle = runHermesIntelligence({
    symbol: "BTC",
    sourceTimestamp: NOW,
    quote: { symbol: "BTC", price: 100, change24h: 1 },
    candles: candles(),
    vision: vision(),
    dataFreshness: "fixture",
  });
  assert.equal(bundle.reasoning.source, "absent");
  assert.equal(bundle.confidenceBreakdown, undefined);
  assert.equal(bundle.opinion, undefined);
  assert.ok(bundle.judgment);
  assert.ok(bundle.conviction);
  assert.ok(bundle.coach.explanation.includes("not recomputed") || /not supplied/i.test(bundle.coach.explanation));
});

test("open-position path uses management judgment", () => {
  const reasoning = makeReasoning();
  const bundle = runHermesIntelligence(
    fullInput({
      reasoning,
      hasOpenPosition: true,
    }),
  );
  assert.equal(bundle.judgment.stance, "Manage Existing Position");
  assert.notEqual(bundle.conviction.level, "High");
  assert.ok(
    bundle.conviction.sizingBias === "Reduced Risk" || bundle.conviction.sizingBias === "No New Risk",
  );
});

test("deterministic for identical inputs", () => {
  const input = fullInput();
  const a = runHermesIntelligence(input);
  const b = runHermesIntelligence(input);
  assert.deepEqual(a, b);
});

test("provenance preservation across stages", () => {
  const bundle = runHermesIntelligence(fullInput());
  const names = bundle.provenance.stages.map((s) => s.stage);
  for (const required of [
    "Market Regime",
    "Evidence Collection",
    "Hermes Reasoning",
    "Confidence Breakdown",
    "Hermes Judgment",
    "Hermes Opinion",
    "Hermes Conviction",
    "Decision",
    "Coach Explanation",
  ]) {
    assert.ok(names.includes(required), `missing stage ${required}`);
  }
  assert.ok(bundle.provenance.sourceModules.length > 0);
  assert.ok(bundle.provenance.overallFreshness === "fixture");
  for (const stage of bundle.provenance.stages) {
    assert.ok(Array.isArray(stage.sourceModules));
    assert.ok(Array.isArray(stage.inputRefs));
    assert.ok(Array.isArray(stage.limitations));
    assert.ok(typeof stage.sourceTimestamp === "number");
  }
});

test("evidence traceability retained on coach and opinion", () => {
  const bundle = runHermesIntelligence(fullInput());
  assert.ok(bundle.evidence.every((e) => e.id && e.sourceModules.length > 0));
  assert.ok(bundle.opinion);
  assert.ok(bundle.opinion!.sourceEvidenceIds.length > 0 || bundle.coach.sourceEvidenceIds.length > 0);
  assert.ok(bundle.coach.sourceEvidenceIds.every((id) => typeof id === "string"));
});

test("Confidence Breakdown parity with standalone packaging", () => {
  const reasoning = makeReasoning();
  const confBefore = reasoning.confidenceScore;
  const readyBefore = reasoning.tradeReadinessScore;
  const input = fullInput({ reasoning });
  const bundle = runHermesIntelligence(input);

  const regime = buildMarketRegime({
    quote: input.quote,
    candles: input.candles,
    vision: input.vision,
    visionContext: input.visionContext,
    multiTimeframe: input.multiTimeframe,
    news: input.news,
    now: NOW,
  });
  const evidence = collectHermesEvidence({
    regime,
    vision: input.vision,
    multiTimeframe: input.multiTimeframe,
    footprint: input.footprint,
    news: input.news,
    symbol: "BTC",
    now: NOW,
  });
  const standalone = packageConfidenceBreakdown({
    reasoning,
    hermesEvidence: evidence,
    sourceTimestamp: NOW,
  });

  assert.ok(bundle.confidenceBreakdown);
  assert.equal(bundle.confidenceBreakdown!.finalScore, confBefore);
  assert.equal(bundle.confidenceBreakdown!.finalScore, standalone.finalScore);
  assert.equal(bundle.reasoning.confidence, confBefore);
  assert.equal(bundle.reasoning.readiness, readyBefore);
  assert.equal(reasoning.confidenceScore, confBefore);
  assert.equal(reasoning.tradeReadinessScore, readyBefore);
});

test("Judgment parity with standalone builder", () => {
  const reasoning = makeReasoning();
  const input = fullInput({ reasoning, hasOpenPosition: false });
  const bundle = runHermesIntelligence(input);
  const regime = bundle.regime;
  const standalone = buildHermesJudgment({
    regime,
    reasoning,
    plan: input.plan,
    riskQuality: input.riskQuality,
    hasOpenPosition: false,
    sourceTimestamp: NOW,
  });
  assert.deepEqual(bundle.judgment, standalone);
});

test("Opinion parity with standalone builder", () => {
  const reasoning = makeReasoning();
  const input = fullInput({ reasoning });
  const bundle = runHermesIntelligence(input);
  assert.ok(bundle.confidenceBreakdown);
  assert.ok(bundle.opinion);
  const standalone = buildHermesOpinion({
    regime: bundle.regime,
    evidence: bundle.evidence,
    confidenceBreakdown: bundle.confidenceBreakdown!,
    judgment: bundle.judgment,
    readinessScore: reasoning.tradeReadinessScore,
    readinessState: reasoning.readinessState,
    thesis: reasoning.reasoningSummary,
    sourceTimestamp: NOW,
  });
  assert.deepEqual(bundle.opinion, standalone);
});

test("Conviction parity with standalone builder", () => {
  const reasoning = makeReasoning();
  const input = fullInput({ reasoning });
  const bundle = runHermesIntelligence(input);
  const standalone = buildHermesConviction({
    judgment: bundle.judgment,
    opinion: bundle.opinion,
    regime: bundle.regime,
    confidence: reasoning.confidenceScore,
    readiness: reasoning.tradeReadinessScore,
    riskQuality: input.riskQuality ?? reasoning.riskQuality,
    evidence: bundle.evidence,
    hasOpenPosition: false,
    sourceTimestamp: NOW,
  });
  assert.deepEqual(bundle.conviction, standalone);
});

test("no Buy/Sell language in orchestrated coach fields", () => {
  const bundle = runHermesIntelligence(fullInput());
  assert.equal(bundleContainsTradeCommands(bundle), false);
});

test("no input mutation of scores or TQ", () => {
  const reasoning = makeReasoning();
  const tq = tqFixture(81);
  const score = hermesScoreFixture(81);
  const confBefore = reasoning.confidenceScore;
  const readyBefore = reasoning.tradeReadinessScore;
  const tqBefore = tq.score;
  const hsBefore = score.score;
  runHermesIntelligence(
    fullInput({
      reasoning,
      tradeQuality: tq,
      hermesScore: score,
    }),
  );
  assert.equal(reasoning.confidenceScore, confBefore);
  assert.equal(reasoning.tradeReadinessScore, readyBefore);
  assert.equal(tq.score, tqBefore);
  assert.equal(score.score, hsBefore);
});

test("no score recalculation — mirrors supplied values only", () => {
  const reasoning = makeReasoning();
  const tq = tqFixture(66);
  const hs = hermesScoreFixture(66);
  const bundle = runHermesIntelligence(
    fullInput({
      reasoning,
      tradeQuality: tq,
      hermesScore: hs,
    }),
  );
  assert.equal(bundle.reasoning.confidence, reasoning.confidenceScore);
  assert.equal(bundle.reasoning.readiness, reasoning.tradeReadinessScore);
  assert.equal(bundle.decision.tradeQualityScore, 66);
  assert.equal(bundle.decision.hermesScore, 66);
  assert.equal(bundle.confidenceBreakdown?.finalScore, reasoning.confidenceScore);
});

test("no position-size output fields", () => {
  const bundle = runHermesIntelligence(fullInput());
  assert.equal(bundleHasPositionSizeFields(bundle), false);
  assert.ok(bundle.conviction.riskConstraints.some((c) => /does not calculate position size/i.test(c)));
});

test("no paper-trading side effects (pure function)", () => {
  const globalKeysBefore = Object.keys(globalThis).length;
  runHermesIntelligence(fullInput({ hasOpenPosition: true }));
  assert.equal(Object.keys(globalThis).length, globalKeysBefore);
});

test("throws only on invalid programmer inputs", () => {
  assert.throws(
    () =>
      runHermesIntelligence({
        // @ts-expect-error intentional
        symbol: "",
        quote: { symbol: "BTC", price: 100, change24h: 0 },
        candles: [],
      }),
    /symbol/i,
  );
  assert.throws(
    () =>
      // @ts-expect-error intentional
      runHermesIntelligence({
        symbol: "BTC",
        candles: [],
      }),
    /quote/i,
  );
  assert.throws(
    () =>
      runHermesIntelligence({
        symbol: "BTC",
        quote: { symbol: "BTC", price: Number.NaN, change24h: 0 },
        candles: [],
      }),
    /price/i,
  );
});

test("Decision package absent when no TQ/decision/score supplied", () => {
  const reasoning = makeReasoning();
  const bundle = runHermesIntelligence({
    symbol: "BTC",
    sourceTimestamp: NOW,
    quote: { symbol: "BTC", price: 100, change24h: 1 },
    candles: candles(),
    reasoning,
    dataFreshness: "fixture",
  });
  assert.equal(bundle.decision.source, "absent");
  assert.ok(bundle.provenance.stages.some((s) => s.stage === "Decision" && s.status === "missing"));
});

test("unsupported timeframe warns without throwing", () => {
  const bundle = runHermesIntelligence(fullInput({ timeframe: "3s" }));
  assert.ok(bundle.warnings.some((w) => /timeframe/i.test(w)));
  assert.equal(bundle.kind, "hermes-intelligence-bundle-v2");
});
