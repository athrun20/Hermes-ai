/**
 * Hermes Conviction tests — internal stage only.
 * Does not recompute scores, size positions, or emit Buy/Sell.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHermesConviction,
  convictionContainsSizeRecommendations,
  convictionContainsTradeCommands,
  type HermesEvidence,
  type HermesJudgment,
  type HermesOpinion,
  type MarketRegime,
} from "../lib/intelligence-v2/index";

const NOW = 1_700_000_000_000;

function regime(overrides: Partial<MarketRegime> = {}): MarketRegime {
  return {
    kind: "hermes-market-regime-v1",
    symbol: "BTC",
    structureRegime: "Trending",
    volatilityRegime: "Normal",
    liquidityRegime: "Healthy",
    eventRegime: "Normal",
    directionalBias: "Bullish",
    summary: "Constructive trend regime for study.",
    confidence: 72,
    supportingSignals: ["HTF constructive"],
    conflictingSignals: [],
    sourceTimestamp: NOW,
    dataQuality: "Good",
    ...overrides,
  };
}

function judgment(overrides: Partial<HermesJudgment> = {}): HermesJudgment {
  return {
    kind: "hermes-judgment-v1",
    stance: "Wait",
    wouldTakeTrade: "Conditional",
    summary: "Judgment: Wait.",
    primaryReason: "Not ready now.",
    supportingReasons: ["Thesis can be studied."],
    blockingReasons: ["Confirmation is still developing."],
    conditionsToProceed: ["Improve Trade Readiness."],
    conditionsToAvoid: ["Do not enter early because Confidence is high."],
    regimeEffect: {
      level: "Supportive",
      summary: "Trending / Normal / Healthy / Normal",
      factors: ["Structure is Trending."],
    },
    traderFitEffect: {
      level: "Aligned",
      summary: "Trader DNA fit is supportive (Aligned).",
      notes: [],
    },
    sourceTimestamp: NOW,
    ...overrides,
  };
}

function opinion(overrides: Partial<HermesOpinion> = {}): HermesOpinion {
  return {
    kind: "hermes-opinion-v1",
    opinion: "Hermes would wait.",
    why: "Readiness incomplete.",
    supportingEvidence: [],
    contradictingEvidence: [],
    whatWouldChangeOpinion: ["Improve readiness."],
    biggestRisk: "Acting before confirmation.",
    commonTraderMistake: "Confusing Confidence with Readiness.",
    nextFocus: "Resolve confirmation.",
    stance: "Wait",
    confidenceFinalScore: 74,
    readinessScore: 52,
    regimeSummary: "Constructive trend regime for study.",
    sourceEvidenceIds: [],
    sourceTimestamp: NOW,
    summary: "Opinion [Wait]",
    ...overrides,
  };
}

function evidenceContradictions(count: number, strength = 70): HermesEvidence[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ev-contra-${i}`,
    stage: "Technical Structure" as const,
    category: "Momentum" as const,
    claim: `Contradictory signal ${i + 1}`,
    direction: "Contradictory" as const,
    strength,
    reliability: "Medium" as const,
    sourceModules: ["test"],
    timestamp: NOW,
  }));
}

type Args = {
  judgment?: HermesJudgment;
  opinion?: HermesOpinion;
  regime?: MarketRegime;
  confidence?: number;
  readiness?: number;
  riskQuality?: "Excellent" | "Good" | "Average" | "Poor" | "Unacceptable";
  evidence?: HermesEvidence[];
  eventRiskActive?: boolean;
  hasOpenPosition?: boolean;
};

function conviction(args: Args = {}) {
  return buildHermesConviction({
    judgment: args.judgment ?? judgment(),
    opinion: args.opinion ?? opinion(),
    regime: args.regime ?? regime(),
    confidence: args.confidence ?? 74,
    readiness: args.readiness ?? 52,
    riskQuality: args.riskQuality ?? "Good",
    evidence: args.evidence,
    eventRiskActive: args.eventRiskActive,
    hasOpenPosition: args.hasOpenPosition,
    sourceTimestamp: NOW,
  });
}

function takeJudgment(overrides: Partial<HermesJudgment> = {}): HermesJudgment {
  return judgment({
    stance: "Take",
    wouldTakeTrade: true,
    primaryReason: "Hermes would personally take this trade for paper practice.",
    blockingReasons: [],
    supportingReasons: ["Plan complete.", "Regime workable."],
    conditionsToProceed: ["Validate stop and target once more."],
    regimeEffect: {
      level: "Supportive",
      summary: "Trending / Normal / Healthy / Normal",
      factors: ["Structure is Trending."],
    },
    ...overrides,
  });
}

test("None: Avoid judgment", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Avoid",
      wouldTakeTrade: false,
      primaryReason: "Hermes would personally pass.",
      blockingReasons: ["Hostile regime"],
    }),
    confidence: 80,
    readiness: 70,
  });
  assert.equal(result.level, "None");
  assert.equal(result.sizingBias, "No New Risk");
  assert.ok(result.riskConstraints.length > 0);
});

test("None: Insufficient Data", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Insufficient Data",
      wouldTakeTrade: false,
      primaryReason: "Data quality too poor.",
    }),
    regime: regime({ dataQuality: "Poor" }),
  });
  assert.equal(result.level, "None");
  assert.equal(result.sizingBias, "No New Risk");
});

test("None: hostile regime even with strong scores", () => {
  const result = conviction({
    judgment: takeJudgment({
      regimeEffect: {
        level: "Hostile",
        summary: "Event Driven",
        factors: ["Event regime is Event Driven."],
      },
      blockingReasons: ["Hostile regime: Event Driven"],
    }),
    regime: regime({
      eventRegime: "Event Driven",
      volatilityRegime: "High",
      structureRegime: "Transition",
      summary: "Event-driven hostile tape.",
    }),
    confidence: 88,
    readiness: 90,
    riskQuality: "Excellent",
  });
  assert.equal(result.level, "None");
  assert.equal(result.sizingBias, "No New Risk");
});

test("None: poor data quality", () => {
  const result = conviction({
    judgment: takeJudgment(),
    regime: regime({ dataQuality: "Poor" }),
    confidence: 80,
    readiness: 90,
  });
  assert.equal(result.level, "None");
});

test("Low: Wait judgment", () => {
  const result = conviction({
    judgment: judgment({ stance: "Wait" }),
    confidence: 80,
    readiness: 45,
  });
  assert.equal(result.level, "Low");
  assert.equal(result.sizingBias, "Reduced Risk");
});

test("Low: High Confidence with low Readiness", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Wait",
      primaryReason: "High Confidence but incomplete readiness.",
    }),
    opinion: opinion({
      confidenceFinalScore: 86,
      readinessScore: 40,
      stance: "Wait",
    }),
    confidence: 86,
    readiness: 40,
  });
  assert.equal(result.level, "Low");
  assert.match(result.primaryDriver, /Confidence|readiness|High Confidence/i);
  assert.ok(result.reducingDrivers.some((d) => /Confidence|Readiness/i.test(d)));
});

test("Moderate: Take With Caution", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Take With Caution",
      wouldTakeTrade: "Conditional",
      primaryReason: "Actionable with residual risk.",
      blockingReasons: ["Elevated caution remains."],
      regimeEffect: {
        level: "Cautionary",
        summary: "Elevated event risk",
        factors: ["Elevated event risk"],
      },
    }),
    // No active event risk / thin / extreme — residual caution only
    regime: regime({
      volatilityRegime: "Normal",
      eventRegime: "Normal",
      structureRegime: "Trending",
    }),
    confidence: 76,
    readiness: 74,
    riskQuality: "Average",
    evidence: evidenceContradictions(1, 50),
  });
  assert.equal(result.level, "Moderate");
  assert.equal(result.sizingBias, "Standard Risk");
});

test("Low: Take With Caution under unresolved event risk", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Take With Caution",
      wouldTakeTrade: "Conditional",
      primaryReason: "Event risk unresolved.",
      regimeEffect: {
        level: "Cautionary",
        summary: "Elevated Event Risk",
        factors: ["Elevated event risk"],
      },
    }),
    regime: regime({ eventRegime: "Elevated Event Risk" }),
    confidence: 78,
    readiness: 75,
    eventRiskActive: true,
  });
  assert.equal(result.level, "Low");
  assert.equal(result.sizingBias, "Reduced Risk");
  assert.ok(result.reducingDrivers.some((d) => /event/i.test(d)));
});

test("Low: thin liquidity", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Take With Caution",
      wouldTakeTrade: "Conditional",
      regimeEffect: {
        level: "Cautionary",
        summary: "Thin liquidity",
        factors: ["Liquidity is Thin."],
      },
    }),
    regime: regime({ liquidityRegime: "Thin" }),
    confidence: 75,
    readiness: 72,
  });
  assert.equal(result.level, "Low");
  assert.ok(result.reducingDrivers.some((d) => /thin|liquidity/i.test(d)));
});

test("Low or None: extreme volatility", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Wait",
      regimeEffect: {
        level: "Cautionary",
        summary: "Extreme vol",
        factors: ["Volatility is Extreme."],
      },
    }),
    regime: regime({ volatilityRegime: "Extreme" }),
    confidence: 70,
    readiness: 60,
  });
  assert.ok(result.level === "Low" || result.level === "None");
  assert.ok(result.reducingDrivers.some((d) => /extreme|volatility|vol/i.test(d)) || result.level === "None");
});

test("High: rare strict Take path with supportive regime", () => {
  const result = conviction({
    judgment: takeJudgment(),
    opinion: opinion({
      stance: "Take",
      confidenceFinalScore: 80,
      readinessScore: 90,
      contradictingEvidence: [],
      biggestRisk: "Process failure if invalidation ignored.",
    }),
    regime: regime({
      structureRegime: "Trending",
      volatilityRegime: "Normal",
      liquidityRegime: "Healthy",
      eventRegime: "Normal",
      dataQuality: "Good",
    }),
    confidence: 80,
    readiness: 90,
    riskQuality: "Excellent",
    evidence: [
      {
        id: "ev-support",
        stage: "Technical Structure",
        category: "Market Structure",
        claim: "Support holds",
        direction: "Supportive",
        strength: 80,
        reliability: "High",
        sourceModules: ["vision"],
        timestamp: NOW,
      },
    ],
  });
  assert.equal(result.level, "High");
  assert.equal(result.sizingBias, "Eligible for Higher Risk");
  assert.match(result.summary, /descriptive only|Eligible for Higher Risk|High/i);
  assert.ok(result.riskConstraints.some((c) => /descriptive only|does not calculate position size/i.test(c)));
});

test("High Confidence with hostile regime is not High Conviction", () => {
  const result = conviction({
    judgment: takeJudgment({
      stance: "Avoid",
      wouldTakeTrade: false,
      primaryReason: "Hostile regime pass.",
      regimeEffect: {
        level: "Hostile",
        summary: "Event Driven",
        factors: ["Event Driven"],
      },
    }),
    regime: regime({ eventRegime: "Event Driven" }),
    confidence: 90,
    readiness: 88,
    riskQuality: "Excellent",
  });
  assert.ok(result.level === "None" || result.level === "Low");
  assert.notEqual(result.level, "High");
});

test("Contradictory evidence reduces Take With Caution to Low when substantial", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Take With Caution",
      wouldTakeTrade: "Conditional",
      primaryReason: "Actionable but contradictions remain.",
    }),
    confidence: 77,
    readiness: 76,
    evidence: evidenceContradictions(3, 70),
    opinion: opinion({
      stance: "Take With Caution",
      contradictingEvidence: [
        {
          claim: "Strong contradiction A",
          direction: "Contradictory",
          source: "evidence",
          weightHint: 70,
        },
        {
          claim: "Strong contradiction B",
          direction: "Contradictory",
          source: "evidence",
          weightHint: 68,
        },
      ],
    }),
  });
  assert.equal(result.level, "Low");
});

test("Open-position management is not new-entry High Conviction", () => {
  const result = conviction({
    judgment: judgment({
      stance: "Manage Existing Position",
      wouldTakeTrade: "Conditional",
      primaryReason: "Manage open risk.",
    }),
    hasOpenPosition: true,
    confidence: 85,
    readiness: 90,
    riskQuality: "Excellent",
    regime: regime(),
  });
  assert.notEqual(result.level, "High");
  assert.ok(result.level === "Low" || result.level === "None");
  assert.ok(result.sizingBias === "Reduced Risk" || result.sizingBias === "No New Risk");
  assert.ok(
    result.primaryDriver.match(/management|open-position|open position/i) ||
      result.reducingDrivers.some((d) => /open position|management/i.test(d)),
  );
});

test("contract fields present", () => {
  const result = conviction();
  assert.equal(result.kind, "hermes-conviction-v1");
  assert.ok(["None", "Low", "Moderate", "High"].includes(result.level));
  assert.ok(
    [
      "No New Risk",
      "Reduced Risk",
      "Standard Risk",
      "Eligible for Higher Risk",
    ].includes(result.sizingBias),
  );
  assert.ok(result.summary.length > 0);
  assert.ok(result.primaryDriver.length > 0);
  assert.ok(Array.isArray(result.supportingDrivers));
  assert.ok(Array.isArray(result.reducingDrivers));
  assert.ok(Array.isArray(result.riskConstraints));
  assert.ok(Array.isArray(result.conditionsForIncrease));
  assert.ok(Array.isArray(result.conditionsForDecrease));
  assert.equal(result.sourceTimestamp, NOW);
});

test("deterministic output", () => {
  const a = conviction({
    judgment: takeJudgment(),
    confidence: 80,
    readiness: 90,
    riskQuality: "Excellent",
  });
  const b = conviction({
    judgment: takeJudgment(),
    confidence: 80,
    readiness: 90,
    riskQuality: "Excellent",
  });
  assert.deepEqual(a, b);
});

test("does not mutate inputs", () => {
  const j = takeJudgment();
  const o = opinion({ stance: "Take", confidenceFinalScore: 80, readinessScore: 90 });
  const r = regime();
  const stanceBefore = j.stance;
  const confBefore = o.confidenceFinalScore;
  const regimeConfBefore = r.confidence;
  buildHermesConviction({
    judgment: j,
    opinion: o,
    regime: r,
    confidence: 80,
    readiness: 90,
    riskQuality: "Excellent",
    sourceTimestamp: NOW,
  });
  assert.equal(j.stance, stanceBefore);
  assert.equal(o.confidenceFinalScore, confBefore);
  assert.equal(r.confidence, regimeConfBefore);
});

test("no Buy/Sell language", () => {
  const samples = [
    conviction({ judgment: judgment({ stance: "Avoid", wouldTakeTrade: false }), confidence: 40, readiness: 20 }),
    conviction({ judgment: judgment({ stance: "Wait" }), confidence: 80, readiness: 40 }),
    conviction({
      judgment: takeJudgment(),
      confidence: 80,
      readiness: 90,
      riskQuality: "Excellent",
    }),
    conviction({
      judgment: judgment({ stance: "Manage Existing Position" }),
      hasOpenPosition: true,
    }),
  ];
  for (const result of samples) {
    assert.equal(convictionContainsTradeCommands(result), false, result.summary);
    assert.equal(convictionContainsSizeRecommendations(result), false, result.summary);
  }
});

test("no position-size calculation fields", () => {
  const result = conviction({
    judgment: takeJudgment(),
    confidence: 80,
    readiness: 90,
    riskQuality: "Excellent",
  });
  assert.equal((result as { positionSize?: unknown }).positionSize, undefined);
  assert.equal((result as { notional?: unknown }).notional, undefined);
  assert.equal((result as { quantity?: unknown }).quantity, undefined);
  assert.ok(result.riskConstraints.some((c) => /does not calculate position size/i.test(c)));
});

test("Moderate Confidence cannot reach High even with excellent readiness", () => {
  const result = conviction({
    judgment: takeJudgment(),
    confidence: 60,
    readiness: 92,
    riskQuality: "Excellent",
    regime: regime(),
  });
  assert.notEqual(result.level, "High");
  assert.ok(result.level === "Moderate" || result.level === "Low");
});

test("strong supportive regime alone does not force High without Take + readiness", () => {
  const result = conviction({
    judgment: judgment({ stance: "Wait" }),
    regime: regime({
      structureRegime: "Trending",
      volatilityRegime: "Normal",
      liquidityRegime: "Healthy",
      eventRegime: "Normal",
    }),
    confidence: 80,
    readiness: 55,
    riskQuality: "Excellent",
  });
  assert.equal(result.level, "Low");
});
