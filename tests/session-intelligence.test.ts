/**
 * Hermes Session Intelligence v1 — educational session evolution.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildSessionIntelligence,
  buildSessionStory,
  detectMarketHealth,
  detectOpportunityState,
  detectSessionPhase,
  mergeDuplicateEvents,
  type SessionIntelligenceInput,
  type SessionStoryEvent,
} from "../lib/session-intelligence/index";
import type { Candle } from "../lib/market-data";
import type { HermesVisionContext, HermesVisionResult } from "../lib/hermes-vision-types";
import type { ReasoningResult } from "../lib/reasoning-types";
import type { MultiTimeframeIntelligence } from "../lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "../lib/footprint-types";
import type { NewsIntelligenceResult } from "../lib/news-types";

const T0 = 1_700_000_000_000;

function candles(count: number, mode: "trend" | "range" | "openDrive" | "reversal" = "trend"): Candle[] {
  const out: Candle[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    let delta = 0;
    if (mode === "trend") delta = 0.35;
    else if (mode === "range") delta = i % 2 === 0 ? 0.15 : -0.15;
    else if (mode === "openDrive") delta = i < 4 ? 1.2 : 0.2;
    else if (mode === "reversal") delta = i < count / 2 ? 0.4 : -0.55;
    const open = price;
    const close = price + delta;
    out.push({
      time: T0 + i * 60_000,
      open,
      high: Math.max(open, close) + 0.4,
      low: Math.min(open, close) - 0.4,
      close,
    });
    price = close;
  }
  return out;
}

function baseInput(overrides?: Partial<SessionIntelligenceInput>): SessionIntelligenceInput {
  const series = overrides?.candles ?? candles(30, "trend");
  const last = series[series.length - 1];
  const context: HermesVisionContext = {
    symbol: "BTC",
    currentPrice: last.close,
    candleTrend: "Bullish",
    ema20: last.close * 0.998,
    ema50: last.close * 0.994,
    vwap: last.close * 0.999,
    rsi: 58,
    macd: { line: 0.5, signal: 0.2, histogram: 0.3 },
    volume: { current: 1400, average: 900, status: "Rising" },
    averageCandleRange: 1.1,
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
  return {
    candles: series,
    context,
    vision: {
      kind: "hermes-vision",
      symbol: "BTC",
      primaryInsight: "Constructive",
      setupStructureScore: 72,
      trendScore: 70,
      momentumScore: 68,
      volumeScore: 74,
      riskScore: 60,
      confirmationScore: 66,
      confidenceAdjustment: 2,
      suggestedAction: "Study Setup",
      labels: [],
      reasons: [],
      dimensions: [],
      caution: { active: false, message: "" },
    } as HermesVisionResult,
    reasoning: {
      marketStructure: "Higher Highs and Higher Lows",
      confidenceScore: 70,
      tradeReadinessScore: 50,
      readinessState: "Developing",
      coachingMessage: "Wait for confirmation.",
    } as ReasoningResult,
    multiTimeframe: {
      status: "Aligned",
      alignmentScore: 75,
      higherTimeframeDirection: "Bullish",
      countertrendWarning: null,
      pattern: "Trend",
    } as MultiTimeframeIntelligence,
    footprint: {
      type: "No clear institutional footprint",
      direction: "Neutral",
      confidence: 40,
      confidenceImpact: 0,
      explanation: "None",
      riskNote: "Watch",
      chartLabels: [],
    } as unknown as InstitutionalFootprintResult,
    news: {
      chartMarker: { active: false, tone: "gold" },
      urgency: "Low",
      sentiment: "Neutral",
      hermesInterpretation: "Quiet",
      possibleMarketImpact: "Limited",
      riskCaution: { active: false, message: "" },
      detectedKeywords: [],
    } as unknown as NewsIntelligenceResult,
    productConfidence: 70,
    productReadiness: 50,
    now: T0 + 30 * 60_000,
    ...overrides,
  };
}

test("opening drive phase on early high-range high-volume sample", () => {
  const series = candles(8, "openDrive");
  const input = baseInput({
    candles: series,
    context: {
      ...baseInput().context,
      currentPrice: series[series.length - 1].close,
      volume: { current: 2000, average: 900, status: "Rising" },
    },
  });
  // Short series → early progress → Opening Drive when range expands
  const phase = detectSessionPhase(input);
  assert.ok(
    phase === "Opening Drive" ||
      phase === "Opening Balance" ||
      phase === "Trend Expansion" ||
      phase === "Trend Continuation",
    `expected opening/early trend phase, got ${phase}`,
  );
});

test("trend day classification", () => {
  const input = baseInput({
    candles: candles(48, "trend"),
    reasoning: {
      ...baseInput().reasoning,
      marketStructure: "Higher Highs and Higher Lows",
    } as ReasoningResult,
  });
  const result = buildSessionIntelligence(input);
  assert.ok(
    result.sessionPhase === "Trend Continuation" ||
      result.sessionPhase === "Trend Expansion" ||
      result.sessionPhase === "Late Session" ||
      result.sessionPhase === "Accumulation",
    `unexpected phase ${result.sessionPhase}`,
  );
  assert.equal(result.sessionBias === "Bullish" || result.sessionBias === "Mixed", true);
  assert.ok(
    ["Excellent", "Healthy", "Mixed"].includes(result.marketHealth),
    `unexpected health ${result.marketHealth}`,
  );
});

test("range day classification", () => {
  const input = baseInput({
    candles: candles(28, "range"),
    reasoning: {
      ...baseInput().reasoning,
      marketStructure: "No Clear Structure",
    } as ReasoningResult,
    context: {
      ...baseInput().context,
      candleTrend: "Neutral",
      volume: { current: 800, average: 900, status: "Normal" },
      macd: { line: 0.05, signal: 0.04, histogram: 0.01 },
    },
    multiTimeframe: {
      status: "Mixed",
      alignmentScore: 40,
      higherTimeframeDirection: "Neutral",
      countertrendWarning: null,
      pattern: "Range",
    } as MultiTimeframeIntelligence,
  });
  const result = buildSessionIntelligence(input);
  assert.ok(
    result.sessionPhase === "Range Rotation" ||
      result.sessionPhase === "Consolidation" ||
      result.sessionPhase === "Opening Balance" ||
      result.sessionPhase === "Unknown" ||
      result.sessionPhase === "Opening Drive",
    `unexpected phase ${result.sessionPhase}`,
  );
});

test("reversal day produces mixed/bearish lean and risks", () => {
  const series = candles(30, "reversal");
  const input = baseInput({
    candles: series,
    context: {
      ...baseInput().context,
      currentPrice: series[series.length - 1].close,
      candleTrend: "Bearish",
      macd: { line: -0.2, signal: 0.1, histogram: -0.3 },
    },
    reasoning: {
      ...baseInput().reasoning,
      marketStructure: "Lower Highs and Lower Lows",
    } as ReasoningResult,
  });
  const result = buildSessionIntelligence(input);
  assert.ok(result.sessionBias === "Bearish" || result.sessionBias === "Mixed");
  assert.ok(result.sessionSummary.length > 20);
});

test("news-driven session marks avoid/unstable path", () => {
  const input = baseInput({
    news: {
      chartMarker: { active: true, tone: "danger" },
      urgency: "High",
      sentiment: "Negative",
      hermesInterpretation: "Macro shock.",
      possibleMarketImpact: "Volatility spike.",
      riskCaution: { active: true, message: "Event risk elevated." },
      detectedKeywords: [],
    } as unknown as NewsIntelligenceResult,
  });
  const result = buildSessionIntelligence(input);
  assert.ok(
    result.marketHealth === "Unstable" ||
      result.marketHealth === "Weak" ||
      result.marketHealth === "Mixed",
  );
  assert.ok(
    result.opportunityState === "Avoid" || result.opportunityState === "Weak",
  );
  assert.ok(result.currentRisks.some((r) => /event risk/i.test(r)));
  assert.ok(result.sessionStory.some((e) => /news/i.test(e.title)));
});

test("weak liquidity detection", () => {
  const input = baseInput({
    context: {
      ...baseInput().context,
      volume: { current: 300, average: 1000, status: "Fading" },
    },
  });
  const result = buildSessionIntelligence(input);
  assert.ok(
    result.liquidityState === "Thin" || result.participationState === "Weak",
  );
  assert.ok(result.currentRisks.some((r) => /liquidity|participation/i.test(r)));
});

test("high volatility state", () => {
  const series = candles(20, "openDrive").map((c, i) => ({
    ...c,
    high: c.high + 3,
    low: c.low - 3,
    time: T0 + i * 60_000,
  }));
  const input = baseInput({
    candles: series,
    context: {
      ...baseInput().context,
      currentPrice: series[series.length - 1].close,
      averageCandleRange: 4,
    },
  });
  const result = buildSessionIntelligence(input);
  assert.ok(
    result.volatilityState === "Elevated" || result.volatilityState === "Extreme",
  );
});

test("opportunity state independent of high product confidence without trigger", () => {
  const input = baseInput({
    candles: candles(20, "range"),
    productConfidence: 85,
    productReadiness: 40,
    reasoning: {
      ...baseInput().reasoning,
      marketStructure: "Range",
      confidenceScore: 85,
      tradeReadinessScore: 40,
    } as ReasoningResult,
    context: {
      ...baseInput().context,
      volume: { current: 700, average: 900, status: "Normal" },
      candleTrend: "Neutral",
      macd: { line: 0.01, signal: 0.01, histogram: 0 },
    },
  });
  const result = buildSessionIntelligence(input);
  // High confidence but no trigger → Waiting or Developing, not forced Excellent
  assert.notEqual(result.opportunityState, "Excellent Opportunity");
  assert.ok(
    result.opportunityState === "Waiting" ||
      result.opportunityState === "Developing" ||
      result.opportunityState === "Weak",
  );
});

test("session story is ordered and capped at 10", () => {
  const result = buildSessionIntelligence(baseInput({ candles: candles(40, "trend") }));
  assert.ok(result.sessionStory.length <= 10);
  for (let i = 1; i < result.sessionStory.length; i++) {
    assert.ok(
      result.sessionStory[i].timestamp >= result.sessionStory[i - 1].timestamp,
    );
    assert.equal(result.sessionStory[i].sequence, i + 1);
  }
});

test("duplicate event merge", () => {
  const a: SessionStoryEvent = {
    id: "a",
    timestamp: 100,
    sequence: 0,
    clockLabel: "10:00",
    title: "VWAP reclaimed",
    detail: "Price held VWAP.",
    tone: "mint",
    source: "test",
  };
  const b: SessionStoryEvent = {
    id: "b",
    timestamp: 120,
    sequence: 0,
    clockLabel: "10:01",
    title: "VWAP reclaimed",
    detail: "Price held VWAP.",
    tone: "mint",
    source: "test",
  };
  const merged = mergeDuplicateEvents([a, b]);
  assert.equal(merged.length, 1);
});

test("session summary generation is non-empty and template-based", () => {
  const result = buildSessionIntelligence(baseInput());
  assert.ok(result.sessionSummary.length > 40);
  assert.doesNotMatch(result.sessionSummary, /\bBuy now\b|\bSell now\b/i);
});

test("no Buy/Sell language in session intelligence", () => {
  const result = buildSessionIntelligence(
    baseInput({
      candles: candles(32, "trend"),
      news: {
        chartMarker: { active: true, tone: "danger" },
        urgency: "High",
        sentiment: "Negative",
        hermesInterpretation: "Event.",
        possibleMarketImpact: "Risk.",
        riskCaution: { active: true, message: "Caution." },
        detectedKeywords: [],
      } as unknown as NewsIntelligenceResult,
    }),
  );
  const blob = JSON.stringify(result);
  assert.doesNotMatch(blob, /\bBuy now\b|\bSell now\b|\bLong now\b|\bShort now\b/i);
});

test("deterministic output for identical inputs", () => {
  const input = baseInput({ candles: candles(24, "trend") });
  const a = buildSessionIntelligence(input);
  const b = buildSessionIntelligence(input);
  assert.deepEqual(a, b);
});

test("does not invent product score fields", () => {
  const result = buildSessionIntelligence(baseInput());
  const keys = Object.keys(result);
  for (const banned of [
    "confidenceScore",
    "tradeReadinessScore",
    "tradeQualityScore",
    "hermesScore",
    "judgment",
    "conviction",
    "opinion",
  ]) {
    assert.ok(!keys.includes(banned), `must not include ${banned}`);
  }
  assert.equal(result.kind, "hermes-session-intelligence-v1");
  // sessionConfidence is session clarity only
  assert.ok(result.sessionConfidence >= 0 && result.sessionConfidence <= 100);
});

test("market health is categorical not a new product score", () => {
  const health = detectMarketHealth(baseInput());
  assert.ok(["Excellent", "Healthy", "Mixed", "Weak", "Unstable"].includes(health));
});

test("opportunity windows are educational only", () => {
  const result = buildSessionIntelligence(baseInput({ candles: candles(36, "trend") }));
  assert.ok(result.opportunityWindows.length >= 1);
  for (const w of result.opportunityWindows) {
    assert.ok(w.kind.length > 0);
    assert.ok(w.rationale.length > 0);
    assert.doesNotMatch(w.rationale, /\bBuy\b|\bSell\b/i);
  }
});

test("session intelligence modules do not import intelligence-v2 authority, learning-engine, or paper-trading", async () => {
  const dir = path.join(process.cwd(), "lib", "session-intelligence");
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".ts")) continue;
    const src = await fs.promises.readFile(path.join(dir, file), "utf8");
    assert.doesNotMatch(src, /from ["']@\/lib\/learning-engine/);
    assert.doesNotMatch(src, /from ["']@\/lib\/paper-trading/);
    // May import types from smart-chart for optional story; must not import judgment/conviction/orchestrator
    assert.doesNotMatch(src, /intelligence-v2\/(judgment|conviction|orchestrator|opinion)/);
  }
});

test("risks and strengths capped at 3", () => {
  const result = buildSessionIntelligence(
    baseInput({
      news: {
        chartMarker: { active: true, tone: "danger" },
        urgency: "High",
        sentiment: "Negative",
        hermesInterpretation: "Shock",
        possibleMarketImpact: "Vol",
        riskCaution: { active: true, message: "Risk" },
        detectedKeywords: [],
      } as unknown as NewsIntelligenceResult,
      context: {
        ...baseInput().context,
        volume: { current: 200, average: 1000, status: "Fading" },
        distanceFromResistance: 0.004,
        macd: { line: -0.3, signal: 0.1, histogram: -0.4 },
      },
    }),
  );
  assert.ok(result.currentRisks.length <= 3);
  assert.ok(result.currentStrengths.length <= 3);
});

test("buildSessionStory uses smart chart story when provided", () => {
  const input = baseInput();
  input.smartChart = {
    kind: "hermes-smart-chart-intelligence-v2",
    annotations: [],
    confidenceDelta: 3,
    thesisImpact: "Constructive",
    marketStory: [
      {
        id: "s1",
        timestamp: T0 + 5 * 60_000,
        sequence: 1,
        title: "Liquidity sweep",
        kind: "liquidity",
        whatHappened: "Sweep completed.",
        whyItMatters: "Stops taken.",
        thesisImpact: "Watch reclaim.",
        confidenceDelta: 4,
        tone: "mint",
        sourceModules: ["Smart Chart"],
      },
    ],
    confidenceHistory: [],
    activeAnnotationCount: 0,
  };
  const story = buildSessionStory({
    input,
    phase: "Trend Continuation",
    now: T0 + 30 * 60_000,
  });
  assert.ok(story.some((e) => /liquidity sweep/i.test(e.title)));
});
