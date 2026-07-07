import { analyzeChartDrawings } from "@/lib/chart-drawing-analyzer";
import { analyzeTradeLevels } from "@/lib/trade-level-analyzer";
import type {
  HermesVisionAction,
  HermesVisionContext,
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

  const setupStructureScore = scoreStructure(context, drawing);
  const riskScore = scoreRisk(context, trade);
  const confirmationScore = scoreConfirmation(context, trendConstructive);
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
    }),
    setupStructureScore,
    riskScore,
    confirmationScore,
    confidenceAdjustment: clamp(confidenceAdjustment, -30, 24),
    suggestedAction,
    labels: labels.sort((a, b) => b.priority - a.priority).slice(0, 3),
    reasons: reasons.slice(0, 6),
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

function scoreStructure(context: HermesVisionContext, drawing: ReturnType<typeof analyzeChartDrawings>) {
  let score = 50;
  if (drawing.supportAlignsWithEma20) score += 14;
  if (drawing.supportAlignsWithVwap) score += 10;
  if (drawing.hasTrendStructure) score += 8;
  if (context.resistanceZones.length > 0 || context.horizontalLines.some((line) => line.price > context.currentPrice)) score += 6;
  if (drawing.entryExtendedFromVwap) score -= 10;
  return clamp(score, 0, 100);
}

function scoreRisk(context: HermesVisionContext, trade: ReturnType<typeof analyzeTradeLevels>) {
  if (!trade.hasCompletePlan) return 42;

  let score = 56;
  if (context.riskReward !== null) score += Math.min(24, context.riskReward * 8);
  if (trade.riskRewardIsWeak) score -= 24;
  if (trade.stopInsideNormalVolatility) score -= 14;
  if (trade.stopInsideSupport) score -= 10;
  if (trade.targetIsClear) score += 8;
  return clamp(Math.round(score), 0, 100);
}

function scoreConfirmation(context: HermesVisionContext, trendConstructive: boolean) {
  let score = 45;
  if (trendConstructive) score += 18;
  if (context.volume.status === "Rising") score += 12;
  if (context.macd && Math.abs(context.macd.histogram) > 0.2) score += 8;
  if (context.rsi && context.rsi > 38 && context.rsi < 68) score += 8;
  if (context.volume.status === "Fading") score -= 12;
  return clamp(score, 0, 100);
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
}: {
  context: HermesVisionContext;
  suggestedAction: HermesVisionAction;
  reason: string;
}) {
  if (suggestedAction === "Ready for Decision Review") {
    return `${context.symbol} has a defined paper plan. ${reason}`;
  }

  if (context.dailyGoal.toLowerCase().includes("confirmation")) {
    return `${reason} Today's goal favors confirmation over speed.`;
  }

  if (context.traderDna.toLowerCase().includes("patient")) {
    return `${reason} This fits your patient process only if the structure stays clean.`;
  }

  return reason;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
