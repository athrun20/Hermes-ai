/**
 * Phase 5 — Hermes Opinion tests.
 * Opinion orchestrates Regime + Evidence + Breakdown + Judgment.
 * Does not recompute scores, calculate Conviction, or emit Buy/Sell.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHermesJudgment,
  buildHermesOpinion,
  opinionContainsTradeCommands,
  type ConfidenceBreakdown,
  type HermesEvidence,
  type HermesJudgment,
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
    supportingSignals: ["Higher-timeframe structure remains constructive."],
    conflictingSignals: ["Lower-timeframe noise remains present."],
    sourceTimestamp: NOW,
    dataQuality: "Good",
    ...overrides,
  };
}

function evidenceFixture(): HermesEvidence[] {
  return [
    {
      id: "ev-structure-support",
      stage: "Technical Structure",
      category: "Market Structure",
      claim: "Price holds above key support.",
      direction: "Supportive",
      strength: 78,
      reliability: "High",
      sourceModules: ["vision"],
      timestamp: NOW,
    },
    {
      id: "ev-mtf-align",
      stage: "Technical Structure",
      category: "Multi-Timeframe Alignment",
      claim: "Higher timeframe remains aligned.",
      direction: "Supportive",
      strength: 70,
      reliability: "Medium",
      sourceModules: ["multi-timeframe"],
      timestamp: NOW,
    },
    {
      id: "ev-news-risk",
      stage: "Market Context",
      category: "News and Event Risk",
      claim: "Headline risk is elevated near session open.",
      direction: "Contradictory",
      strength: 62,
      reliability: "Medium",
      sourceModules: ["news"],
      timestamp: NOW,
    },
    {
      id: "ev-volume-fade",
      stage: "Technical Structure",
      category: "Volume Quality",
      claim: "Volume participation is fading into resistance.",
      direction: "Contradictory",
      strength: 55,
      reliability: "Medium",
      sourceModules: ["vision"],
      timestamp: NOW,
    },
  ];
}

function breakdown(overrides: Partial<ConfidenceBreakdown> = {}): ConfidenceBreakdown {
  return {
    kind: "hermes-confidence-breakdown-v1",
    baseScore: 60,
    positiveContributions: [
      {
        category: "Market Structure",
        label: "Structure support",
        contribution: 4.2,
        direction: "Supportive",
        evidenceIds: ["ev-structure-support"],
        sourceModules: ["vision"],
        explanation: "Structure contributes positively to Confidence.",
        reliability: "High",
      },
      {
        category: "Multi-Timeframe Alignment",
        label: "MTF alignment",
        contribution: 2.5,
        direction: "Supportive",
        evidenceIds: ["ev-mtf-align"],
        sourceModules: ["multi-timeframe"],
        explanation: "Multi-timeframe alignment supports the thesis.",
        reliability: "Medium",
      },
    ],
    negativeContributions: [
      {
        category: "News and Event Risk",
        label: "News caution",
        contribution: -2.1,
        direction: "Contradictory",
        evidenceIds: ["ev-news-risk"],
        sourceModules: ["news"],
        explanation: "News risk reduces Confidence contribution.",
        reliability: "Medium",
      },
    ],
    neutralContributions: [],
    adjustments: [],
    capsApplied: [],
    dataQualityAdjustment: 0,
    finalScore: 74,
    reconciliationDifference: 0,
    sourceTimestamp: NOW,
    maxConfidence: 95,
    supportiveDrivers: ["Structure support", "MTF alignment"],
    reducingDrivers: ["News caution"],
    unresolvedConflicts: ["Volume fade vs structure hold"],
    ...overrides,
  };
}

function judgment(overrides: Partial<HermesJudgment> = {}): HermesJudgment {
  return {
    kind: "hermes-judgment-v1",
    stance: "Wait",
    wouldTakeTrade: "Conditional",
    summary: "Judgment: Wait. Would take trade: Conditional.",
    primaryReason:
      "Thesis Confidence is 74 (a “good idea” may exist) but Trade Readiness is 52 (Developing) — not ready now.",
    supportingReasons: ["Thesis Confidence 74 is sufficiently strong for study."],
    blockingReasons: ["Confirmation is still developing."],
    conditionsToProceed: ["Resolve: Confirmation is still developing.", "Improve Trade Readiness."],
    conditionsToAvoid: ["Do not enter early because Confidence is high."],
    regimeEffect: {
      level: "Supportive",
      summary: "Trending / Normal vol / Healthy liquidity / Normal",
      factors: ["Structure is Trending."],
    },
    traderFitEffect: {
      level: "Aligned",
      summary: "Trader DNA fit is supportive (Aligned).",
      notes: ["Setup matches the trader’s stronger pattern family."],
    },
    sourceTimestamp: NOW,
    ...overrides,
  };
}

function buildOpinion(args: {
  regime?: MarketRegime;
  evidence?: HermesEvidence[];
  breakdown?: ConfidenceBreakdown;
  judgment?: HermesJudgment;
  readinessScore?: number;
  readinessState?: string;
  thesis?: string;
} = {}) {
  return buildHermesOpinion({
    regime: args.regime ?? regime(),
    evidence: args.evidence ?? evidenceFixture(),
    confidenceBreakdown: args.breakdown ?? breakdown(),
    judgment: args.judgment ?? judgment(),
    readinessScore: args.readinessScore ?? 52,
    readinessState: args.readinessState ?? "Developing",
    thesis: args.thesis ?? "Structure remains constructive above support while confirmation builds.",
    sourceTimestamp: NOW,
  });
}

test("opinion contract answers all eight coaching questions", () => {
  const result = buildOpinion();
  assert.equal(result.kind, "hermes-opinion-v1");
  assert.ok(result.opinion.length > 0); // 1 what Hermes thinks
  assert.ok(result.why.length > 0); // 2 why
  assert.ok(result.supportingEvidence.length > 0); // 3 support
  assert.ok(result.contradictingEvidence.length > 0); // 4 contradict
  assert.ok(result.whatWouldChangeOpinion.length > 0); // 5 change
  assert.ok(result.biggestRisk.length > 0); // 6 risk
  assert.ok(result.commonTraderMistake.length > 0); // 7 mistake
  assert.ok(result.nextFocus.length > 0); // 8 next focus
  assert.equal(result.stance, "Wait");
  assert.equal(result.confidenceFinalScore, 74);
  assert.equal(result.readinessScore, 52);
  assert.equal(result.sourceTimestamp, NOW);
});

test("supporting evidence is traceable to Phase 2 ids and breakdown", () => {
  const result = buildOpinion();
  const ids = result.supportingEvidence.map((r) => r.evidenceId).filter(Boolean);
  assert.ok(ids.includes("ev-structure-support"));
  assert.ok(result.supportingEvidence.some((r) => r.source === "evidence"));
  assert.ok(result.supportingEvidence.some((r) => r.source === "confidence-breakdown"));
  assert.ok(result.sourceEvidenceIds.includes("ev-structure-support"));
});

test("contradicting evidence includes news risk and judgment blockers", () => {
  const result = buildOpinion();
  assert.ok(result.contradictingEvidence.some((r) => r.evidenceId === "ev-news-risk"));
  assert.ok(
    result.contradictingEvidence.some(
      (r) => r.source === "judgment" && /confirmation/i.test(r.claim),
    ),
  );
  assert.ok(result.contradictingEvidence.some((r) => r.source === "confidence-breakdown"));
});

test("Wait stance opinion preserves good-idea vs ready-now distinction", () => {
  const result = buildOpinion({
    readinessScore: 48,
    judgment: judgment({
      stance: "Wait",
      primaryReason:
        "Thesis Confidence is 74 but Trade Readiness is 48 — not ready now. Judgment does not merge them.",
    }),
  });
  assert.equal(result.stance, "Wait");
  assert.match(result.opinion, /wait/i);
  assert.match(result.commonTraderMistake, /confidence|readiness/i);
  assert.ok(!/bearish thesis/i.test(result.opinion));
});

test("Avoid stance with high confidence still refuses action language", () => {
  const result = buildOpinion({
    readinessScore: 78,
    breakdown: breakdown({ finalScore: 82 }),
    judgment: judgment({
      stance: "Avoid",
      wouldTakeTrade: false,
      primaryReason: "Regime is hostile — Hermes would personally pass.",
      blockingReasons: ["Hostile regime: Event Driven tape"],
      regimeEffect: {
        level: "Hostile",
        summary: "Event Driven / High vol",
        factors: ["Event regime is Event Driven."],
      },
    }),
    regime: regime({
      eventRegime: "Event Driven",
      volatilityRegime: "High",
      summary: "Event-driven risk session.",
    }),
  });
  assert.equal(result.stance, "Avoid");
  assert.match(result.opinion, /pass|avoid/i);
  assert.match(result.biggestRisk, /hostile|event/i);
  assert.equal(result.confidenceFinalScore, 82);
});

test("Take stance opinion stays coach process language", () => {
  const result = buildOpinion({
    readinessScore: 90,
    breakdown: breakdown({ finalScore: 80 }),
    judgment: judgment({
      stance: "Take",
      wouldTakeTrade: true,
      primaryReason: "Hermes would personally take this trade for paper practice.",
      blockingReasons: [],
      conditionsToProceed: ["Validate stop and target once more before execution review."],
    }),
  });
  assert.equal(result.stance, "Take");
  assert.match(result.opinion, /take this setup|paper practice/i);
  assert.match(result.nextFocus, /validate|decision review|stop|target/i);
});

test("Take With Caution highlights residual risk and conservative focus", () => {
  const result = buildOpinion({
    readinessScore: 74,
    judgment: judgment({
      stance: "Take With Caution",
      wouldTakeTrade: "Conditional",
      primaryReason: "Actionable but residual event risk remains.",
      blockingReasons: ["Elevated event risk"],
      conditionsToProceed: ["Keep position sizing conservative."],
    }),
  });
  assert.equal(result.stance, "Take With Caution");
  assert.match(result.commonTraderMistake, /caution|full take|sizing/i);
});

test("Manage Existing Position focuses on management not new entry", () => {
  const result = buildOpinion({
    judgment: judgment({
      stance: "Manage Existing Position",
      wouldTakeTrade: "Conditional",
      primaryReason: "A position is already open — manage risk, not open a fresh entry.",
      conditionsToProceed: ["Respect planned invalidation and stop discipline."],
    }),
  });
  assert.equal(result.stance, "Manage Existing Position");
  assert.match(result.opinion, /management|open/i);
  assert.match(result.commonTraderMistake, /invalidation|add size|open position/i);
});

test("Insufficient Data opinion withholds personal take", () => {
  const result = buildOpinion({
    regime: regime({ dataQuality: "Poor", summary: "Poor tape quality." }),
    judgment: judgment({
      stance: "Insufficient Data",
      wouldTakeTrade: false,
      primaryReason: "Required judgment inputs are missing or data quality is too poor.",
    }),
  });
  assert.equal(result.stance, "Insufficient Data");
  assert.match(result.opinion, /withhold|insufficient/i);
  assert.match(result.biggestRisk, /incomplete|data quality/i);
});

test("whatWouldChangeOpinion includes judgment conditions", () => {
  const result = buildOpinion();
  assert.ok(result.whatWouldChangeOpinion.some((c) => /proceed if|confirmation/i.test(c)));
  assert.ok(result.whatWouldChangeOpinion.some((c) => /worsens if|confidence is high/i.test(c)));
});

test("does not mutate inputs (scores unchanged)", () => {
  const bd = breakdown({ finalScore: 71 });
  const j = judgment();
  const ev = evidenceFixture();
  const rg = regime();
  const confBefore = bd.finalScore;
  const stanceBefore = j.stance;
  const evLen = ev.length;
  buildHermesOpinion({
    regime: rg,
    evidence: ev,
    confidenceBreakdown: bd,
    judgment: j,
    readinessScore: 60,
    sourceTimestamp: NOW,
  });
  assert.equal(bd.finalScore, confBefore);
  assert.equal(j.stance, stanceBefore);
  assert.equal(ev.length, evLen);
  assert.equal(rg.confidence, 72);
});

test("does not calculate Conviction fields", () => {
  const result = buildOpinion();
  assert.equal((result as { conviction?: unknown }).conviction, undefined);
  assert.ok(!("sizingBias" in result));
  assert.ok(!("level" in result && typeof (result as { level?: unknown }).level === "number"));
});

test("deterministic for identical inputs", () => {
  const a = buildOpinion();
  const b = buildOpinion();
  assert.deepEqual(a, b);
});

test("no Buy/Sell language across stances", () => {
  const stances: HermesJudgment["stance"][] = [
    "Take",
    "Take With Caution",
    "Wait",
    "Avoid",
    "Manage Existing Position",
    "Insufficient Data",
  ];
  for (const stance of stances) {
    const result = buildOpinion({
      judgment: judgment({ stance, wouldTakeTrade: stance === "Take" ? true : stance === "Avoid" || stance === "Insufficient Data" ? false : "Conditional" }),
    });
    assert.equal(opinionContainsTradeCommands(result), false, `Buy/Sell found for ${stance}`);
  }
});

test("opinion can be built from live judgment adapter without score side effects", () => {
  const rg = regime();
  const conf = 76;
  const ready = 88;
  const j = buildHermesJudgment({
    regime: rg,
    confidence: conf,
    readiness: ready,
    readinessState: "High-Quality Setup",
    recommendedAction: "Validate",
    traderFit: "Aligned",
    riskQuality: "Good",
    readinessBlockers: [],
    plan: { hasEntry: true, hasStop: true, hasTarget: true, riskReward: 2.4 },
    sourceTimestamp: NOW,
  });
  const bd = breakdown({ finalScore: conf });
  const result = buildHermesOpinion({
    regime: rg,
    evidence: evidenceFixture(),
    confidenceBreakdown: bd,
    judgment: j,
    readinessScore: ready,
    sourceTimestamp: NOW,
  });
  assert.equal(bd.finalScore, conf);
  assert.equal(result.confidenceFinalScore, conf);
  assert.equal(result.readinessScore, ready);
  assert.equal(result.stance, j.stance);
  assert.ok(result.opinion.length > 0);
});

test("regime conflicting signals appear in contradicting evidence", () => {
  const result = buildOpinion({
    regime: regime({
      conflictingSignals: ["Mixed directional votes across timeframes."],
    }),
  });
  assert.ok(
    result.contradictingEvidence.some(
      (r) => r.source === "regime" && /mixed directional/i.test(r.claim),
    ),
  );
});

test("summary includes stance and mirrored confidence", () => {
  const result = buildOpinion({ breakdown: breakdown({ finalScore: 69 }) });
  assert.match(result.summary, /Wait/);
  assert.match(result.summary, /69/);
});
