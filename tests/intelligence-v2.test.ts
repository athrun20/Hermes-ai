/**
 * Direct unit tests for Intelligence v2 Phases 0–2.
 * Run via: npx tsx --test tests/intelligence-v2.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptFootprintEvidence,
  adaptMemoryDnaEvidence,
  adaptMultiTimeframeEvidence,
  adaptNewsEvidence,
  adaptSmartChartEvidence,
  adaptVisionEvidence,
  buildMarketRegime,
  collectHermesEvidence,
  dedupeHermesEvidence,
  type HermesEvidence,
  type MarketRegime,
} from "../lib/intelligence-v2/index";
import type { HermesVisionResult } from "../lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "../lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "../lib/footprint-types";
import type { NewsIntelligenceResult } from "../lib/news-types";
import type { SmartChartIntelligenceResult } from "../lib/smart-chart-intelligence-types";
import type { HermesMemorySnapshot } from "../lib/hermes-memory";
import type { Candle } from "../lib/market-data";

const NOW = 1_700_000_000_000;

function candles(count = 12, volatility = 0.01): Candle[] {
  let price = 100;
  return Array.from({ length: count }, (_, i) => {
    const open = price;
    const close = price * (1 + (i % 2 === 0 ? volatility : -volatility * 0.5));
    const high = Math.max(open, close) * 1.002;
    const low = Math.min(open, close) * 0.998;
    price = close;
    return { time: NOW / 1000 + i * 3600, open, high, low, close };
  });
}

function baseVision(overrides: Partial<HermesVisionResult> = {}): HermesVisionResult {
  return {
    kind: "hermes-vision",
    symbol: "BTC",
    primaryInsight: "Structure is constructive near support.",
    setupStructureScore: 70,
    trendScore: 68,
    momentumScore: 60,
    volumeScore: 55,
    riskScore: 58,
    confirmationScore: 62,
    confidenceAdjustment: 4,
    suggestedAction: "Study Setup",
    labels: [],
    reasons: ["Price holds above support."],
    dimensions: [
      {
        dimension: "Structure",
        score: 70,
        verdict: "Constructive",
        reasons: ["Support holds."],
      },
      {
        dimension: "Trend",
        score: 68,
        verdict: "Constructive",
        reasons: ["Short-term uptrend."],
      },
      {
        dimension: "Risk",
        score: 40,
        verdict: "Weak",
        reasons: ["Stop placement needs work."],
      },
    ],
    caution: { active: false, message: "" },
    ...overrides,
  };
}

test("type-safe fixture construction: MarketRegime and HermesEvidence shapes", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "BTC", price: 100, change24h: 1.2 },
    candles: candles(),
    now: NOW,
  });
  assert.equal(regime.kind, "hermes-market-regime-v1");
  assert.equal(regime.symbol, "BTC");
  assert.equal(regime.sourceTimestamp, NOW);
  assert.ok(regime.confidence >= 15 && regime.confidence <= 88);

  const evidence: HermesEvidence = {
    id: "fixture-1",
    stage: "Technical Structure",
    category: "Market Structure",
    claim: "Support holds",
    direction: "Supportive",
    strength: 70,
    reliability: "Medium",
    sourceModules: ["test"],
    timestamp: NOW,
  };
  assert.equal(evidence.sourceModules[0], "test");
});

test("market regime: strong MTF alignment → Trending structure", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "BTC", price: 100, change24h: 2 },
    candles: candles(20),
    multiTimeframe: {
      status: "Strong Alignment",
      alignmentScore: 80,
      higherTimeframeDirection: "Bullish",
      countertrendWarning: null,
      pattern: "Full bullish alignment",
    },
    visionContext: {
      candleTrend: "Bullish",
      averageCandleRange: 0.8,
      currentPrice: 100,
      volume: { current: 120, average: 100, status: "Rising" },
      rsi: 55,
    },
    vision: { trendScore: 72, volumeScore: 70, momentumScore: 66, setupStructureScore: 70 },
    news: {
      urgency: "Low",
      sentiment: "Neutral",
      riskCaution: { active: false, message: "" },
    },
    now: NOW,
  });
  assert.equal(regime.structureRegime, "Trending");
  assert.equal(regime.directionalBias, "Bullish");
  assert.ok(regime.supportingSignals.length > 0);
});

test("market regime: conflict MTF → Transition", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "ETH", price: 50, change24h: 0.2 },
    candles: candles(10),
    multiTimeframe: {
      status: "Conflict",
      alignmentScore: 40,
      higherTimeframeDirection: "Bearish",
      countertrendWarning: "Lower timeframe fights HTF",
      pattern: "Mixed conditions",
    },
    now: NOW,
  });
  assert.equal(regime.structureRegime, "Transition");
  assert.ok(regime.conflictingSignals.length > 0);
});

test("market regime: incomplete data stays low-confidence and not Extreme by default", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "SOL", price: 20, change24h: 0.1 },
    candles: [],
    now: NOW,
  });
  assert.ok(["Poor", "Limited"].includes(regime.dataQuality));
  assert.ok(regime.confidence <= 52);
  assert.notEqual(regime.volatilityRegime, "Extreme");
  assert.ok(["Unclear", "Range", "Transition"].includes(regime.structureRegime));
});

test("market regime: high news urgency → Event Driven", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "BTC", price: 100, change24h: 1 },
    candles: candles(),
    news: {
      urgency: "High",
      sentiment: "Negative",
      riskCaution: { active: true, message: "Headline risk" },
    },
    now: NOW,
  });
  assert.equal(regime.eventRegime, "Event Driven");
});

test("market regime: mixed directional votes → Mixed bias", () => {
  const regime = buildMarketRegime({
    quote: { symbol: "BTC", price: 100, change24h: 2 },
    candles: candles(),
    visionContext: {
      candleTrend: "Bullish",
      averageCandleRange: 0.9,
      currentPrice: 100,
      volume: { current: 100, average: 100, status: "Normal" },
      rsi: 50,
    },
    multiTimeframe: {
      status: "Mixed",
      alignmentScore: 50,
      higherTimeframeDirection: "Bearish",
      countertrendWarning: null,
      pattern: "Mixed conditions",
    },
    news: {
      urgency: "Low",
      sentiment: "Negative",
      riskCaution: { active: false, message: "" },
    },
    now: NOW,
  });
  assert.ok(["Mixed", "Bullish", "Bearish", "Neutral"].includes(regime.directionalBias));
  // With bullish tape and bearish HTF+news, expect Mixed or conflict signals
  assert.ok(regime.conflictingSignals.length > 0 || regime.directionalBias === "Mixed");
});

test("market regime: deterministic for identical inputs", () => {
  const input = {
    quote: { symbol: "BTC" as const, price: 100, change24h: 1.5 },
    candles: candles(16, 0.012),
    visionContext: {
      candleTrend: "Bullish" as const,
      averageCandleRange: 1.1,
      currentPrice: 100,
      volume: { current: 90, average: 100, status: "Normal" as const },
      rsi: 54,
    },
    now: NOW,
  };
  const a = buildMarketRegime(input);
  const b = buildMarketRegime(input);
  assert.deepEqual(a, b);
});

test("vision evidence mapping preserves dimensions without recommendations", () => {
  const vision = baseVision();
  const items = adaptVisionEvidence(vision, { symbol: "BTC", now: NOW });
  assert.ok(items.some((e) => e.id.includes("structure")));
  assert.ok(items.some((e) => e.category === "Risk/Reward" && e.direction === "Contradictory"));
  for (const e of items) {
    assert.ok(e.sourceModules.includes("hermes-vision-engine"));
    assert.doesNotMatch(e.claim, /\bBuy\b|\bSell\b/i);
    assert.ok(e.strength >= 0 && e.strength <= 100);
  }
});

test("MTF evidence mapping includes countertrend as contradictory", () => {
  const mtf = {
    symbol: "BTC",
    activeTimeframe: "1H",
    rows: [],
    alignmentScore: 55,
    status: "Mixed",
    pattern: "Mixed conditions",
    mentorSummary: "Higher timeframe conflicts with active timeframe.",
    alignmentImpact: -4,
    higherTimeframeDirection: "Bearish",
    countertrendWarning: "Active timeframe is fighting the higher-timeframe trend.",
  } as MultiTimeframeIntelligence;

  const items = adaptMultiTimeframeEvidence(mtf, { now: NOW });
  assert.equal(items.length, 2);
  assert.ok(items.every((e) => e.category === "Multi-Timeframe Alignment"));
  assert.ok(items.some((e) => e.direction === "Contradictory"));
});

test("footprint reliability is low when unclear and never claims intent", () => {
  const footprint: InstitutionalFootprintResult = {
    type: "No clear institutional footprint",
    confidence: 35,
    strength: "Weak",
    direction: "Neutral",
    confirmationStatus: "Unclear",
    evidence: [],
    explanation: "Tape is inconclusive.",
    riskNote: "Wait for clearer participation.",
    suggestedAction: "Observe",
    confirmationNeeded: "Volume expansion",
    confidenceImpact: 0,
    chartLabels: [],
  };
  const items = adaptFootprintEvidence(footprint, { symbol: "BTC", now: NOW });
  assert.equal(items[0].reliability, "Low");
  assert.equal(items[0].direction, "Neutral");
  assert.doesNotMatch(items[0].claim, /intend|intention|institutions are buying/i);
  assert.equal(items[0].metadata?.intentClaim, false);
});

test("news urgency maps strength and risk caution remains contradictory", () => {
  const news: NewsIntelligenceResult = {
    symbol: "BTC",
    pressReleases: [],
    news: [],
    detectedKeywords: [],
    sentiment: "Negative",
    urgency: "High",
    possibleMarketImpact: "Headline risk may increase volatility.",
    hermesInterpretation: "Event risk is elevated; confirmation still required.",
    riskCaution: { active: true, message: "Reduce size or wait for confirmation." },
    chartMarker: { active: true, label: "News", tone: "danger" },
  };
  const items = adaptNewsEvidence(news, { now: NOW });
  assert.ok(items[0].strength >= 70);
  assert.ok(items.some((e) => e.id.includes("risk-caution") && e.direction === "Contradictory"));
});

test("smart chart evidence maps annotations without buy/sell language", () => {
  const smart: SmartChartIntelligenceResult = {
    kind: "hermes-smart-chart-intelligence-v1",
    annotations: [
      {
        id: "a1",
        text: "VWAP reclaim",
        tone: "mint",
        priority: 1,
        kind: "vwap",
        price: 101,
        explanation: {
          whatHappened: "Price reclaimed VWAP with improving participation.",
          whyItMatters: "Supports constructive structure.",
          thesisImpact: "Mildly supportive.",
          confidenceDelta: 3,
          sourceModule: "smart-chart",
        },
      },
    ],
    confidenceDelta: 3,
    thesisImpact: "Constructive reclaim.",
  };
  const items = adaptSmartChartEvidence(smart, { symbol: "BTC", now: NOW });
  assert.equal(items.length, 1);
  assert.equal(items[0].direction, "Supportive");
  assert.equal(items[0].chartReference?.price, 101);
  assert.doesNotMatch(items[0].claim, /\bBuy\b|\bSell\b/i);
});

test("memory/DNA evidence uses discipline and flags behavior risks", () => {
  const memory = {
    kind: "hermes-memory-snapshot",
    updatedAt: NOW,
    trades: [],
    performance: {
      totalTrades: 8,
      winRate: 50,
      averageProfitLoss: 0,
      averageRMultiple: null,
      averageHoldMinutes: 40,
      bestPerformingAsset: "BTC",
      worstPerformingAsset: "SOL",
    },
    behavior: {
      earlyExitsFrequency: 0.2,
      revengeTradingDetected: true,
      overtradingDetected: false,
      holdingWinnersTooShort: false,
      cuttingLossesTooLate: false,
      emotionalPatterns: [],
    },
    strategyPreference: {
      breakoutTrader: 1,
      reversalTrader: 0,
      scalper: 0,
      swingTrader: 2,
      dominantStyle: "swing",
    },
    strengths: ["Waits for levels"],
    weaknesses: ["Moves stops early"],
    personality: "Patient swing student",
    scores: { riskManagement: 60, patience: 70, discipline: 45 },
  } as HermesMemorySnapshot;

  const items = adaptMemoryDnaEvidence(memory, {
    personality: {
      kind: "hermes-trading-personality",
      generatedAt: NOW,
      archetype: "Patient Swing",
      confidenceStyle: "Measured",
      riskStyle: "Controlled",
      executionStyle: "Deliberate",
      strengths: [],
      blindSpots: [],
      coachingPrompt: "Stay patient",
    },
    dailyGoal: "Only A setups",
    now: NOW,
    symbol: "BTC",
  });
  assert.ok(items.some((e) => e.stage === "Trader Profile"));
  assert.ok(items.some((e) => e.id === "memory-behavior-flags" && e.direction === "Contradictory"));
  assert.ok(items.some((e) => e.claim.includes("Only A setups")));
});

test("dedupe removes similar same-direction claims but keeps contradictions", () => {
  const a: HermesEvidence = {
    id: "1",
    stage: "Technical Structure",
    category: "Market Structure",
    claim: "Support holds near the prior session low with constructive structure",
    direction: "Supportive",
    strength: 70,
    reliability: "Medium",
    sourceModules: ["a"],
    timestamp: NOW,
    symbol: "BTC",
  };
  const b: HermesEvidence = {
    id: "2",
    stage: "Technical Structure",
    category: "Market Structure",
    claim: "Support holds near the prior session low with constructive structure still intact",
    direction: "Supportive",
    strength: 72,
    reliability: "High",
    sourceModules: ["b"],
    timestamp: NOW + 1,
    symbol: "BTC",
  };
  const c: HermesEvidence = {
    id: "3",
    stage: "Technical Structure",
    category: "Market Structure",
    claim: "Support is failing and structure is breaking down",
    direction: "Contradictory",
    strength: 65,
    reliability: "Medium",
    sourceModules: ["c"],
    timestamp: NOW + 2,
    symbol: "BTC",
  };

  const deduped = dedupeHermesEvidence([a, b, c]);
  assert.equal(deduped.length, 2);
  assert.ok(deduped.some((e) => e.direction === "Supportive"));
  assert.ok(deduped.some((e) => e.direction === "Contradictory"));
  // Higher reliability supportive kept
  assert.ok(deduped.some((e) => e.id === "2" || e.reliability === "High"));
});

test("dedupe preserves same category contradictions and is deterministic", () => {
  const items: HermesEvidence[] = [
    {
      id: "x",
      stage: "Market Context",
      category: "News and Event Risk",
      claim: "Event risk is elevated around headlines",
      direction: "Contradictory",
      strength: 70,
      reliability: "Medium",
      sourceModules: ["news"],
      timestamp: NOW,
      symbol: "BTC",
    },
    {
      id: "y",
      stage: "Market Context",
      category: "News and Event Risk",
      claim: "Event risk is elevated around headlines today",
      direction: "Contradictory",
      strength: 68,
      reliability: "Low",
      sourceModules: ["news"],
      timestamp: NOW + 1,
      symbol: "BTC",
    },
    {
      id: "z",
      stage: "Market Context",
      category: "News and Event Risk",
      claim: "Constructive catalyst improves participation",
      direction: "Supportive",
      strength: 60,
      reliability: "Medium",
      sourceModules: ["news"],
      timestamp: NOW + 2,
      symbol: "BTC",
    },
  ];
  const once = dedupeHermesEvidence(items);
  const twice = dedupeHermesEvidence(items);
  assert.deepEqual(once, twice);
  assert.ok(once.some((e) => e.direction === "Supportive"));
  assert.ok(once.some((e) => e.direction === "Contradictory"));
});

test("collectHermesEvidence aggregates adapters and stays deterministic", () => {
  const regime: MarketRegime = buildMarketRegime({
    quote: { symbol: "BTC", price: 100, change24h: 1 },
    candles: candles(12),
    visionContext: {
      candleTrend: "Bullish",
      averageCandleRange: 1,
      currentPrice: 100,
      volume: { current: 100, average: 100, status: "Normal" },
      rsi: 52,
    },
    news: {
      urgency: "Medium",
      sentiment: "Neutral",
      riskCaution: { active: false, message: "" },
    },
    now: NOW,
  });

  const vision = baseVision();
  const input = {
    regime,
    vision,
    news: {
      symbol: "BTC" as const,
      pressReleases: [],
      news: [],
      detectedKeywords: [],
      sentiment: "Neutral" as const,
      urgency: "Medium" as const,
      possibleMarketImpact: "Mixed headlines.",
      hermesInterpretation: "News is mixed; structure still leads.",
      riskCaution: { active: false, message: "" },
      chartMarker: { active: false, label: "", tone: "gold" as const },
    },
    now: NOW,
  };

  const a = collectHermesEvidence(input);
  const b = collectHermesEvidence(input);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 3);
  assert.ok(a.some((e) => e.stage === "Market Regime"));
  assert.ok(a.every((e) => e.sourceModules.length > 0));
});
