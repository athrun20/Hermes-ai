import { MAX_REASONING_CONFIDENCE, reasoningConfidenceWeights, reasoningPipeline } from "@/lib/reasoning-config";
import { buildReasoningEvidence } from "@/lib/reasoning-evidence";
import type {
  EvidenceCategory,
  ReasoningEngineInput,
  ReasoningEvidence,
  ReasoningInstitutionalActivity,
  ReasoningMarketContext,
  ReasoningRecommendedAction,
  ReasoningResult,
  ReasoningRiskQuality,
  ReasoningScenario,
  ReasoningSnapshot,
  ReasoningStructure,
  ReasoningTrendQuality,
} from "@/lib/reasoning-types";

export function buildHermesReasoning(input: ReasoningEngineInput): ReasoningResult {
  const timestamp = Date.now();
  const evidence = buildReasoningEvidence(input);
  const confidence = calculateReasoningConfidence(evidence, input);
  const readiness = calculateTradeReadiness(input, evidence);
  const marketContext = classifyMarketContext(input);
  const trendQuality = classifyTrendQuality(input.vision.trendScore, input.context.rsi);
  const marketStructure = classifyMarketStructure(input);
  const institutionalActivity = classifyInstitutionalActivity(input);
  const riskQuality = classifyRiskQuality(input.context.riskReward ?? input.tradeQuality?.riskReward ?? null);
  const supportingEvidence = evidence.filter((item) => item.direction === "Supportive");
  const conflictingEvidence = evidence.filter((item) => item.direction === "Contradictory");
  const neutralEvidence = evidence.filter((item) => item.direction === "Neutral");
  const confirmationConditions = buildConfirmationConditions(input, conflictingEvidence);
  const invalidationConditions = buildInvalidationConditions(input);
  const recommendedAction = getRecommendedAction({ readinessScore: readiness.score, confidenceScore: confidence.finalConfidence, input });
  const scenarios = buildReasoningScenarios({
    input,
    confidenceScore: confidence.finalConfidence,
    marketContext,
    riskQuality,
  });

  return {
    kind: "hermes-reasoning-v1",
    symbol: input.context.symbol,
    pipeline: [...reasoningPipeline],
    marketContext,
    trendQuality,
    marketStructure,
    timeframeAlignment: input.multiTimeframe?.status ?? "Insufficient data",
    institutionalActivity,
    volumeQuality: describeVolume(input),
    momentumCondition: describeMomentum(input),
    newsImpact: input.news?.possibleMarketImpact ?? "No material news context available.",
    volatilityCondition: describeVolatility(input),
    riskQuality,
    traderFit: input.strategy?.currentStrategy.traderDnaFit ?? "Neutral",
    supportingEvidence,
    conflictingEvidence,
    neutralEvidence,
    invalidationConditions,
    confirmationConditions,
    recommendedAction,
    confidenceScore: confidence.finalConfidence,
    confidenceDrivers: supportingEvidence.slice(0, 4).map((item) => item.label),
    confidenceReducers: conflictingEvidence.slice(0, 4).map((item) => item.label),
    confidenceExplanation: confidence,
    tradeReadinessScore: readiness.score,
    readinessState: readiness.state,
    readinessBlockers: readiness.blockers,
    bullCase: scenarios.bullCase,
    bearCase: scenarios.bearCase,
    coachingMessage: buildCoachingMessage({ input, recommendedAction, readinessBlockers: readiness.blockers }),
    reasoningSummary: buildReasoningSummary({
      input,
      marketContext,
      trendQuality,
      riskQuality,
      confidenceScore: confidence.finalConfidence,
      readinessScore: readiness.score,
      supportingEvidence,
      conflictingEvidence,
    }),
    dataState: getDataState(input),
    timestamp,
  };
}

export function createReasoningSnapshot(
  reasoning: ReasoningResult,
  phase: ReasoningSnapshot["phase"] = "Initial Thesis",
): ReasoningSnapshot {
  return {
    id: `${reasoning.symbol}-${reasoning.timestamp}-${phase.replace(/\s+/g, "-").toLowerCase()}`,
    symbol: reasoning.symbol,
    timestamp: reasoning.timestamp,
    phase,
    confidenceScore: reasoning.confidenceScore,
    tradeReadinessScore: reasoning.tradeReadinessScore,
    thesis: reasoning.reasoningSummary,
    marketState: {
      marketContext: reasoning.marketContext,
      marketStructure: reasoning.marketStructure,
      trendQuality: reasoning.trendQuality,
      riskQuality: reasoning.riskQuality,
    },
    evidence: [
      ...reasoning.supportingEvidence,
      ...reasoning.conflictingEvidence,
      ...reasoning.neutralEvidence,
    ],
  };
}

export function calculateReasoningConfidence(evidence: ReasoningEvidence[], input?: ReasoningEngineInput) {
  const baseConfidence = 60;
  const weightedAdjustment = Object.entries(reasoningConfidenceWeights).reduce((sum, [category, weight]) => {
    if (weight === 0) return sum;
    const categoryEvidence = evidence.filter((item) => item.category === category);
    if (categoryEvidence.length === 0) return sum - weight * 0.08;
    const categoryContribution =
      categoryEvidence.reduce((itemSum, item) => itemSum + item.confidenceContribution, 0) /
      categoryEvidence.length;
    return sum + categoryContribution;
  }, 0);
  const dataQualityAdjustment = calculateDataQualityAdjustment(evidence, input);
  const traderDnaAdjustment = evidence
    .filter((item) => item.category === "Trader DNA Fit")
    .reduce((sum, item) => sum + Math.max(-6, Math.min(6, item.confidenceContribution)), 0);
  const finalConfidence = Math.max(
    0,
    Math.min(
      MAX_REASONING_CONFIDENCE,
      Math.round(baseConfidence + weightedAdjustment + dataQualityAdjustment + traderDnaAdjustment),
    ),
  );

  return {
    baseConfidence,
    positiveContributors: evidence.filter((item) => item.confidenceContribution > 0).sort((a, b) => b.confidenceContribution - a.confidenceContribution),
    negativeContributors: evidence.filter((item) => item.confidenceContribution < 0).sort((a, b) => a.confidenceContribution - b.confidenceContribution),
    dataQualityAdjustment,
    traderDnaAdjustment,
    finalConfidence,
  };
}

function calculateTradeReadiness(input: ReasoningEngineInput, evidence: ReasoningEvidence[]) {
  const hasEntry = Boolean(input.plan?.entryPrice ?? input.context.tradeLevels.entry);
  const hasStop = Boolean(input.plan?.stopLoss ?? input.context.tradeLevels.stop);
  const hasTarget = Boolean(input.plan?.takeProfit ?? input.context.tradeLevels.target);
  const rr = input.context.riskReward ?? input.tradeQuality?.riskReward ?? null;
  let score = 45;
  const blockers: string[] = [];

  if (hasEntry) score += 8;
  else blockers.push("Entry is not defined.");
  if (hasStop) score += 12;
  else blockers.push("Stop loss is not defined.");
  if (hasTarget) score += 8;
  else blockers.push("Take profit is not defined.");
  if (rr !== null && rr >= 2) score += 12;
  if (rr !== null && rr < 1) {
    score -= 18;
    blockers.push("Risk/reward is below 1:1.");
  } else if (rr !== null && rr < 2) {
    score -= 8;
    blockers.push("Risk/reward is below Hermes' preferred 2:1 threshold.");
  }
  if (input.news?.urgency === "High") {
    score -= 10;
    blockers.push("High-urgency news can distort execution quality.");
  }
  if (input.context.distanceFromResistance !== null && input.context.distanceFromResistance < 0.01) {
    score -= 8;
    blockers.push("Resistance is close enough to limit reward.");
  }
  if (input.vision.confirmationScore >= 70) score += 8;
  else blockers.push("Confirmation is still developing.");
  if (input.context.volume.status === "Fading") {
    score -= 7;
    blockers.push("Volume participation is weak.");
  }
  if (evidence.some((item) => item.category === "Trader DNA Fit" && item.direction === "Contradictory")) {
    score -= 7;
    blockers.push("Setup conflicts with Trader DNA.");
  }
  const finalScore = clamp(score);

  return {
    score: finalScore,
    state: finalScore >= 85 ? "High-Quality Setup" : finalScore >= 70 ? "Ready With Caution" : finalScore >= 50 ? "Developing" : finalScore >= 30 ? "Incomplete" : "Not Ready",
    blockers: [...new Set(blockers)].slice(0, 5),
  } as const;
}

function classifyMarketContext(input: ReasoningEngineInput): ReasoningMarketContext {
  if (input.news?.urgency === "High") return "Event-Driven";
  if (input.context.averageCandleRange / input.context.currentPrice > 0.025) return "High Volatility";
  if (input.context.volume.current < input.context.volume.average * 0.65) return "Low Liquidity";
  if (input.context.candleTrend === "Bullish" && input.vision.trendScore >= 65) return "Trending Bullish";
  if (input.context.candleTrend === "Bearish" && input.vision.trendScore >= 65) return "Trending Bearish";
  if (input.vision.setupStructureScore < 45) return "Unclear";
  if (input.vision.momentumScore >= 70 && input.context.volume.status === "Rising") return "Expansion";
  if (input.vision.momentumScore < 55 && input.context.volume.status !== "Rising") return "Compression";
  return "Range";
}

function classifyMarketStructure(input: ReasoningEngineInput): ReasoningStructure {
  if (input.footprint?.type === "Liquidity Sweep") return "Liquidity Sweep";
  if (input.footprint?.type === "Accumulation" || input.footprint?.type === "Hidden Buying") return "Accumulation";
  if (input.footprint?.type === "Distribution" || input.footprint?.type === "Hidden Selling") return "Distribution";
  if (input.context.distanceFromSupport !== null && input.context.distanceFromSupport < 0.01) return "Support Hold";
  if (input.context.distanceFromResistance !== null && input.context.distanceFromResistance < 0.01) return "Resistance Rejection";
  if (input.strategy?.currentStrategy.type === "Momentum Breakout") return "Breakout";
  if (input.context.candleTrend === "Bullish") return "Higher Highs and Higher Lows";
  if (input.context.candleTrend === "Bearish") return "Lower Highs and Lower Lows";
  return "No Clear Structure";
}

function classifyTrendQuality(score: number, rsi?: number): ReasoningTrendQuality {
  if (rsi && rsi >= 74) return "Exhausted";
  if (score >= 78) return "Strong";
  if (score >= 62) return "Moderate";
  if (score >= 45) return "Mixed";
  return "Weak";
}

function classifyInstitutionalActivity(input: ReasoningEngineInput): ReasoningInstitutionalActivity {
  const footprint = input.footprint;
  if (!footprint || footprint.type === "No clear institutional footprint") return "Unclear";
  if (footprint.type.includes("Accumulation") || footprint.type.includes("Hidden Buying")) return "Accumulation";
  if (footprint.type.includes("Distribution") || footprint.type.includes("Hidden Selling")) return "Distribution";
  if (footprint.direction === "Bullish" && footprint.strength === "Strong") return "Aggressive Buying";
  if (footprint.direction === "Bearish" && footprint.strength === "Strong") return "Aggressive Selling";
  return "Neutral";
}

function classifyRiskQuality(rr: number | null): ReasoningRiskQuality {
  if (rr === null) return "Average";
  if (rr >= 3) return "Excellent";
  if (rr >= 2) return "Good";
  if (rr >= 1) return "Poor";
  return "Unacceptable";
}

function getRecommendedAction({
  readinessScore,
  confidenceScore,
  input,
}: {
  readinessScore: number;
  confidenceScore: number;
  input: ReasoningEngineInput;
}): ReasoningRecommendedAction {
  if (readinessScore < 30 || confidenceScore < 40) return "Avoid";
  if (readinessScore < 50) return "Observe";
  if (readinessScore < 70) return "Prepare";
  if (confidenceScore >= 72 && readinessScore >= 70) return "Validate";
  return "Wait";
}

function buildReasoningScenarios({
  input,
  confidenceScore,
  marketContext,
  riskQuality,
}: {
  input: ReasoningEngineInput;
  confidenceScore: number;
  marketContext: ReasoningMarketContext;
  riskQuality: ReasoningRiskQuality;
}) {
  const bullishTilt = marketContext.includes("Bullish") || input.footprint?.direction === "Bullish";
  const baseBull = bullishTilt ? 58 : marketContext.includes("Bearish") ? 38 : 50;
  const adjustedBull = clamp(baseBull + Math.round((confidenceScore - 60) * 0.35) + (riskQuality === "Good" || riskQuality === "Excellent" ? 4 : -4));
  const bullProbability = Math.max(15, Math.min(85, adjustedBull));
  const bearProbability = 100 - bullProbability;

  const bullCase: ReasoningScenario = {
    thesis: `${input.context.symbol} can continue higher if structure confirms and participation improves.`,
    supportingConditions: [
      input.multiTimeframe?.mentorSummary ?? "Higher timeframe context remains under review.",
      input.footprint?.explanation ?? "Institutional flow is neutral until stronger evidence appears.",
      input.vision.primaryInsight,
    ],
    trigger: input.strategy?.currentStrategy.nextConfirmation ?? "Break above resistance with volume.",
    invalidation: "Loss of VWAP or the most recent higher low.",
    likelyTargetZone: input.context.tradeLevels.target ? `${input.context.tradeLevels.target.toFixed(2)}` : "Next resistance zone.",
    estimatedProbability: bullProbability,
    majorRisk: input.news?.riskCaution.active ? input.news.riskCaution.message : "Breakout volume may not confirm.",
  };
  const bearCase: ReasoningScenario = {
    thesis: `${input.context.symbol} can weaken if support fails or institutional flow turns defensive.`,
    supportingConditions: [
      input.multiTimeframe?.countertrendWarning ?? "Mixed lower-timeframe conditions can still interrupt the thesis.",
      input.context.volume.status === "Fading" ? "Volume participation is fading." : "Sellers need stronger participation.",
      input.news?.urgency === "High" ? "News risk can increase volatility." : "No major adverse catalyst is confirmed.",
    ],
    trigger: "Break below support or rejection at resistance.",
    invalidation: "Successful retest with improving volume.",
    likelyTargetZone: input.context.tradeLevels.stop ? `${input.context.tradeLevels.stop.toFixed(2)}` : "Prior support zone.",
    estimatedProbability: bearProbability,
    majorRisk: "Counter-move can fail quickly if price reclaims VWAP.",
  };

  return { bullCase, bearCase };
}

function buildConfirmationConditions(input: ReasoningEngineInput, conflictingEvidence: ReasoningEvidence[]) {
  const conditions = [
    input.strategy?.currentStrategy.nextConfirmation,
    input.context.vwap && input.context.currentPrice < input.context.vwap ? "VWAP reclaim with acceptance." : undefined,
    input.context.volume.status !== "Rising" ? "Volume expansion above average." : undefined,
    input.context.distanceFromResistance !== null && input.context.distanceFromResistance < 0.01 ? "Clean break or rejection decision at resistance." : undefined,
    conflictingEvidence.length > 0 ? "Contradictory evidence needs to resolve before execution quality improves." : undefined,
  ];
  return compact(conditions).slice(0, 5);
}

function buildInvalidationConditions(input: ReasoningEngineInput) {
  return compact([
    input.context.vwap ? `1H close below VWAP near ${input.context.vwap.toFixed(2)}.` : "Loss of VWAP.",
    input.context.ema20 ? `Loss of EMA 20 near ${input.context.ema20.toFixed(2)}.` : "Loss of short-term moving average.",
    input.context.tradeLevels.stop ? `Break of planned stop at ${input.context.tradeLevels.stop.toFixed(2)}.` : "Break below the most recent higher low.",
    input.footprint?.direction === "Bullish" ? "Institutional flow turns negative." : "Buying fails to absorb supply.",
    "Selling volume expands above average.",
  ]).slice(0, 5);
}

function buildCoachingMessage({
  input,
  recommendedAction,
  readinessBlockers,
}: {
  input: ReasoningEngineInput;
  recommendedAction: ReasoningRecommendedAction;
  readinessBlockers: string[];
}) {
  const dna = input.memory?.personality ?? input.context.traderDna;
  const blocker = readinessBlockers[0] ?? "wait for confirmation before increasing risk.";
  if (recommendedAction === "Validate") {
    return `This setup is approaching review quality for a ${dna} profile. Validate the plan, then decide whether the risk deserves practice capital.`;
  }
  if (recommendedAction === "Avoid") {
    return `Hermes would protect attention here. The main blocker is: ${blocker}`;
  }
  return `Stay patient. The thesis can be studied, but ${blocker}`;
}

function buildReasoningSummary({
  input,
  marketContext,
  trendQuality,
  riskQuality,
  confidenceScore,
  readinessScore,
  supportingEvidence,
  conflictingEvidence,
}: {
  input: ReasoningEngineInput;
  marketContext: ReasoningMarketContext;
  trendQuality: ReasoningTrendQuality;
  riskQuality: ReasoningRiskQuality;
  confidenceScore: number;
  readinessScore: number;
  supportingEvidence: ReasoningEvidence[];
  conflictingEvidence: ReasoningEvidence[];
}) {
  const support = supportingEvidence[0]?.label.toLowerCase() ?? "some structure is constructive";
  const conflict = conflictingEvidence[0]?.label.toLowerCase() ?? "confirmation is still required";
  return `${input.context.symbol} is currently ${marketContext.toLowerCase()} with ${trendQuality.toLowerCase()} trend quality. Hermes confidence is ${confidenceScore}, supported by ${support}, while ${conflict} keeps trade readiness at ${readinessScore}. Risk quality is ${riskQuality.toLowerCase()}, so the next professional step is confirmation rather than prediction.`;
}

function describeVolume(input: ReasoningEngineInput) {
  const ratio = input.context.volume.average > 0 ? input.context.volume.current / input.context.volume.average : 1;
  if (ratio >= 1.25) return "Expanding above average";
  if (ratio <= 0.75) return "Weak participation";
  return "Normal participation";
}

function describeMomentum(input: ReasoningEngineInput) {
  if (input.context.rsi && input.context.rsi >= 70) return "Elevated RSI";
  if (input.context.macd && input.context.macd.line > input.context.macd.signal) return "MACD improving";
  if (input.context.macd && input.context.macd.line < input.context.macd.signal) return "MACD fading";
  return "Neutral momentum";
}

function describeVolatility(input: ReasoningEngineInput) {
  const pct = (input.context.averageCandleRange / input.context.currentPrice) * 100;
  if (pct >= 2.5) return "High volatility";
  if (pct <= 0.5) return "Compressed volatility";
  return "Normal volatility";
}

function calculateDataQualityAdjustment(evidence: ReasoningEvidence[], input?: ReasoningEngineInput) {
  const missing = evidence.filter((item) => item.id.endsWith("missing")).length;
  const moduleCount = [input?.multiTimeframe, input?.footprint, input?.news, input?.strategy, input?.memory].filter(Boolean).length;
  return Math.max(-10, Math.min(0, -missing * 2 + (moduleCount >= 4 ? 0 : -2)));
}

function getDataState(input: ReasoningEngineInput) {
  if (!input.multiTimeframe || !input.footprint || !input.news || !input.strategy) return "Insufficient Data";
  if (input.previousReasoning && Date.now() - input.previousReasoning.timestamp > 5 * 60 * 1000) return "Stale";
  return "Ready";
}

function compact<T>(values: Array<T | undefined | null | false>) {
  return values.filter(Boolean) as T[];
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
