import type { MarketCandidate, TraderDnaMatch } from "@/lib/opportunity-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";
import type {
  HermesScoreBreakdownItem,
  HermesScoreCategory,
  HermesScoreLabel,
  HermesScoreResult,
  HermesScoreStatus,
} from "@/lib/hermes-score-types";

export function calculateHermesScore({
  context,
  vision,
  multiTimeframe,
  footprint,
  tradeQuality,
}: {
  context: HermesVisionContext;
  vision: HermesVisionResult;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
  tradeQuality?: TradeQualityResult;
}): HermesScoreResult {
  if (tradeQuality) {
    return {
      symbol: tradeQuality.symbol,
      score: tradeQuality.score,
      label: getHermesScoreLabel(tradeQuality.score),
      explanation: tradeQuality.summary,
      breakdown: tradeQuality.breakdown.map((item) => ({
        category: item.category === "Multi-Timeframe Alignment"
          ? "Timeframe Alignment"
          : item.category === "News Context"
            ? "Confirmation"
            : item.category === "Institutional Footprint"
              ? "Institutional Footprint"
              : isHermesCategory(item.category)
                ? item.category
                : "Risk",
        score: item.percentage,
        status: item.status === "Needs Work" ? "Developing" : item.status,
        reason: item.reason,
      })),
    };
  }

  const trend = scoreTrend(context);
  const momentum = scoreMomentum(context, vision.momentumScore);
  const volume = buildItem("Volume", vision.volumeScore, vision.dimensions.find((item) => item.dimension === "Volume")?.reasons[0] ?? "Volume context is being evaluated.");
  const structure = buildItem("Structure", vision.setupStructureScore, vision.dimensions.find((item) => item.dimension === "Structure")?.reasons[0] ?? "Structure depends on marked levels and moving averages.");
  const risk = scoreRisk(context, vision.riskScore);
  const confirmation = buildItem("Confirmation", vision.confirmationScore, vision.dimensions.find((item) => item.dimension === "Confirmation")?.reasons[0] ?? "Confirmation combines trend, momentum, and participation.");
  const traderFit = scoreTraderFit(context);
  const timeframeAlignment = multiTimeframe
    ? buildItem("Timeframe Alignment", multiTimeframe.alignmentScore + multiTimeframe.alignmentImpact, `${multiTimeframe.mentorSummary} Alignment impact: ${multiTimeframe.alignmentImpact >= 0 ? "+" : ""}${multiTimeframe.alignmentImpact}.`)
    : null;
  const footprintItem = footprint
    ? buildItem("Institutional Footprint", footprint.confidence + footprint.confidenceImpact, `${footprint.explanation} Footprint impact: ${footprint.confidenceImpact >= 0 ? "+" : ""}${footprint.confidenceImpact}.`)
    : null;
  const hasContext = Boolean(multiTimeframe || footprint);
  const breakdown = [
    trend,
    momentum,
    volume,
    structure,
    risk,
    confirmation,
    traderFit,
    ...(timeframeAlignment ? [timeframeAlignment] : []),
    ...(footprintItem ? [footprintItem] : []),
  ];
  const score = weightedAverage(breakdown, {
    Trend: hasContext ? 0.13 : 0.16,
    Momentum: hasContext ? 0.11 : 0.14,
    Volume: hasContext ? 0.1 : 0.12,
    Structure: hasContext ? 0.13 : 0.16,
    Risk: hasContext ? 0.15 : 0.18,
    Confirmation: hasContext ? 0.11 : 0.14,
    "Trader Fit": hasContext ? 0.07 : 0.1,
    "Timeframe Alignment": multiTimeframe ? 0.1 : 0,
    "Institutional Footprint": footprint ? 0.1 : 0,
  });
  const label = getHermesScoreLabel(score);

  return {
    symbol: context.symbol,
    score,
    label,
    explanation: buildExplanation(score, label, breakdown),
    breakdown,
  };
}

export function calculateOpportunityHermesScore({
  candidate,
  confidence,
  traderDnaMatch,
}: {
  candidate: MarketCandidate;
  confidence: number;
  traderDnaMatch: TraderDnaMatch;
}): HermesScoreResult {
  const trend = buildItem(
    "Trend",
    candidate.trend === "Bullish" ? 82 : candidate.trend === "Neutral" ? 58 : 42,
    candidate.trend === "Bullish" ? "Trend is constructive for study." : "Trend needs more confirmation.",
  );
  const momentum = buildItem("Momentum", candidate.momentumScore, "Momentum score comes from the mock opportunity engine.");
  const volume = buildItem(
    "Volume",
    candidate.volumeTrend === "Increasing" ? 78 : candidate.volumeTrend === "Stable" ? 58 : 38,
    candidate.volumeTrend === "Increasing" ? "Volume is improving." : "Volume is not strongly confirming yet.",
  );
  const structure = buildItem(
    "Structure",
    candidate.supportHeld ? 74 : 48,
    candidate.supportHeld ? "Support recently held." : "Support still needs proof.",
  );
  const risk = buildItem(
    "Risk",
    candidate.riskLevel === "Low" ? 82 : candidate.riskLevel === "Medium" ? 62 : 38,
    candidate.riskLevel === "High" ? "Risk is elevated for a beginner plan." : "Risk is manageable for study.",
  );
  const confirmation = buildItem("Confirmation", confidence, "Confirmation uses the opportunity confidence model.");
  const traderFit = buildItem(
    "Trader Fit",
    traderDnaMatch === "Excellent Match" ? 86 : traderDnaMatch === "Moderate Match" ? 66 : 42,
    `${traderDnaMatch} with current Trader DNA.`,
  );
  const breakdown = [trend, momentum, volume, structure, risk, confirmation, traderFit];
  const score = weightedAverage(breakdown, {
    Trend: 0.16,
    Momentum: 0.14,
    Volume: 0.12,
    Structure: 0.16,
    Risk: 0.18,
    Confirmation: 0.14,
    "Trader Fit": 0.1,
    "Timeframe Alignment": 0,
    "Institutional Footprint": 0,
  });
  const label = getHermesScoreLabel(score);

  return {
    symbol: candidate.ticker,
    score,
    label,
    explanation: buildExplanation(score, label, breakdown),
    breakdown,
  };
}

export function getHermesScoreLabel(score: number): HermesScoreLabel {
  if (score >= 90) return "Elite Setup";
  if (score >= 80) return "High Quality";
  if (score >= 70) return "Worth Studying";
  if (score >= 60) return "Needs Confirmation";
  if (score >= 40) return "Weak Setup";
  return "Avoid";
}

function scoreTrend(context: HermesVisionContext) {
  let score = context.candleTrend === "Bullish" ? 64 : context.candleTrend === "Bearish" ? 46 : 54;
  const reasons: string[] = [`Candles read ${context.candleTrend.toLowerCase()}.`];

  if (context.ema20 && context.ema50) {
    if (context.ema20 >= context.ema50) {
      score += 14;
      reasons.push("EMA 20 is above EMA 50.");
    } else {
      score -= 12;
      reasons.push("EMA 20 is below EMA 50.");
    }
  }

  if (context.vwap) {
    if (context.currentPrice >= context.vwap) {
      score += 8;
      reasons.push("Price is above VWAP.");
    } else {
      score -= 8;
      reasons.push("Price is below VWAP.");
    }
  }

  return buildItem("Trend", score, reasons.join(" "));
}

function scoreMomentum(context: HermesVisionContext, fallbackScore: number) {
  let score = fallbackScore;
  const reasons: string[] = [];
  if (context.rsi) {
    if (context.rsi > 42 && context.rsi < 66) {
      score += 6;
      reasons.push("RSI is constructive without being stretched.");
    } else if (context.rsi >= 70) {
      score -= 10;
      reasons.push("RSI is stretched.");
    } else {
      reasons.push("RSI needs confirmation.");
    }
  }
  if (context.macd) {
    if (context.macd.line > context.macd.signal) {
      score += 6;
      reasons.push("MACD line is above signal.");
    } else {
      score -= 4;
      reasons.push("MACD has not confirmed yet.");
    }
  }
  return buildItem("Momentum", score, reasons.join(" ") || "Momentum is mixed.");
}

function scoreRisk(context: HermesVisionContext, fallbackScore: number) {
  let score = fallbackScore;
  const reasons: string[] = [];
  if (context.riskReward !== null) {
    if (context.riskReward >= 3) {
      score += 8;
      reasons.push(`Risk/reward is strong at ${context.riskReward.toFixed(2)}:1.`);
    } else if (context.riskReward >= 2) {
      reasons.push(`Risk/reward meets the minimum at ${context.riskReward.toFixed(2)}:1.`);
    } else {
      score -= 18;
      reasons.push(`Risk/reward is below 2:1 at ${context.riskReward.toFixed(2)}:1.`);
    }
  } else {
    score -= 10;
    reasons.push("Entry, stop, or target is incomplete.");
  }
  if (context.distanceFromResistance !== null && context.distanceFromResistance < 0.01) {
    score -= 8;
    reasons.push("Target path may be crowded by nearby resistance.");
  }
  return buildItem("Risk", score, reasons.join(" "));
}

function scoreTraderFit(context: HermesVisionContext) {
  let score = 62;
  const goal = context.dailyGoal.toLowerCase();
  const trader = context.traderDna.toLowerCase();
  const reasons: string[] = [];
  if (trader.includes("patient") || trader.includes("strategist") || trader.includes("momentum")) {
    score += 10;
    reasons.push(`${context.traderDna} can study this setup with discipline.`);
  }
  if (goal.includes("confirmation") && context.tradeLevels.entry && context.tradeLevels.stop && context.tradeLevels.target) {
    score += 10;
    reasons.push("Daily goal is respected by a defined plan.");
  } else if (goal.includes("confirmation")) {
    score -= 8;
    reasons.push("Daily goal asks for confirmation before risk.");
  } else {
    reasons.push("Daily goal does not conflict with this study.");
  }
  return buildItem("Trader Fit", score, reasons.join(" "));
}

function buildItem(category: HermesScoreCategory, rawScore: number, reason: string): HermesScoreBreakdownItem {
  const score = clamp(rawScore);
  return {
    category,
    score,
    status: getStatus(score),
    reason,
  };
}

function getStatus(score: number): HermesScoreStatus {
  if (score >= 78) return "Strong";
  if (score >= 64) return "Constructive";
  if (score >= 48) return "Developing";
  return "Weak";
}

function weightedAverage(
  breakdown: HermesScoreBreakdownItem[],
  weights: Record<HermesScoreCategory, number>,
) {
  const total = breakdown.reduce((sum, item) => sum + item.score * weights[item.category], 0);
  const totalWeight = breakdown.reduce((sum, item) => sum + weights[item.category], 0);
  return clamp(Math.round(total / Math.max(0.01, totalWeight)));
}

function buildExplanation(score: number, label: HermesScoreLabel, breakdown: HermesScoreBreakdownItem[]) {
  const strongest = [...breakdown].sort((a, b) => b.score - a.score)[0];
  const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0];
  return `Hermes scores this setup ${score} because ${strongest.category.toLowerCase()} is ${strongest.status.toLowerCase()}, but ${weakest.category.toLowerCase()} still ${weakest.status === "Weak" ? "needs work" : "needs confirmation"}. Rating: ${label}.`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isHermesCategory(value: string): value is HermesScoreCategory {
  return [
    "Trend",
    "Momentum",
    "Volume",
    "Structure",
    "Risk",
    "Confirmation",
    "Trader Fit",
    "Timeframe Alignment",
    "Institutional Footprint",
  ].includes(value);
}
