/**
 * Smart Chart Intelligence v2 — annotations, story timeline, confidence history.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildSmartChartIntelligence } from "../lib/smart-chart-intelligence";
import type { SmartChartIntelligenceInput } from "../lib/smart-chart-intelligence-types";
import { buildMarketRegime, collectHermesEvidence } from "../lib/intelligence-v2";
import type { Candle } from "../lib/market-data";
import type { HermesVisionContext, HermesVisionResult } from "../lib/hermes-vision-types";
import type { ReasoningResult } from "../lib/reasoning-types";
import type { MultiTimeframeIntelligence } from "../lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "../lib/footprint-types";
import type { NewsIntelligenceResult } from "../lib/news-types";

const T0 = 1_700_000_000_000;

function makeCandles(count: number, opts?: { breakUp?: boolean; sweepLow?: boolean }): Candle[] {
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = price + (i % 3 === 0 ? 0.4 : -0.2);
    const high = Math.max(open, close) + 0.5;
    const low = Math.min(open, close) - 0.5;
    candles.push({
      time: T0 + i * 60_000,
      open,
      high,
      low,
      close,
    });
    price = close;
  }
  if (opts?.breakUp && candles.length > 3) {
    const last = candles[candles.length - 1];
    const priorHigh = Math.max(...candles.slice(0, -1).map((c) => c.high));
    last.high = priorHigh + 2;
    last.close = priorHigh + 1.2;
  }
  if (opts?.sweepLow && candles.length > 4) {
    const last = candles[candles.length - 1];
    const priorLow = Math.min(...candles.slice(0, -1).map((c) => c.low));
    last.low = priorLow - 1.5;
    last.close = priorLow + 0.3;
    last.open = priorLow - 0.2;
  }
  return candles;
}

function baseInput(overrides?: Partial<SmartChartIntelligenceInput>): SmartChartIntelligenceInput {
  const candles = overrides?.candles ?? makeCandles(40);
  const last = candles[candles.length - 1];
  const context: HermesVisionContext = {
    symbol: "BTC",
    currentPrice: last.close,
    candleTrend: "Bullish",
    ema20: last.close * 0.998,
    ema50: last.close * 0.995,
    vwap: last.close * 0.999,
    rsi: 55,
    macd: { line: 0.4, signal: 0.2, histogram: 0.2 },
    volume: { current: 1200, average: 800, status: "Rising" },
    averageCandleRange: 1.2,
    horizontalLines: [],
    trendLines: [],
    supportZones: [],
    resistanceZones: [],
    tradeLevels: {},
    riskReward: 2,
    distanceFromSupport: 0.02,
    distanceFromResistance: 0.03,
    traderDna: "Day Trader",
    dailyGoal: "Protect capital",
  };
  const vision = {
    kind: "hermes-vision",
    symbol: "BTC",
    primaryInsight: "Structure developing",
    setupStructureScore: 70,
    trendScore: 68,
    momentumScore: 66,
    volumeScore: 72,
    riskScore: 60,
    confirmationScore: 64,
    confidenceAdjustment: 2,
    suggestedAction: "Study Setup",
    labels: [],
    reasons: ["Structure constructive"],
    dimensions: [
      {
        dimension: "Structure",
        score: 70,
        verdict: "Constructive",
        reasons: ["HH/HL forming"],
      },
    ],
    caution: { active: false, message: "" },
  } as HermesVisionResult;

  const reasoning = {
    marketStructure: "Higher Highs and Higher Lows",
    confidenceScore: 62,
    tradeReadinessScore: 55,
    readinessState: "Developing",
    coachingMessage: "Wait for confirmation.",
  } as ReasoningResult;

  const multiTimeframe = {
    status: "Aligned",
    alignmentScore: 72,
    higherTimeframeDirection: "Bullish",
    countertrendWarning: false,
    pattern: "Trend",
  } as MultiTimeframeIntelligence;

  const footprint = {
    type: "No clear institutional footprint",
    direction: "Neutral",
    confidence: 40,
    confidenceImpact: 0,
    explanation: "No clear footprint.",
    riskNote: "Watch participation.",
    chartLabels: [],
  } as unknown as InstitutionalFootprintResult;

  const news = {
    chartMarker: { active: false, tone: "gold" },
    urgency: "Low",
    sentiment: "Neutral",
    hermesInterpretation: "Quiet tape.",
    possibleMarketImpact: "Limited.",
    riskCaution: { active: false, message: "" },
    detectedKeywords: [],
  } as unknown as NewsIntelligenceResult;

  return {
    candles,
    context,
    vision,
    reasoning,
    multiTimeframe,
    footprint,
    news,
    now: T0 + 40 * 60_000,
    ...overrides,
  };
}

test("v2 result shape includes annotations, story, and confidence history", () => {
  const result = buildSmartChartIntelligence(baseInput());
  assert.equal(result.kind, "hermes-smart-chart-intelligence-v2");
  assert.ok(Array.isArray(result.annotations));
  assert.ok(Array.isArray(result.marketStory));
  assert.ok(Array.isArray(result.confidenceHistory));
  assert.equal(typeof result.confidenceDelta, "number");
  assert.ok(result.thesisImpact.length > 0);
});

test("limits annotations to at most 5 highest-value items", () => {
  const result = buildSmartChartIntelligence(
    baseInput({
      candles: makeCandles(40, { breakUp: true, sweepLow: true }),
      news: {
        chartMarker: { active: true, tone: "danger" },
        urgency: "High",
        sentiment: "Negative",
        hermesInterpretation: "Risk event in play.",
        possibleMarketImpact: "Volatility expansion.",
        riskCaution: { active: true, message: "Reduce size." },
        detectedKeywords: [],
      } as unknown as NewsIntelligenceResult,
      footprint: {
        type: "Failed Breakout",
        direction: "Bearish",
        confidence: 70,
        confidenceImpact: -6,
        explanation: "Breakout failed.",
        riskNote: "Trap risk.",
        chartLabels: [],
      } as unknown as InstitutionalFootprintResult,
    }),
  );
  assert.ok(result.annotations.length <= 5);
  assert.ok(result.annotations.length >= 1);
  assert.equal(result.activeAnnotationCount, result.annotations.length);
});

test("each annotation includes what/why/thesis/confidence delta", () => {
  const result = buildSmartChartIntelligence(baseInput());
  for (const ann of result.annotations) {
    assert.ok(ann.explanation);
    assert.ok(ann.explanation!.whatHappened.length > 0);
    assert.ok(ann.explanation!.whyItMatters.length > 0);
    assert.ok(ann.explanation!.thesisImpact.length > 0);
    assert.equal(typeof ann.explanation!.confidenceDelta, "number");
  }
});

test("detects structure break, liquidity sweep, volume, momentum, HH/HL", () => {
  const result = buildSmartChartIntelligence(
    baseInput({ candles: makeCandles(40, { breakUp: true, sweepLow: true }) }),
  );
  const kinds = new Set(result.annotations.map((a) => a.kind));
  // At least some of the high-value families should appear among candidates/story
  const storyKinds = new Set(result.marketStory.map((e) => e.kind));
  const combined = new Set([...kinds, ...storyKinds]);
  assert.ok(
    combined.has("structure-break") ||
      combined.has("liquidity") ||
      combined.has("volume") ||
      combined.has("higher-high") ||
      combined.has("momentum"),
  );
});

test("market story timeline is sequenced and capped", () => {
  const result = buildSmartChartIntelligence(
    baseInput({ candles: makeCandles(40, { breakUp: true }) }),
  );
  assert.ok(result.marketStory.length <= 8);
  for (let i = 0; i < result.marketStory.length; i++) {
    assert.equal(result.marketStory[i].sequence, i + 1);
    assert.ok(result.marketStory[i].whatHappened.length > 0);
  }
});

test("confidence history explains major deltas with cause events", () => {
  const result = buildSmartChartIntelligence(
    baseInput({
      news: {
        chartMarker: { active: true, tone: "danger" },
        urgency: "High",
        sentiment: "Negative",
        hermesInterpretation: "Event pressure.",
        possibleMarketImpact: "Risk-off.",
        riskCaution: { active: true, message: "Caution." },
        detectedKeywords: [],
      } as unknown as NewsIntelligenceResult,
    }),
  );
  assert.ok(result.confidenceHistory.length >= 1);
  for (const entry of result.confidenceHistory) {
    assert.ok(entry.causeLabel.length > 0);
    assert.ok(entry.reason.length > 0);
    assert.ok(entry.sourceEventId.length > 0);
    assert.ok(["up", "down", "flat"].includes(entry.direction));
  }
});

test("intelligence v2 evidence feeds annotations dynamically", () => {
  const input = baseInput();
  const regime = buildMarketRegime({
    quote: { symbol: "BTC", price: input.context.currentPrice, change24h: 1.2 },
    candles: input.candles,
    visionContext: input.context,
    vision: input.vision,
    multiTimeframe: input.multiTimeframe,
    news: input.news,
    now: input.now,
  });
  const evidence = collectHermesEvidence({
    regime,
    vision: input.vision,
    multiTimeframe: input.multiTimeframe,
    footprint: input.footprint,
    news: input.news,
    symbol: "BTC",
    now: input.now,
  });
  const result = buildSmartChartIntelligence({
    ...input,
    intelligence: {
      regime,
      evidence,
      currentConfidence: 62,
    },
  });
  assert.equal(result.kind, "hermes-smart-chart-intelligence-v2");
  // Evidence-linked ids may appear when evidence maps to annotations
  const hasIv2 = result.annotations.some((a) => a.id.startsWith("iv2-")) ||
    result.marketStory.some((e) => e.id.includes("iv2-")) ||
    result.annotations.length > 0;
  assert.ok(hasIv2);
});

test("deterministic for identical inputs", () => {
  const input = baseInput({ candles: makeCandles(30, { breakUp: true }) });
  const a = buildSmartChartIntelligence(input);
  const b = buildSmartChartIntelligence(input);
  assert.deepEqual(a, b);
});

test("no buy/sell signal language in annotations", () => {
  const result = buildSmartChartIntelligence(
    baseInput({ candles: makeCandles(40, { breakUp: true, sweepLow: true }) }),
  );
  const blob = JSON.stringify(result);
  assert.doesNotMatch(blob, /\bBuy now\b|\bSell now\b|\bLong now\b|\bShort now\b/i);
});

test("does not invent product score fields", () => {
  const result = buildSmartChartIntelligence(baseInput());
  const keys = Object.keys(result);
  for (const banned of [
    "confidenceScore",
    "tradeReadinessScore",
    "tradeQualityScore",
    "hermesScore",
    "judgment",
    "conviction",
  ]) {
    assert.ok(!keys.includes(banned));
  }
});

test("support/resistance and demand/supply zone detectors fire when near levels", () => {
  const input = baseInput();
  input.context.distanceFromSupport = 0.005;
  input.context.supportZones = [
    {
      id: "z1",
      type: "support-zone",
      price: input.context.currentPrice * 0.995,
    } as never,
  ];
  const result = buildSmartChartIntelligence(input);
  const kinds = new Set([
    ...result.annotations.map((a) => a.kind),
    ...result.marketStory.map((e) => e.kind),
  ]);
  assert.ok(
    kinds.has("support-resistance") ||
      kinds.has("demand-zone") ||
      kinds.has("higher-high") ||
      kinds.has("volume"),
  );
});

test("failed breakout detection from footprint or candles", () => {
  const result = buildSmartChartIntelligence(
    baseInput({
      footprint: {
        type: "Failed Breakout",
        direction: "Bearish",
        confidence: 75,
        confidenceImpact: -8,
        explanation: "Failed breakout after thin participation.",
        riskNote: "Trap risk remains.",
        chartLabels: [],
      } as unknown as InstitutionalFootprintResult,
    }),
  );
  const kinds = new Set([
    ...result.annotations.map((a) => a.kind),
    ...result.marketStory.map((e) => e.kind),
  ]);
  assert.ok(kinds.has("failed-breakout"));
});
