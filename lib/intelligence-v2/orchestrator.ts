/**
 * Hermes Intelligence v2 — orchestrator (composition boundary).
 *
 * runHermesIntelligence composes approved stages in deterministic order:
 *   1. Market Regime
 *   2. Evidence Collection
 *   3. Existing Reasoning (packaged, not recomputed)
 *   4. Confidence Breakdown packaging
 *   5. Hermes Judgment
 *   6. Hermes Opinion
 *   7. Hermes Conviction
 *   8. Decision / Trade Quality references (supplied only)
 *   9. Coach-ready fields derived from the bundle
 *
 * Does NOT independently recalculate Confidence, Readiness, Trade Quality,
 * Hermes Score, position size, or scenario probabilities.
 * Does NOT wire the dashboard, mutate paper trading, or delete legacy modules.
 */

import type { AssetQuote, Candle, CoinSymbol } from "@/lib/market-data";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { SmartChartIntelligenceResult } from "@/lib/smart-chart-intelligence-types";
import type { HermesMemorySnapshot, TradingPersonalityProfile } from "@/lib/hermes-memory";
import type { ReasoningResult, ReasoningRiskQuality } from "@/lib/reasoning-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";
import type { DecisionReview } from "@/lib/decision-types";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import { buildMarketRegime } from "@/lib/intelligence-v2/market-regime";
import { collectHermesEvidence } from "@/lib/intelligence-v2/collect-evidence";
import { packageConfidenceBreakdown } from "@/lib/intelligence-v2/confidence-breakdown";
import {
  buildHermesJudgment,
  type JudgmentPlanInput,
  type JudgmentProfileInput,
} from "@/lib/intelligence-v2/judgment";
import { buildHermesOpinion } from "@/lib/intelligence-v2/opinion";
import { buildHermesConviction } from "@/lib/intelligence-v2/conviction";
import type {
  ConfidenceBreakdown,
  DataFreshness,
  DataQuality,
  HermesCoachReady,
  HermesConviction,
  HermesDecisionPackage,
  HermesIntelligenceBundle,
  HermesIntelligenceProvenance,
  HermesJudgment,
  HermesOpinion,
  HermesReasoningPackage,
  MarketRegime,
  StageProvenance,
} from "@/lib/intelligence-v2/types";

export type HermesIntelligenceInput = {
  symbol: CoinSymbol;
  timeframe?: string;
  sourceTimestamp?: number;
  quote: Pick<AssetQuote, "symbol" | "price" | "change24h">;
  candles: Candle[];
  vision?: HermesVisionResult;
  visionContext?: Pick<
    HermesVisionContext,
    "candleTrend" | "averageCandleRange" | "currentPrice" | "volume" | "rsi"
  >;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
  news?: NewsIntelligenceResult;
  smartChart?: SmartChartIntelligenceResult;
  memory?: HermesMemorySnapshot;
  personality?: TradingPersonalityProfile;
  dailyGoal?: string;
  /** Prefer precomputed Reasoning — orchestrator does not re-run the engine. */
  reasoning?: ReasoningResult;
  tradeQuality?: TradeQualityResult;
  decision?: DecisionReview;
  hermesScore?: HermesScoreResult;
  plan?: JudgmentPlanInput;
  riskQuality?: ReasoningRiskQuality;
  hasOpenPosition?: boolean;
  eventRiskActive?: boolean;
  /** Optional override when caller already assessed quality */
  dataQualityOverride?: DataQuality;
  dataFreshness?: DataFreshness;
  profile?: JudgmentProfileInput;
};

/**
 * Compose Intelligence v2 stages into one pure, deterministic bundle.
 * Throws only for invalid programmer inputs (missing required fields / wrong types).
 * Ordinary incomplete market data returns a degraded bundle with warnings.
 */
export function runHermesIntelligence(input: HermesIntelligenceInput): HermesIntelligenceBundle {
  validateProgrammerInput(input);

  const sourceTimestamp = input.sourceTimestamp ?? Date.now();
  const generatedAt = sourceTimestamp;
  const freshness = input.dataFreshness ?? "unknown";
  const warnings: string[] = [];
  const stages: StageProvenance[] = [];
  const limitations: string[] = [];

  // --- 1. Market Regime ---
  const regime = buildMarketRegime({
    quote: {
      symbol: input.symbol,
      price: input.quote.price,
      change24h: input.quote.change24h,
    },
    candles: input.candles,
    visionContext: input.visionContext,
    vision: input.vision
      ? {
          trendScore: input.vision.trendScore,
          volumeScore: input.vision.volumeScore,
          momentumScore: input.vision.momentumScore,
          setupStructureScore: input.vision.setupStructureScore,
        }
      : undefined,
    multiTimeframe: input.multiTimeframe
      ? {
          status: input.multiTimeframe.status,
          alignmentScore: input.multiTimeframe.alignmentScore,
          higherTimeframeDirection: input.multiTimeframe.higherTimeframeDirection,
          countertrendWarning: input.multiTimeframe.countertrendWarning,
          pattern: input.multiTimeframe.pattern,
        }
      : undefined,
    news: input.news
      ? {
          urgency: input.news.urgency,
          sentiment: input.news.sentiment,
          riskCaution: input.news.riskCaution,
        }
      : undefined,
    now: sourceTimestamp,
  });

  const dataQuality = input.dataQualityOverride ?? regime.dataQuality;
  if (input.dataQualityOverride && input.dataQualityOverride !== regime.dataQuality) {
    warnings.push(
      `Data quality override applied (${input.dataQualityOverride}); regime assessed ${regime.dataQuality}.`,
    );
  }

  stages.push({
    stage: "Market Regime",
    sourceModules: uniqueModules([
      "market-regime",
      input.vision ? "hermes-vision" : undefined,
      input.multiTimeframe ? "multi-timeframe" : undefined,
      input.news ? "news-intelligence" : undefined,
    ]),
    sourceTimestamp,
    inputRefs: [
      "quote",
      "candles",
      input.vision ? "vision" : undefined,
      input.multiTimeframe ? "multiTimeframe" : undefined,
      input.news ? "news" : undefined,
    ].filter(Boolean) as string[],
    limitations: [
      ...(input.candles.length < 5 ? ["Thin candle history for regime classification."] : []),
      ...(regime.dataQuality === "Poor" || regime.dataQuality === "Limited"
        ? [`Regime data quality is ${regime.dataQuality}.`]
        : []),
    ],
    freshness,
    status:
      regime.dataQuality === "Poor"
        ? "degraded"
        : regime.dataQuality === "Limited"
          ? "degraded"
          : "ok",
  });

  // --- 2. Evidence Collection ---
  const evidence = collectHermesEvidence({
    regime,
    vision: input.vision,
    multiTimeframe: input.multiTimeframe,
    footprint: input.footprint,
    news: input.news,
    smartChart: input.smartChart,
    memory: input.memory,
    personality: input.personality,
    dailyGoal: input.dailyGoal,
    symbol: input.symbol,
    now: sourceTimestamp,
    dedupe: true,
  });

  const optionalModulesPresent = countOptionalModules(input);
  if (optionalModulesPresent === 0) {
    warnings.push("No optional intelligence modules supplied — evidence is regime-primary only.");
  } else if (optionalModulesPresent < 3) {
    warnings.push(
      `Partial module coverage (${optionalModulesPresent} optional module(s)) — evidence set may be incomplete.`,
    );
  }
  if (evidence.some((e) => e.direction === "Contradictory")) {
    warnings.push("Conflicting evidence present — contradictions preserved for audit.");
  }

  stages.push({
    stage: "Evidence Collection",
    sourceModules: uniqueModules(evidence.flatMap((e) => e.sourceModules)),
    sourceTimestamp,
    inputRefs: listEvidenceInputRefs(input),
    limitations: [
      ...(optionalModulesPresent < 3
        ? ["Partial module coverage — evidence set may be incomplete."]
        : []),
    ],
    freshness,
    status: optionalModulesPresent < 3 ? "degraded" : "ok",
  });

  // --- 3. Existing Reasoning package (no recompute) ---
  const reasoningPkg = packageReasoning(input.reasoning);
  if (reasoningPkg.source === "absent") {
    warnings.push(
      "Reasoning result missing — Confidence/Readiness not recomputed; downstream stages degrade explicitly.",
    );
    stages.push({
      stage: "Hermes Reasoning",
      sourceModules: [],
      sourceTimestamp,
      inputRefs: [],
      limitations: ["No precomputed ReasoningResult supplied."],
      freshness,
      status: "missing",
    });
  } else {
    if (input.reasoning?.dataState === "Stale" || freshness === "stale") {
      warnings.push("Reasoning or market data marked stale — treat actionability with extra caution.");
    }
    if (input.reasoning?.dataState === "Insufficient Data") {
      warnings.push("Reasoning dataState is Insufficient Data.");
    }
    stages.push({
      stage: "Hermes Reasoning",
      sourceModules: ["reasoning-engine"],
      sourceTimestamp: input.reasoning?.timestamp ?? sourceTimestamp,
      inputRefs: ["reasoning"],
      limitations: [
        "Scores mirrored from supplied ReasoningResult only.",
        ...(input.reasoning?.dataState && input.reasoning.dataState !== "Ready"
          ? [`Reasoning dataState: ${input.reasoning.dataState}.`]
          : []),
      ],
      freshness: mapReasoningFreshness(input.reasoning?.dataState, freshness),
      status:
        input.reasoning?.dataState === "Ready"
          ? "ok"
          : input.reasoning?.dataState
            ? "degraded"
            : "ok",
    });
  }

  // --- 4. Confidence Breakdown packaging ---
  let confidenceBreakdown: ConfidenceBreakdown | undefined;
  if (input.reasoning) {
    confidenceBreakdown = packageConfidenceBreakdown({
      reasoning: input.reasoning,
      hermesEvidence: evidence,
      sourceTimestamp,
    });
    if (confidenceBreakdown.finalScore !== input.reasoning.confidenceScore) {
      // Should not happen — surface as warning without inventing a new formula
      warnings.push(
        `Confidence Breakdown finalScore (${confidenceBreakdown.finalScore}) differs from reasoning.confidenceScore (${input.reasoning.confidenceScore}) — investigate packaging parity.`,
      );
    }
    stages.push({
      stage: "Confidence Breakdown",
      sourceModules: ["confidence-breakdown", "reasoning-engine"],
      sourceTimestamp,
      inputRefs: ["reasoning", "evidence"],
      limitations: ["Packages existing Confidence arithmetic; does not change primary formula."],
      freshness: mapReasoningFreshness(input.reasoning.dataState, freshness),
      status: "ok",
    });
  } else {
    warnings.push("Confidence Breakdown skipped — requires supplied Reasoning (no independent recalculation).");
    stages.push({
      stage: "Confidence Breakdown",
      sourceModules: [],
      sourceTimestamp,
      inputRefs: [],
      limitations: ["Skipped: missing ReasoningResult."],
      freshness,
      status: "skipped",
    });
  }

  // --- 5. Judgment ---
  const profile: JudgmentProfileInput = {
    traderDnaFit: input.profile?.traderDnaFit ?? input.reasoning?.traderFit,
    personality:
      input.profile?.personality ??
      input.memory?.personality ??
      input.personality?.archetype,
    disciplineScore: input.profile?.disciplineScore ?? input.memory?.scores?.discipline,
    notes: input.profile?.notes,
  };

  const judgment: HermesJudgment = buildHermesJudgment({
    regime,
    reasoning: input.reasoning,
    confidence: input.reasoning?.confidenceScore,
    readiness: input.reasoning?.tradeReadinessScore,
    readinessState: input.reasoning?.readinessState,
    readinessBlockers: input.reasoning?.readinessBlockers,
    recommendedAction: input.reasoning?.recommendedAction,
    traderFit: input.reasoning?.traderFit,
    riskQuality: input.riskQuality ?? input.reasoning?.riskQuality,
    confirmationConditions: input.reasoning?.confirmationConditions,
    invalidationConditions: input.reasoning?.invalidationConditions,
    dataState: input.reasoning?.dataState,
    profile,
    plan: input.plan,
    hasOpenPosition: input.hasOpenPosition,
    eventRiskActive: input.eventRiskActive,
    sourceTimestamp,
  });

  stages.push({
    stage: "Hermes Judgment",
    sourceModules: ["judgment", "market-regime", input.reasoning ? "reasoning-engine" : undefined].filter(
      Boolean,
    ) as string[],
    sourceTimestamp,
    inputRefs: ["regime", input.reasoning ? "reasoning" : undefined, "plan", "profile"].filter(
      Boolean,
    ) as string[],
    limitations: [
      "Personal take stance only — not Trade Quality.",
      ...(judgment.stance === "Insufficient Data"
        ? ["Judgment returned Insufficient Data due to missing or poor inputs."]
        : []),
    ],
    freshness,
    status: judgment.stance === "Insufficient Data" ? "degraded" : "ok",
  });

  // --- 6. Opinion ---
  let opinion: HermesOpinion | undefined;
  if (confidenceBreakdown) {
    opinion = buildHermesOpinion({
      regime,
      evidence,
      confidenceBreakdown,
      judgment,
      readinessScore: input.reasoning?.tradeReadinessScore,
      readinessState: input.reasoning?.readinessState,
      thesis: input.reasoning?.reasoningSummary,
      sourceTimestamp,
    });
    stages.push({
      stage: "Hermes Opinion",
      sourceModules: ["opinion", "judgment", "confidence-breakdown", "market-regime", "evidence"],
      sourceTimestamp,
      inputRefs: ["regime", "evidence", "confidenceBreakdown", "judgment"],
      limitations: ["Narrative orchestration only — does not recompute scores."],
      freshness,
      status: "ok",
    });
  } else {
    warnings.push("Opinion skipped — requires Confidence Breakdown from supplied Reasoning.");
    stages.push({
      stage: "Hermes Opinion",
      sourceModules: [],
      sourceTimestamp,
      inputRefs: [],
      limitations: ["Skipped: missing Confidence Breakdown."],
      freshness,
      status: "skipped",
    });
  }

  // --- 7. Conviction ---
  const conviction: HermesConviction = buildHermesConviction({
    judgment,
    opinion,
    regime,
    confidence: input.reasoning?.confidenceScore ?? opinion?.confidenceFinalScore,
    readiness: input.reasoning?.tradeReadinessScore ?? opinion?.readinessScore,
    riskQuality: input.riskQuality ?? input.reasoning?.riskQuality,
    evidence,
    eventRiskActive: input.eventRiskActive,
    hasOpenPosition: input.hasOpenPosition,
    sourceTimestamp,
  });

  stages.push({
    stage: "Hermes Conviction",
    sourceModules: ["conviction", "judgment", opinion ? "opinion" : undefined].filter(Boolean) as string[],
    sourceTimestamp,
    inputRefs: ["judgment", opinion ? "opinion" : undefined, "regime"].filter(Boolean) as string[],
    limitations: [
      "Internal acting-strength only — not position size.",
      "sizingBias is descriptive and does not alter paper-trading math.",
    ],
    freshness,
    status: "ok",
  });

  // --- 8. Decision / TQ references ---
  const decision = packageDecision(input);
  if (decision.source === "absent") {
    stages.push({
      stage: "Decision",
      sourceModules: [],
      sourceTimestamp,
      inputRefs: [],
      limitations: ["No Trade Quality or Decision review supplied — references absent."],
      freshness,
      status: "missing",
    });
  } else {
    stages.push({
      stage: "Decision",
      sourceModules: uniqueModules([
        input.tradeQuality ? "trade-quality-engine" : undefined,
        input.decision ? "decision-engine" : undefined,
        input.hermesScore ? "hermes-score-engine" : undefined,
      ]),
      sourceTimestamp,
      inputRefs: listDecisionInputRefs(input),
      limitations: ["References only — orchestrator does not recompute TQ, Decision, or Hermes Score."],
      freshness,
      status: "ok",
    });
  }

  // --- 9. Coach-ready fields ---
  const coach = buildCoachReady({
    judgment,
    opinion,
    conviction,
    evidence,
    regime,
    reasoning: reasoningPkg,
    decision,
    warnings,
  });

  stages.push({
    stage: "Coach Explanation",
    sourceModules: ["orchestrator-coach", "opinion", "judgment", "conviction"],
    sourceTimestamp,
    inputRefs: ["judgment", "opinion", "conviction", "evidence"],
    limitations: ["Derived only from composed bundle fields — not an independent coach engine."],
    freshness,
    status: "ok",
  });

  // Unsupported / thin inputs as warnings (degraded, not throw)
  if (!isSupportedTimeframe(input.timeframe)) {
    warnings.push(
      `Timeframe "${input.timeframe ?? "unspecified"}" is not in the primary teaching set — regime still computed from supplied candles.`,
    );
  }
  if (input.candles.length === 0) {
    warnings.push("No candles supplied — regime classification is severely limited.");
  }

  const provenance: HermesIntelligenceProvenance = {
    stages,
    overallFreshness: freshness,
    sourceModules: uniqueModules(stages.flatMap((s) => s.sourceModules)),
    limitations: uniqueStrings([
      ...limitations,
      ...stages.flatMap((s) => s.limitations),
      "Orchestrator is a composition boundary; dashboard is not wired.",
      "Primary metric formulas remain owned by their existing engines.",
    ]),
  };

  const degraded =
    warnings.length > 0 ||
    stages.some((s) => s.status === "degraded" || s.status === "missing" || s.status === "skipped") ||
    dataQuality === "Poor" ||
    dataQuality === "Limited";

  // Align regime dataQuality display with override when present (does not rewrite regime internals)
  const displayQuality = dataQuality;

  return {
    kind: "hermes-intelligence-bundle-v2",
    version: 2,
    symbol: input.symbol,
    timeframe: input.timeframe,
    generatedAt,
    sourceTimestamp,
    dataQuality: displayQuality,
    degraded,
    warnings: uniqueStrings(warnings),
    regime,
    evidence,
    reasoning: reasoningPkg,
    confidenceBreakdown,
    judgment,
    opinion,
    conviction,
    decision,
    coach,
    provenance,
  };
}

function validateProgrammerInput(input: HermesIntelligenceInput): void {
  if (!input || typeof input !== "object") {
    throw new Error("runHermesIntelligence: input must be an object.");
  }
  if (!input.symbol || typeof input.symbol !== "string") {
    throw new Error("runHermesIntelligence: symbol is required.");
  }
  if (!input.quote || typeof input.quote !== "object") {
    throw new Error("runHermesIntelligence: quote is required.");
  }
  if (typeof input.quote.price !== "number" || !Number.isFinite(input.quote.price)) {
    throw new Error("runHermesIntelligence: quote.price must be a finite number.");
  }
  if (!Array.isArray(input.candles)) {
    throw new Error("runHermesIntelligence: candles must be an array.");
  }
  if (input.reasoning && input.reasoning.kind !== "hermes-reasoning-v1") {
    throw new Error("runHermesIntelligence: reasoning.kind must be hermes-reasoning-v1 when provided.");
  }
  if (input.tradeQuality && input.tradeQuality.kind !== "hermes-trade-quality-v1") {
    throw new Error("runHermesIntelligence: tradeQuality.kind must be hermes-trade-quality-v1 when provided.");
  }
}

function packageReasoning(reasoning?: ReasoningResult): HermesReasoningPackage {
  if (!reasoning) {
    return { source: "absent" };
  }
  return {
    source: "supplied",
    thesis: reasoning.reasoningSummary,
    confidence: reasoning.confidenceScore,
    readiness: reasoning.tradeReadinessScore,
    readinessState: reasoning.readinessState,
    readinessBlockers: [...reasoning.readinessBlockers],
    recommendedAction: reasoning.recommendedAction,
    riskQuality: reasoning.riskQuality,
    traderFit: reasoning.traderFit,
    dataState: reasoning.dataState,
    coachingMessage: reasoning.coachingMessage,
    confirmationConditions: [...reasoning.confirmationConditions],
    invalidationConditions: [...reasoning.invalidationConditions],
    timestamp: reasoning.timestamp,
  };
}

function packageDecision(input: HermesIntelligenceInput): HermesDecisionPackage {
  if (!input.tradeQuality && !input.decision && !input.hermesScore) {
    return { source: "absent" };
  }

  const tq = input.tradeQuality ?? input.decision?.tradeQualityResult;
  const score = input.hermesScore;

  return {
    source: "supplied",
    tradeQualityScore: tq?.score,
    tradeQualityGrade: tq?.grade,
    tradeQualityLabel: tq?.label,
    tradeQualitySummary: tq?.summary,
    suggestedNextAction: tq?.suggestedNextAction,
    riskReward: tq?.riskReward ?? input.decision?.riskReward ?? null,
    planCompleteness: tq?.planCompleteness,
    decisionRecommendation: input.decision?.recommendation,
    decisionConfidence: input.decision?.confidence,
    hermesScore: score?.score,
    hermesScoreLabel: score?.label,
  };
}

function buildCoachReady(args: {
  judgment: HermesJudgment;
  opinion?: HermesOpinion;
  conviction: HermesConviction;
  evidence: HermesIntelligenceBundle["evidence"];
  regime: MarketRegime;
  reasoning: HermesReasoningPackage;
  decision: HermesDecisionPackage;
  warnings: string[];
}): HermesCoachReady {
  const { judgment, opinion, conviction, evidence, regime, reasoning, decision } = args;

  const headline = opinion
    ? `Hermes stance: ${judgment.stance} · Conviction ${conviction.level}`
    : `Hermes stance: ${judgment.stance} · Conviction ${conviction.level} (partial intelligence)`;

  const explanationParts = [
    opinion?.opinion ?? judgment.summary,
    opinion?.why ?? judgment.primaryReason,
    reasoning.source === "supplied"
      ? `Existing Confidence ${reasoning.confidence}, Readiness ${reasoning.readiness} (${reasoning.readinessState}) — scores unchanged by orchestration.`
      : "Reasoning was not supplied; Confidence/Readiness were not recomputed.",
    decision.source === "supplied" && decision.tradeQualityScore !== undefined
      ? `Trade Quality reference ${decision.tradeQualityScore}${decision.tradeQualityGrade ? ` (${decision.tradeQualityGrade})` : ""} — not recalculated.`
      : "Trade Quality was not supplied on this run.",
    `Regime: ${regime.summary}`,
    `Conviction sizing bias is descriptive only (${conviction.sizingBias}) and does not change paper size.`,
  ];

  const primaryRisk =
    opinion?.biggestRisk ??
    judgment.blockingReasons[0] ??
    conviction.reducingDrivers[0] ??
    "Primary risk is process failure — acting without confirmation or plan discipline.";

  const nextFocus =
    opinion?.nextFocus ??
    judgment.conditionsToProceed[0] ??
    conviction.conditionsForIncrease[0] ??
    "Study structure and readiness blockers; protect process over urgency.";

  const conditionsToProceed = uniqueStrings([
    ...(judgment.conditionsToProceed ?? []),
    ...(opinion?.whatWouldChangeOpinion.filter((c) => /proceed if/i.test(c)) ?? []),
  ]).slice(0, 8);

  const conditionsToAvoid = uniqueStrings([
    ...(judgment.conditionsToAvoid ?? []),
    ...(opinion?.whatWouldChangeOpinion.filter((c) => /worsens if|abort if|stay flat/i.test(c)) ?? []),
    "Do not treat orchestration as a Buy/Sell signal.",
    "Do not merge Confidence, Readiness, Trade Quality, and Conviction into one score.",
  ]).slice(0, 8);

  const sourceEvidenceIds = uniqueStrings([
    ...(opinion?.sourceEvidenceIds ?? []),
    ...evidence.map((e) => e.id),
  ]).slice(0, 24);

  return {
    headline,
    explanation: uniqueStrings(explanationParts).join(" "),
    primaryRisk,
    nextFocus,
    conditionsToProceed,
    conditionsToAvoid,
    sourceEvidenceIds,
  };
}

function countOptionalModules(input: HermesIntelligenceInput): number {
  return [
    input.vision,
    input.multiTimeframe,
    input.footprint,
    input.news,
    input.smartChart,
    input.memory,
    input.reasoning,
  ].filter(Boolean).length;
}

function listEvidenceInputRefs(input: HermesIntelligenceInput): string[] {
  return [
    "regime",
    input.vision ? "vision" : undefined,
    input.multiTimeframe ? "multiTimeframe" : undefined,
    input.footprint ? "footprint" : undefined,
    input.news ? "news" : undefined,
    input.smartChart ? "smartChart" : undefined,
    input.memory ? "memory" : undefined,
  ].filter(Boolean) as string[];
}

function listDecisionInputRefs(input: HermesIntelligenceInput): string[] {
  return [
    input.tradeQuality ? "tradeQuality" : undefined,
    input.decision ? "decision" : undefined,
    input.hermesScore ? "hermesScore" : undefined,
  ].filter(Boolean) as string[];
}

function mapReasoningFreshness(
  dataState: ReasoningResult["dataState"] | undefined,
  fallback: DataFreshness,
): DataFreshness {
  if (dataState === "Stale") return "stale";
  if (dataState === "Insufficient Data") return fallback === "fixture" ? "fixture" : "unknown";
  return fallback;
}

function isSupportedTimeframe(timeframe?: string): boolean {
  if (!timeframe) return true;
  const allowed = new Set([
    "1m",
    "5m",
    "15m",
    "30m",
    "1H",
    "1h",
    "4H",
    "4h",
    "1D",
    "1d",
    "1W",
    "1w",
  ]);
  return allowed.has(timeframe);
}

function uniqueModules(items: Array<string | undefined>): string[] {
  return [...new Set(items.filter((x): x is string => Boolean(x)))];
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

/** Test helper — scan coach + top-level narrative for trade commands. */
export function bundleContainsTradeCommands(bundle: HermesIntelligenceBundle): boolean {
  const text = [
    bundle.coach.headline,
    bundle.coach.explanation,
    bundle.coach.primaryRisk,
    bundle.coach.nextFocus,
    ...bundle.coach.conditionsToProceed,
    ...bundle.coach.conditionsToAvoid,
    bundle.judgment.summary,
    bundle.judgment.primaryReason,
    bundle.opinion?.opinion ?? "",
    bundle.conviction.summary,
  ].join(" ");
  return /\bbuy\b|\bsell\b/i.test(text);
}

/** Test helper — ensure no position-size fields leaked onto the bundle. */
export function bundleHasPositionSizeFields(bundle: HermesIntelligenceBundle): boolean {
  const asRecord = bundle as unknown as Record<string, unknown>;
  return (
    "positionSize" in asRecord ||
    "notional" in asRecord ||
    "quantity" in asRecord ||
    "sizePercent" in asRecord
  );
}
