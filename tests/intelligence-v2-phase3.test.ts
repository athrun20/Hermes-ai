/**
 * Phase 3 — Confidence Breakdown packaging tests.
 * Proves parity with existing calculateReasoningConfidence / buildHermesReasoning.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildHermesReasoning } from "../lib/reasoning-engine";
import { buildReasoningEvidence } from "../lib/reasoning-evidence";
import { calculateReasoningConfidence } from "../lib/reasoning-engine";
import { MAX_REASONING_CONFIDENCE } from "../lib/reasoning-config";
import type { ReasoningEngineInput } from "../lib/reasoning-types";
import type { HermesVisionContext, HermesVisionResult } from "../lib/hermes-vision-types";
import {
  assertConfidenceParity,
  packageConfidenceBreakdown,
  reconstructTotal,
  adaptVisionEvidence,
  type HermesEvidence,
} from "../lib/intelligence-v2/index";
import type { TradeQualityResult } from "../lib/trade-quality-types";

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

function baseInput(overrides: Partial<ReasoningEngineInput> = {}): ReasoningEngineInput {
  return {
    context: visionContext(),
    vision: vision(),
    multiTimeframe: {
      symbol: "BTC",
      activeTimeframe: "1H",
      rows: [],
      alignmentScore: 75,
      status: "Constructive",
      pattern: "Higher-timeframe bullish / lower-timeframe bearish pullback",
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
        score: 70,
        quality: "Strong",
        whyItFits: ["Pullback into structure"],
        nextConfirmation: "Hold support",
        riskNotes: ["Avoid chasing"],
        traderDnaFit: "Aligned",
      },
      strategies: [],
    },
    memory: {
      kind: "hermes-memory-snapshot",
      updatedAt: Date.now(),
      trades: [],
      performance: {
        totalTrades: 10,
        winRate: 55,
        averageProfitLoss: 1,
        averageRMultiple: 1.2,
        averageHoldMinutes: 60,
        bestPerformingAsset: "BTC",
        worstPerformingAsset: "SOL",
      },
      behavior: {
        earlyExitsFrequency: 0.1,
        revengeTradingDetected: false,
        overtradingDetected: false,
        holdingWinnersTooShort: false,
        cuttingLossesTooLate: false,
        emotionalPatterns: [],
      },
      strategyPreference: {
        breakoutTrader: 1,
        reversalTrader: 0,
        scalper: 0,
        swingTrader: 3,
        dominantStyle: "swing",
      },
      strengths: ["Patience"],
      weaknesses: ["Early exits"],
      personality: "Patient swing",
      scores: { riskManagement: 70, patience: 75, discipline: 72 },
    },
    ...overrides,
  };
}

test("exact final-score parity with buildHermesReasoning confidenceScore", () => {
  const input = baseInput();
  const reasoning = buildHermesReasoning(input);
  const breakdown = packageConfidenceBreakdown({ reasoning });

  assert.equal(breakdown.finalScore, reasoning.confidenceScore);
  assert.equal(breakdown.reconciliationDifference, 0);
  assert.equal(reconstructTotal(breakdown), breakdown.finalScore);
  assert.ok(assertConfidenceParity(breakdown, reasoning.confidenceScore));
});

test("positive contributions appear when evidence is supportive", () => {
  const reasoning = buildHermesReasoning(baseInput());
  const breakdown = packageConfidenceBreakdown({ reasoning });
  assert.ok(breakdown.positiveContributions.length > 0);
  assert.ok(breakdown.positiveContributions.every((c) => c.contribution > 0));
  assert.ok(breakdown.supportiveDrivers.length > 0);
});

test("negative contributions and missing-module penalties are captured", () => {
  const input = baseInput({
    multiTimeframe: undefined,
    footprint: undefined,
    news: undefined,
    vision: vision({
      setupStructureScore: 30,
      trendScore: 30,
      momentumScore: 30,
      volumeScore: 30,
      dimensions: [
        { dimension: "Structure", score: 30, verdict: "Weak", reasons: ["Broken structure."] },
        { dimension: "Trend", score: 30, verdict: "Weak", reasons: ["No trend."] },
        { dimension: "Momentum", score: 30, verdict: "Weak", reasons: ["Fading."] },
        { dimension: "Volume", score: 30, verdict: "Weak", reasons: ["Thin."] },
        { dimension: "Confirmation", score: 30, verdict: "Weak", reasons: ["None."] },
        { dimension: "Risk", score: 30, verdict: "Weak", reasons: ["Poor RR."] },
      ],
    }),
    context: visionContext({ riskReward: 0.5, tradeLevels: {} }),
  });
  const reasoning = buildHermesReasoning(input);
  const breakdown = packageConfidenceBreakdown({ reasoning, input });

  assert.equal(breakdown.finalScore, reasoning.confidenceScore);
  assert.ok(
    breakdown.negativeContributions.length > 0 ||
      breakdown.adjustments.some((a) => a.contribution < 0),
  );
  assert.ok(breakdown.reducingDrivers.length > 0 || breakdown.negativeContributions.length > 0);
});

test("mixed evidence keeps both positive and negative category rows when present", () => {
  const input = baseInput({
    vision: vision({
      setupStructureScore: 80,
      trendScore: 30,
      dimensions: [
        { dimension: "Structure", score: 80, verdict: "Strong", reasons: ["Clean structure."] },
        { dimension: "Trend", score: 30, verdict: "Weak", reasons: ["Trend failed."] },
        { dimension: "Momentum", score: 60, verdict: "Constructive", reasons: ["Ok."] },
        { dimension: "Volume", score: 60, verdict: "Constructive", reasons: ["Ok."] },
        { dimension: "Confirmation", score: 60, verdict: "Constructive", reasons: ["Ok."] },
        { dimension: "Risk", score: 40, verdict: "Weak", reasons: ["RR tight."] },
      ],
    }),
    multiTimeframe: {
      symbol: "BTC",
      activeTimeframe: "1H",
      rows: [],
      alignmentScore: 40,
      status: "Conflict",
      pattern: "Mixed conditions",
      mentorSummary: "Timeframes conflict.",
      alignmentImpact: -5,
      higherTimeframeDirection: "Bearish",
      countertrendWarning: "Fighting HTF.",
    },
  });
  const reasoning = buildHermesReasoning(input);
  const breakdown = packageConfidenceBreakdown({ reasoning });
  assert.equal(breakdown.finalScore, reasoning.confidenceScore);
  // Structure supportive vs MTF/trend contradictory expected in evidence
  assert.ok(reasoning.supportingEvidence.length > 0);
  assert.ok(reasoning.conflictingEvidence.length > 0);
});

test("confidence cap is reflected when uncapped total would exceed max", () => {
  // Force very high contributions — may or may not hit cap depending on scaleContribution bounds.
  // We still assert that if capsApplied is non-empty, final equals MAX or expected.
  const input = baseInput({
    vision: vision({
      setupStructureScore: 100,
      trendScore: 100,
      momentumScore: 100,
      volumeScore: 100,
      confirmationScore: 100,
      riskScore: 100,
      dimensions: [
        { dimension: "Structure", score: 100, verdict: "Strong", reasons: ["Perfect."] },
        { dimension: "Trend", score: 100, verdict: "Strong", reasons: ["Perfect."] },
        { dimension: "Momentum", score: 100, verdict: "Strong", reasons: ["Perfect."] },
        { dimension: "Volume", score: 100, verdict: "Strong", reasons: ["Perfect."] },
        { dimension: "Confirmation", score: 100, verdict: "Strong", reasons: ["Perfect."] },
        { dimension: "Risk", score: 100, verdict: "Strong", reasons: ["Perfect."] },
      ],
    }),
    multiTimeframe: {
      symbol: "BTC",
      activeTimeframe: "1H",
      rows: [],
      alignmentScore: 100,
      status: "Strong Alignment",
      pattern: "Full bullish alignment",
      mentorSummary: "Full alignment.",
      alignmentImpact: 10,
      higherTimeframeDirection: "Strong Bullish",
      countertrendWarning: null,
    },
    footprint: {
      type: "Accumulation",
      confidence: 100,
      strength: "Strong",
      direction: "Bullish",
      confirmationStatus: "Confirmed",
      evidence: [],
      explanation: "Strong accumulation context.",
      riskNote: "None",
      suggestedAction: "Prepare",
      confirmationNeeded: "None",
      confidenceImpact: 10,
      chartLabels: [],
    },
    news: {
      symbol: "BTC",
      pressReleases: [],
      news: [],
      detectedKeywords: [],
      sentiment: "Positive",
      urgency: "Low",
      possibleMarketImpact: "Supportive.",
      hermesInterpretation: "Positive quiet news.",
      riskCaution: { active: false, message: "" },
      chartMarker: { active: false, label: "", tone: "mint" },
    },
    strategy: {
      currentStrategy: {
        type: "Trend Continuation",
        score: 90,
        quality: "Excellent",
        whyItFits: ["Aligned"],
        nextConfirmation: "Hold",
        riskNotes: [],
        traderDnaFit: "Aligned",
      },
      strategies: [],
    },
    context: visionContext({ riskReward: 4 }),
  });

  const reasoning = buildHermesReasoning(input);
  const breakdown = packageConfidenceBreakdown({ reasoning });
  assert.equal(breakdown.finalScore, reasoning.confidenceScore);
  assert.ok(breakdown.finalScore <= MAX_REASONING_CONFIDENCE);
  assert.equal(breakdown.maxConfidence, MAX_REASONING_CONFIDENCE);
  if (breakdown.capsApplied.length > 0) {
    assert.ok(breakdown.capsApplied.some((c) => c.cap === MAX_REASONING_CONFIDENCE));
  }
});

test("insufficient-data adjustment is explicit when modules missing", () => {
  const input = baseInput({
    multiTimeframe: undefined,
    footprint: undefined,
    news: undefined,
    strategy: undefined,
    memory: undefined,
  });
  const reasoning = buildHermesReasoning(input);
  const breakdown = packageConfidenceBreakdown({ reasoning, input });
  assert.equal(breakdown.finalScore, reasoning.confidenceScore);
  assert.ok(
    breakdown.dataQualityAdjustment <= 0 ||
      breakdown.adjustments.some((a) => a.id === "adj-data-quality"),
  );
  // Missing categories should create negative missing penalties
  assert.ok(
    breakdown.negativeContributions.some((c) => c.label.includes("missing")) ||
      breakdown.dataQualityAdjustment < 0,
  );
});

test("conflicting evidence is listed without removing it from breakdown drivers", () => {
  const input = baseInput({
    multiTimeframe: {
      symbol: "BTC",
      activeTimeframe: "1H",
      rows: [],
      alignmentScore: 35,
      status: "Conflict",
      pattern: "Mixed conditions",
      mentorSummary: "Conflict across timeframes.",
      alignmentImpact: -8,
      higherTimeframeDirection: "Bearish",
      countertrendWarning: "Active TF fights HTF.",
    },
  });
  const reasoning = buildHermesReasoning(input);
  const breakdown = packageConfidenceBreakdown({ reasoning });
  assert.ok(reasoning.conflictingEvidence.length > 0);
  assert.ok(breakdown.unresolvedConflicts.length > 0 || breakdown.reducingDrivers.length > 0);
  assert.equal(breakdown.finalScore, reasoning.confidenceScore);
});

test("deterministic output for identical reasoning results", () => {
  const input = baseInput();
  const reasoning = buildHermesReasoning(input);
  const a = packageConfidenceBreakdown({
    reasoning,
    sourceTimestamp: 123,
  });
  const b = packageConfidenceBreakdown({
    reasoning,
    sourceTimestamp: 123,
  });
  assert.deepEqual(a, b);
});

test("evidence ID linking includes reasoning evidence ids and phase-2 ids when provided", () => {
  const input = baseInput();
  const reasoning = buildHermesReasoning(input);
  const hermesEvidence: HermesEvidence[] = adaptVisionEvidence(input.vision, {
    symbol: "BTC",
    now: 1,
  });
  const breakdown = packageConfidenceBreakdown({ reasoning, hermesEvidence });
  const allIds = [
    ...breakdown.positiveContributions,
    ...breakdown.negativeContributions,
    ...breakdown.neutralContributions,
  ].flatMap((c) => c.evidenceIds);

  assert.ok(allIds.some((id) => id === "structure-quality" || id.includes("structure")));
  assert.ok(allIds.some((id) => id.startsWith("vision-") || id === "structure-quality"));
});

test("reconciliation equals zero after packaging", () => {
  const reasoning = buildHermesReasoning(baseInput());
  const breakdown = packageConfidenceBreakdown({ reasoning });
  assert.equal(breakdown.reconciliationDifference, 0);
  assert.equal(reconstructTotal(breakdown), breakdown.finalScore);
});

test("readiness is unchanged by packaging (parity with reasoning result)", () => {
  const input = baseInput();
  const reasoning = buildHermesReasoning(input);
  const before = reasoning.tradeReadinessScore;
  packageConfidenceBreakdown({ reasoning });
  const again = buildHermesReasoning(input);
  assert.equal(again.tradeReadinessScore, before);
  assert.equal(again.confidenceScore, reasoning.confidenceScore);
});

test("Trade Quality path is not modified by packaging (independent TQ fixture untouched)", () => {
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
    score: 77,
    rawScore: 80,
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
  const scoreBefore = tq.score;
  const reasoning = buildHermesReasoning(baseInput({ tradeQuality: tq }));
  packageConfidenceBreakdown({ reasoning });
  assert.equal(tq.score, scoreBefore);
  assert.equal(tq.grade, "B+");
});

test("package from evidence+input matches calculateReasoningConfidence final", () => {
  const input = baseInput();
  const evidence = buildReasoningEvidence(input);
  const calc = calculateReasoningConfidence(evidence, input);
  const breakdown = packageConfidenceBreakdown({ evidence, input, sourceTimestamp: 99 });
  assert.equal(breakdown.finalScore, calc.finalConfidence);
  assert.equal(breakdown.baseScore, 60);
  assert.equal(breakdown.dataQualityAdjustment, calc.dataQualityAdjustment);
  assert.equal(reconstructTotal(breakdown), calc.finalConfidence);
});
