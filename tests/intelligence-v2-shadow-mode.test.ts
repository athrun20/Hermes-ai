/**
 * Intelligence v2 Shadow Mode tests.
 * Current pipeline remains authority; shadow never mutates production scores.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildShadowMemoKey,
  clearShadowComparisons,
  compareCurrentToV2,
  getLatestShadowComparison,
  getRecentShadowComparisons,
  isShadowModeEnabled,
  runHermesIntelligence,
  runHermesShadowComparison,
  textsAreSemanticallySimilar,
  withShadowStoreReset,
  type HermesIntelligenceInput,
  type HermesShadowCurrentSnapshot,
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

function visionContext(): HermesVisionContext {
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
  };
}

function vision(): HermesVisionResult {
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
  };
}

function reasoningInput(): ReasoningEngineInput {
  return {
    context: visionContext(),
    vision: vision(),
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
    strategy: {
      currentStrategy: {
        type: "Trend Pullback",
        score: 70,
        quality: "Strong",
        whyItFits: ["Pullback into structure"],
        nextConfirmation: "Hold support",
        riskNotes: ["Avoid chasing"],
        traderDnaFit: "Aligned",
      },
      strategies: [],
    },
  };
}

function makeReasoning(): ReasoningResult {
  return buildHermesReasoning(reasoningInput());
}

function tq(score = 77): TradeQualityResult {
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

function hs(score = 77): HermesScoreResult {
  return {
    symbol: "BTC",
    score,
    label: "Constructive",
    explanation: "Fixture",
    breakdown: [],
  };
}

function fullV2Input(reasoning: ReasoningResult, overrides: Partial<HermesIntelligenceInput> = {}): HermesIntelligenceInput {
  const tradeQuality = tq(77);
  const hermesScore = hs(77);
  return {
    symbol: "BTC",
    timeframe: "1H",
    sourceTimestamp: reasoning.timestamp,
    quote: { symbol: "BTC", price: 100, change24h: 1.2 },
    candles: candles(),
    vision: vision(),
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
    reasoning,
    tradeQuality,
    hermesScore,
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2.2 },
    riskQuality: reasoning.riskQuality,
    hasOpenPosition: false,
    dataFreshness: "fixture",
    ...overrides,
  };
}

function currentFromReasoning(
  reasoning: ReasoningResult,
  extras: Partial<HermesShadowCurrentSnapshot> = {},
): HermesShadowCurrentSnapshot {
  return {
    symbol: "BTC",
    timeframe: "1H",
    confidence: reasoning.confidenceScore,
    readiness: reasoning.tradeReadinessScore,
    readinessState: reasoning.readinessState,
    tradeQualityScore: 77,
    hermesScore: 77,
    thesis: reasoning.reasoningSummary,
    marketContext: reasoning.marketContext,
    coachMessage: reasoning.coachingMessage,
    dataState: reasoning.dataState,
    hasOpenPosition: false,
    ...extras,
  };
}

test("exact numerical parity for Confidence, Readiness, TQ, Hermes Score", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const current = currentFromReasoning(reasoning);
    const confBefore = reasoning.confidenceScore;
    const readyBefore = reasoning.tradeReadinessScore;

    const result = runHermesShadowComparison({
      current,
      v2Input: fullV2Input(reasoning),
      timestamp: NOW,
      silent: true,
      skipRecord: false,
    });

    assert.equal(result.authority, "current-pipeline");
    assert.equal(reasoning.confidenceScore, confBefore);
    assert.equal(reasoning.tradeReadinessScore, readyBefore);

    const conf = result.comparisons.find((c) => c.field === "confidence");
    const ready = result.comparisons.find((c) => c.field === "readiness");
    const tqRow = result.comparisons.find((c) => c.field === "tradeQualityScore");
    const hsRow = result.comparisons.find((c) => c.field === "hermesScore");

    assert.equal(conf?.comparableStatus, "Comparable");
    assert.equal(conf?.passed, true);
    assert.equal(conf?.difference, 0);
    assert.equal(conf?.tolerance, 0);
    assert.equal(ready?.passed, true);
    assert.equal(tqRow?.passed, true);
    assert.equal(hsRow?.passed, true);
    assert.ok(result.parityStatus === "Pass" || result.parityStatus === "Partial");
  });
});

test("missing optional inputs recorded without breaking parity of supplied scores", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const result = runHermesShadowComparison({
      current: currentFromReasoning(reasoning, {
        tradeQualityScore: undefined,
        hermesScore: undefined,
      }),
      v2Input: {
        symbol: "BTC",
        timeframe: "1H",
        sourceTimestamp: NOW,
        quote: { symbol: "BTC", price: 100, change24h: 1 },
        candles: candles(),
        reasoning,
        dataFreshness: "fixture",
      },
      timestamp: NOW,
      silent: true,
    });

    assert.ok(result.missingInputs.includes("tradeQuality"));
    assert.ok(result.missingInputs.includes("hermesScore"));
    assert.equal(result.comparisons.find((c) => c.field === "confidence")?.passed, true);
    assert.equal(result.authority, "current-pipeline");
  });
});

test("degraded v2 bundle surfaces Partial parity and degraded flag", () => {
  withShadowStoreReset(() => {
    const result = runHermesShadowComparison({
      current: {
        symbol: "BTC",
        timeframe: "1H",
        confidence: 60,
        readiness: 40,
        hasOpenPosition: false,
        dataState: "Insufficient Data",
      },
      v2Input: {
        symbol: "BTC",
        sourceTimestamp: NOW,
        quote: { symbol: "BTC", price: 100, change24h: 0 },
        candles: [],
        dataQualityOverride: "Poor",
        dataFreshness: "fixture",
      },
      timestamp: NOW,
      silent: true,
    });

    assert.equal(result.degraded, true);
    assert.ok(result.parityStatus === "Partial" || result.parityStatus === "Fail" || result.parityStatus === "Error");
    assert.ok(result.warnings.length > 0 || result.degraded);
  });
});

test("v2 exception isolation — never throws to caller", () => {
  withShadowStoreReset(() => {
    const result = runHermesShadowComparison({
      current: {
        symbol: "BTC",
        confidence: 70,
        readiness: 50,
        hasOpenPosition: false,
      },
      v2Input: {
        // Invalid programmer input causes orchestrator throw — shadow must catch
        symbol: "" as "BTC",
        quote: { symbol: "BTC", price: 100, change24h: 0 },
        candles: [],
      },
      timestamp: NOW,
      silent: true,
    });

    assert.equal(result.parityStatus, "Error");
    assert.ok(result.error);
    assert.equal(result.authority, "current-pipeline");
    assert.ok(result.warnings.some((w) => /current pipeline remains authoritative/i.test(w)));
  });
});

test("current pipeline remains authoritative on result contract", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const result = runHermesShadowComparison({
      current: currentFromReasoning(reasoning),
      v2Input: fullV2Input(reasoning),
      timestamp: NOW,
      silent: true,
    });
    assert.equal(result.authority, "current-pipeline");
    assert.equal(result.kind, "hermes-shadow-comparison-v1");
    // Shadow does not invent product scores into current snapshot
    assert.equal(result.currentSnapshot.confidence, reasoning.confidenceScore);
  });
});

test("no UI output fields required — comparison is internal only", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const result = runHermesShadowComparison({
      current: currentFromReasoning(reasoning),
      v2Input: fullV2Input(reasoning),
      timestamp: NOW,
      silent: true,
    });
    assert.equal((result as { ui?: unknown }).ui, undefined);
    assert.equal((result as { render?: unknown }).render, undefined);
    assert.equal((result as { panel?: unknown }).panel, undefined);
  });
});

test("no paper-trading side effects", () => {
  withShadowStoreReset(() => {
    const keysBefore = Object.keys(globalThis).length;
    const reasoning = makeReasoning();
    runHermesShadowComparison({
      current: currentFromReasoning(reasoning, { hasOpenPosition: true }),
      v2Input: fullV2Input(reasoning, { hasOpenPosition: true }),
      timestamp: NOW,
      silent: true,
    });
    assert.equal(Object.keys(globalThis).length, keysBefore);
  });
});

test("semantic comparison treats equivalent coach wording as pass", () => {
  assert.equal(
    textsAreSemanticallySimilar(
      "Stay patient and wait for confirmation before increasing risk.",
      "Hermes would wait. Confidence is strong but readiness needs confirmation.",
    ),
    true,
  );
});

test("not-comparable fields for Judgment and Conviction", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const result = runHermesShadowComparison({
      current: currentFromReasoning(reasoning),
      v2Input: fullV2Input(reasoning),
      timestamp: NOW,
      silent: true,
    });
    const judgment = result.comparisons.find((c) => c.field === "judgmentStance");
    const conviction = result.comparisons.find((c) => c.field === "convictionLevel");
    assert.equal(judgment?.comparableStatus, "Not Comparable");
    assert.equal(judgment?.passed, null);
    assert.equal(conviction?.comparableStatus, "Not Comparable");
    assert.equal(conviction?.passed, null);
  });
});

test("deterministic comparison output for identical inputs", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const current = currentFromReasoning(reasoning);
    const v2Input = fullV2Input(reasoning);
    const a = runHermesShadowComparison({
      current,
      v2Input,
      timestamp: NOW,
      silent: true,
      skipRecord: true,
    });
    const b = runHermesShadowComparison({
      current,
      v2Input,
      timestamp: NOW,
      silent: true,
      skipRecord: true,
    });
    // durationMs may differ by 1ms — compare parity payload without duration
    const strip = (r: typeof a) => {
      const { durationMs: _d, ...rest } = r;
      return rest;
    };
    assert.deepEqual(strip(a), strip(b));
  });
});

test("no input mutation of current scores", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const tradeQuality = tq(81);
    const hermesScore = hs(81);
    const conf = reasoning.confidenceScore;
    const ready = reasoning.tradeReadinessScore;
    const tqScore = tradeQuality.score;
    const hsScore = hermesScore.score;

    runHermesShadowComparison({
      current: currentFromReasoning(reasoning, {
        tradeQualityScore: tqScore,
        hermesScore: hsScore,
      }),
      v2Input: fullV2Input(reasoning, { tradeQuality, hermesScore }),
      timestamp: NOW,
      silent: true,
    });

    assert.equal(reasoning.confidenceScore, conf);
    assert.equal(reasoning.tradeReadinessScore, ready);
    assert.equal(tradeQuality.score, tqScore);
    assert.equal(hermesScore.score, hsScore);
  });
});

test("performance-safe memo key is stable for same fingerprints", () => {
  const keyA = buildShadowMemoKey({
    symbol: "BTC",
    timeframe: "1H",
    confidence: 70,
    readiness: 55,
    tradeQualityScore: 77,
    hermesScore: 77,
    hasOpenPosition: false,
    reasoningTimestamp: NOW,
    candleCount: 12,
    lastCandleTime: 100,
  });
  const keyB = buildShadowMemoKey({
    symbol: "BTC",
    timeframe: "1H",
    confidence: 70,
    readiness: 55,
    tradeQualityScore: 77,
    hermesScore: 77,
    hasOpenPosition: false,
    reasoningTimestamp: NOW,
    candleCount: 12,
    lastCandleTime: 100,
  });
  const keyC = buildShadowMemoKey({
    symbol: "BTC",
    timeframe: "1H",
    confidence: 71,
    readiness: 55,
    tradeQualityScore: 77,
    hermesScore: 77,
    hasOpenPosition: false,
    reasoningTimestamp: NOW,
    candleCount: 12,
    lastCandleTime: 100,
  });
  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);
});

test("isShadowModeEnabled respects env flags", () => {
  assert.equal(isShadowModeEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isShadowModeEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isShadowModeEnabled({ NODE_ENV: "test" }), true);
  assert.equal(isShadowModeEnabled({ NODE_ENV: "production", HERMES_SHADOW_MODE: "1" }), true);
  assert.equal(isShadowModeEnabled({ NODE_ENV: "development", HERMES_SHADOW_MODE: "0" }), false);
});

test("in-memory store keeps recent comparisons only", () => {
  withShadowStoreReset(() => {
    clearShadowComparisons();
    const reasoning = makeReasoning();
    for (let i = 0; i < 3; i += 1) {
      runHermesShadowComparison({
        current: currentFromReasoning(reasoning),
        v2Input: fullV2Input(reasoning),
        timestamp: NOW + i,
        silent: true,
      });
    }
    assert.ok(getRecentShadowComparisons().length >= 3);
    assert.ok(getLatestShadowComparison());
    clearShadowComparisons();
    assert.equal(getRecentShadowComparisons().length, 0);
  });
});

test("compareCurrentToV2 pure path marks numerical Fail on forced mismatch", () => {
  const reasoning = makeReasoning();
  const bundle = runHermesIntelligence(fullV2Input(reasoning));
  const comparison = compareCurrentToV2({
    current: currentFromReasoning(reasoning, { confidence: reasoning.confidenceScore + 5 }),
    bundle,
    timestamp: NOW,
    durationMs: 1,
  });
  const conf = comparison.comparisons.find((c) => c.field === "confidence");
  assert.equal(conf?.passed, false);
  assert.equal(comparison.parityStatus, "Fail");
  assert.equal(comparison.authority, "current-pipeline");
});

test("open-position management path is partially comparable", () => {
  withShadowStoreReset(() => {
    const reasoning = makeReasoning();
    const result = runHermesShadowComparison({
      current: currentFromReasoning(reasoning, { hasOpenPosition: true }),
      v2Input: fullV2Input(reasoning, { hasOpenPosition: true }),
      timestamp: NOW,
      silent: true,
    });
    const row = result.comparisons.find((c) => c.field === "openPositionManagement");
    assert.equal(row?.comparableStatus, "Partially Comparable");
    assert.equal(row?.passed, true);
    assert.equal(result.v2Snapshot.judgmentStance, "Manage Existing Position");
  });
});
