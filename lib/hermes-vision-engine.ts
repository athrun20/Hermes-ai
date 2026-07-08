import { analyzeChartDrawings } from "@/lib/chart-drawing-analyzer";
import { analyzeTradeLevels } from "@/lib/trade-level-analyzer";
import type {
  HermesVisionAction,
  HermesVisionContext,
  HermesVisionDimensionScore,
  HermesVisionLabel,
  HermesVisionResult,
} from "@/lib/hermes-vision-types";

export function analyzeHermesVision(context: HermesVisionContext): HermesVisionResult {
  const drawing = analyzeChartDrawings(context);
  const trade = analyzeTradeLevels(context, drawing);
  const reasons: string[] = [];
  const labels: HermesVisionLabel[] = [];
  let confidenceAdjustment = 0;

  if (drawing.supportAlignsWithEma20 || drawing.supportAlignsWithVwap) {
    const line = drawing.supportAlignsWithEma20 ? "EMA 20" : "VWAP";
    reasons.push(`Support aligns with ${line}. This improves the structure of the plan.`);
    labels.push({
      id: "support-confirmed",
      text: "Support confirmed",
      tone: "mint",
      price: drawing.nearestSupport?.price,
      priority: 30,
    });
    confidenceAdjustment += drawing.supportAlignsWithEma20 ? 8 : 6;
  }

  if (drawing.targetNearResistance) {
    reasons.push("Resistance is close to your target. Reward may be limited.");
    labels.push({
      id: "target-near-resistance",
      text: "Target near resistance",
      tone: "gold",
      price: drawing.nearestResistance?.price,
      priority: 90,
    });
    confidenceAdjustment -= 12;
  } else if (trade.targetIsClear) {
    reasons.push("Target is not blocked by nearby resistance. The reward path is cleaner.");
    confidenceAdjustment += 6;
  }

  if (trade.stopInsideNormalVolatility || trade.stopInsideSupport) {
    reasons.push("Your stop is inside normal volatility. Consider placing it below support.");
    labels.push({
      id: "stop-too-tight",
      text: "Stop too tight",
      tone: "danger",
      price: context.tradeLevels.stop,
      priority: 100,
    });
    confidenceAdjustment -= trade.stopInsideSupport ? 10 : 8;
  }

  if (drawing.entryExtendedFromVwap) {
    reasons.push("Entry is extended above VWAP. Waiting for a pullback may improve the plan.");
    labels.push({
      id: "entry-extended",
      text: "Entry extended",
      tone: "gold",
      price: context.tradeLevels.entry,
      priority: 80,
    });
    confidenceAdjustment -= 8;
  }

  if (trade.riskRewardIsWeak) {
    reasons.push("Target produces less than 2:1 reward. The plan needs better reward or lower risk.");
    labels.push({
      id: "risk-elevated",
      text: "Risk elevated",
      tone: "danger",
      price: context.tradeLevels.target ?? context.tradeLevels.entry,
      priority: 95,
    });
    confidenceAdjustment -= 15;
  } else if (context.riskReward !== null && context.riskReward >= 2) {
    reasons.push("Risk/reward is 2:1 or better. The plan has a workable reward profile.");
    confidenceAdjustment += 5;
  }

  const trendConstructive = isTrendConstructive(context);
  if (!trendConstructive) {
    reasons.push("Trend remains mixed. Confirmation is incomplete.");
    labels.push({
      id: "wait-confirmation",
      text: "Wait for confirmation",
      tone: "gold",
      price: context.currentPrice,
      priority: 70,
    });
  }

  if (reasons.length === 0) {
    reasons.push("The chart is readable. Define the plan before asking Hermes for decision review.");
  }

  const structureDimension = analyzeStructureDimension(context, drawing);
  const trendDimension = analyzeTrendDimension(context, trendConstructive);
  const momentumDimension = analyzeMomentumDimension(context);
  const volumeDimension = analyzeVolumeDimension(context);
  const riskDimension = analyzeRiskDimension(context, trade);
  const confirmationDimension = analyzeConfirmationDimension({
    context,
    trendConstructive,
    momentumScore: momentumDimension.score,
    volumeScore: volumeDimension.score,
  });
  const dimensions = [
    structureDimension,
    trendDimension,
    momentumDimension,
    volumeDimension,
    confirmationDimension,
    riskDimension,
  ];
  const setupStructureScore = structureDimension.score;
  const trendScore = trendDimension.score;
  const momentumScore = momentumDimension.score;
  const volumeScore = volumeDimension.score;
  const riskScore = riskDimension.score;
  const confirmationScore = confirmationDimension.score;
  const suggestedAction = getSuggestedAction({
    hasCompletePlan: trade.hasCompletePlan,
    riskScore,
    setupStructureScore,
    confirmationScore,
    stopIssue: trade.stopInsideNormalVolatility || trade.stopInsideSupport,
    weakRiskReward: trade.riskRewardIsWeak,
    entryExtended: drawing.entryExtendedFromVwap,
  });

  return {
    kind: "hermes-vision",
    symbol: context.symbol,
    primaryInsight: buildPrimaryInsight({
      context,
      suggestedAction,
      reason: reasons[0],
      dimensions,
    }),
    setupStructureScore,
    trendScore,
    momentumScore,
    volumeScore,
    riskScore,
    confirmationScore,
    confidenceAdjustment: clamp(confidenceAdjustment, -30, 24),
    suggestedAction,
    labels: labels.sort((a, b) => b.priority - a.priority).slice(0, 3),
    reasons: buildVisionReasons(reasons, dimensions),
    dimensions,
    caution: {
      active: trade.riskRewardIsWeak || trade.stopInsideNormalVolatility || drawing.entryExtendedFromVwap,
      message: trade.riskRewardIsWeak
        ? "Hermes Vision sees weak risk/reward. Improve the plan before execution."
        : trade.stopInsideNormalVolatility
          ? "Hermes Vision sees a tight stop inside normal candle noise."
          : drawing.entryExtendedFromVwap
            ? "Hermes Vision sees an extended entry. Patience may improve the plan."
            : "",
    },
  };
}

function analyzeStructureDimension(
  context: HermesVisionContext,
  drawing: ReturnType<typeof analyzeChartDrawings>,
): HermesVisionDimensionScore {
  let score = 50;
  const reasons: string[] = [];

  if (drawing.supportAlignsWithEma20) score += 14;
  if (drawing.supportAlignsWithEma20) reasons.push("Support is close to EMA 20.");
  if (drawing.supportAlignsWithVwap) {
    score += 10;
    reasons.push("Support also respects VWAP.");
  }
  if (drawing.hasTrendStructure) {
    score += 8;
    reasons.push("A trend line gives Hermes more structure to read.");
  }
  if (context.resistanceZones.length > 0 || context.horizontalLines.some((line) => line.price > context.currentPrice)) {
    score += 6;
    reasons.push("Resistance is marked, so the reward path is visible.");
  }
  if (drawing.entryExtendedFromVwap) {
    score -= 10;
    reasons.push("Entry is stretched from VWAP.");
  }
  if (reasons.length === 0) reasons.push("Structure is still developing because few meaningful levels are marked.");
  return buildDimension("Structure", score, reasons);
}

function analyzeTrendDimension(
  context: HermesVisionContext,
  trendConstructive: boolean,
): HermesVisionDimensionScore {
  let score = 50;
  const reasons: string[] = [];

  if (trendConstructive) {
    score += 18;
    reasons.push("EMA structure agrees with the current candle trend.");
  } else {
    score -= 16;
    reasons.push("EMA structure conflicts with the current candle trend.");
  }
  if (context.candleTrend === "Bullish" || context.candleTrend === "Bearish") {
    score += 8;
    reasons.push(`Candles show a ${context.candleTrend.toLowerCase()} short-term read.`);
  } else {
    reasons.push("Candles are consolidating, so trend conviction is lower.");
  }
  if (context.trendLines.length > 0) {
    score += 8;
    reasons.push("The trader marked trend structure on the chart.");
  }
  return buildDimension("Trend", score, reasons);
}

function analyzeMomentumDimension(context: HermesVisionContext): HermesVisionDimensionScore {
  let score = 50;
  const reasons: string[] = [];
  const histogram = context.macd?.histogram ?? 0;

  if (context.rsi && context.rsi > 38 && context.rsi < 68) {
    score += 10;
    reasons.push("RSI is in a workable middle range.");
  } else if (context.rsi && context.rsi >= 68) {
    score -= 8;
    reasons.push("RSI is elevated, so chasing is lower quality.");
  } else if (context.rsi && context.rsi <= 38) {
    score -= 6;
    reasons.push("RSI is compressed and needs confirmation.");
  }
  if (Math.abs(histogram) > 0.2) {
    score += 10;
    reasons.push("MACD histogram shows momentum is present.");
  } else {
    reasons.push("MACD momentum is still muted.");
  }
  if (context.macd && context.macd.line > context.macd.signal) {
    score += 5;
    reasons.push("MACD line is above signal.");
  }
  return buildDimension("Momentum", score, reasons);
}

function analyzeVolumeDimension(context: HermesVisionContext): HermesVisionDimensionScore {
  let score = 50;
  const reasons: string[] = [];

  if (context.volume.status === "Rising") {
    score += 22;
    reasons.push("Volume is rising above its recent average.");
  } else if (context.volume.status === "Fading") {
    score -= 16;
    reasons.push("Volume is fading, so confirmation is weaker.");
  } else {
    score += 4;
    reasons.push("Volume is normal, not confirming aggressively.");
  }
  return buildDimension("Volume", score, reasons);
}

function analyzeRiskDimension(
  context: HermesVisionContext,
  trade: ReturnType<typeof analyzeTradeLevels>,
): HermesVisionDimensionScore {
  if (!trade.hasCompletePlan) {
    return buildDimension("Risk", 42, ["Entry, stop, and target are not all defined yet."]);
  }

  const reasons: string[] = [];
  let score = 56;
  if (context.riskReward !== null) score += Math.min(24, context.riskReward * 8);
  if (context.riskReward !== null) reasons.push(`Risk/reward is ${context.riskReward.toFixed(2)}:1.`);
  if (trade.riskRewardIsWeak) {
    score -= 24;
    reasons.push("Reward is below the 2:1 planning threshold.");
  }
  if (trade.stopInsideNormalVolatility) {
    score -= 14;
    reasons.push("Stop sits inside normal candle volatility.");
  }
  if (trade.stopInsideSupport) {
    score -= 10;
    reasons.push("Stop is too close to support structure.");
  }
  if (trade.targetIsClear) {
    score += 8;
    reasons.push("Target is not blocked by nearby resistance.");
  }
  return buildDimension("Risk", score, reasons);
}

function analyzeConfirmationDimension({
  context,
  trendConstructive,
  momentumScore,
  volumeScore,
}: {
  context: HermesVisionContext;
  trendConstructive: boolean;
  momentumScore: number;
  volumeScore: number;
}): HermesVisionDimensionScore {
  let score = 45;
  const reasons: string[] = [];
  if (trendConstructive) score += 18;
  if (trendConstructive) reasons.push("Trend structure supports the current read.");
  if (context.volume.status === "Rising") {
    score += 12;
    reasons.push("Volume supports confirmation.");
  }
  if (context.macd && Math.abs(context.macd.histogram) > 0.2) {
    score += 8;
    reasons.push("MACD adds confirmation.");
  }
  if (context.rsi && context.rsi > 38 && context.rsi < 68) {
    score += 8;
    reasons.push("RSI is not at an emotional extreme.");
  }
  if (context.volume.status === "Fading") {
    score -= 12;
    reasons.push("Fading volume reduces confirmation.");
  }
  if (momentumScore < 50 || volumeScore < 50) reasons.push("Momentum or volume still needs improvement.");
  return buildDimension("Confirmation", score, reasons);
}

function isTrendConstructive(context: HermesVisionContext) {
  if (!context.ema20 || !context.ema50) return true;
  if (context.candleTrend === "Bullish") return context.ema20 >= context.ema50;
  if (context.candleTrend === "Bearish") return context.ema20 <= context.ema50;
  return Math.abs(context.ema20 - context.ema50) / context.currentPrice < 0.01;
}

function getSuggestedAction({
  hasCompletePlan,
  riskScore,
  setupStructureScore,
  confirmationScore,
  stopIssue,
  weakRiskReward,
  entryExtended,
}: {
  hasCompletePlan: boolean;
  riskScore: number;
  setupStructureScore: number;
  confirmationScore: number;
  stopIssue: boolean;
  weakRiskReward: boolean;
  entryExtended: boolean;
}) {
  if (stopIssue) return "Move Stop Below Support";
  if (weakRiskReward || riskScore < 50) return "Improve Risk/Reward";
  if (entryExtended || confirmationScore < 55) return "Wait for Confirmation";
  if (hasCompletePlan && riskScore >= 65 && setupStructureScore >= 60 && confirmationScore >= 55) {
    return "Ready for Decision Review";
  }
  if (setupStructureScore >= 55) return "Study Setup";
  return "Observe Only";
}

function buildPrimaryInsight({
  context,
  suggestedAction,
  reason,
  dimensions,
}: {
  context: HermesVisionContext;
  suggestedAction: HermesVisionAction;
  reason: string;
  dimensions: HermesVisionDimensionScore[];
}) {
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0];

  if (suggestedAction === "Ready for Decision Review") {
    return `${context.symbol} has a defined paper plan. ${strongest.dimension.toLowerCase()} is leading, and risk is acceptable. ${reason}`;
  }

  if (context.dailyGoal.toLowerCase().includes("confirmation")) {
    return `${reason} Today's goal favors confirmation over speed, and ${weakest.dimension.toLowerCase()} needs the most attention.`;
  }

  if (context.traderDna.toLowerCase().includes("patient")) {
    return `${reason} This fits your patient process only if ${weakest.dimension.toLowerCase()} improves.`;
  }

  return `${reason} Hermes is watching ${weakest.dimension.toLowerCase()} most closely.`;
}

function buildVisionReasons(
  eventReasons: string[],
  dimensions: HermesVisionDimensionScore[],
) {
  const dimensionReasons = dimensions.flatMap((dimension) =>
    dimension.reasons.slice(0, 1).map((reason) => `${dimension.dimension}: ${reason}`),
  );
  return [...eventReasons, ...dimensionReasons].slice(0, 10);
}

function buildDimension(
  dimension: HermesVisionDimensionScore["dimension"],
  rawScore: number,
  reasons: string[],
): HermesVisionDimensionScore {
  const score = clamp(rawScore, 0, 100);
  return {
    dimension,
    score,
    verdict: getVerdict(score),
    reasons,
  };
}

function getVerdict(score: number): HermesVisionDimensionScore["verdict"] {
  if (score >= 78) return "Strong";
  if (score >= 64) return "Constructive";
  if (score >= 48) return "Developing";
  if (score <= 0) return "Undefined";
  return "Weak";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
