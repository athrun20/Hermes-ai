import { tradeQualityWeights } from "@/lib/trade-quality-config";
import type {
  TradeQualityBreakdownItem,
  TradeQualityCategory,
  TradeQualityContext,
  TradeQualityStatus,
} from "@/lib/trade-quality-types";

export function buildTradeQualityBreakdown(context: TradeQualityContext): TradeQualityBreakdownItem[] {
  const riskReward = calculateTradeQualityRiskReward(context);
  const planCompleteness = calculatePlanCompleteness(context);
  const categories: Array<[TradeQualityCategory, number, string]> = [
    ["Trend", context.vision.trendScore, context.vision.dimensions.find((item) => item.dimension === "Trend")?.reasons[0] ?? "Trend is read from candles and moving averages."],
    ["Momentum", context.vision.momentumScore, context.vision.dimensions.find((item) => item.dimension === "Momentum")?.reasons[0] ?? "Momentum uses RSI and MACD context."],
    ["Volume", context.vision.volumeScore, context.vision.dimensions.find((item) => item.dimension === "Volume")?.reasons[0] ?? "Volume confirmation is being evaluated."],
    ["Structure", context.reasoning ? average(context.vision.setupStructureScore, context.reasoning.tradeReadinessScore) : context.vision.setupStructureScore, context.reasoning?.reasoningSummary ?? context.vision.dimensions.find((item) => item.dimension === "Structure")?.reasons[0] ?? "Structure depends on support, resistance, and trend context."],
    ["Multi-Timeframe Alignment", context.multiTimeframe.alignmentScore + context.multiTimeframe.alignmentImpact, context.multiTimeframe.mentorSummary],
    ["Institutional Footprint", context.footprint.confidence + context.footprint.confidenceImpact, context.footprint.explanation],
    ["News Context", scoreNews(context), context.news.hermesInterpretation],
    ["Entry Quality", scoreEntry(context), entryReason(context)],
    ["Stop Quality", scoreStop(context), stopReason(context)],
    ["Target Quality", scoreTarget(context), targetReason(context)],
    ["Risk / Reward", context.reasoning ? average(scoreRiskReward(riskReward), riskQualityToScore(context.reasoning.riskQuality)) : scoreRiskReward(riskReward), context.reasoning ? `${context.reasoning.riskQuality} risk quality. ${riskRewardReason(riskReward)}` : riskRewardReason(riskReward)],
    ["Position Size", scorePositionSize(context), positionSizeReason(context)],
    ["Strategy Fit", context.reasoning ? average(context.strategy.currentStrategy.score, context.reasoning.confidenceScore) : context.strategy.currentStrategy.score, `${context.strategy.currentStrategy.type} is ${context.strategy.currentStrategy.quality.toLowerCase()} for current conditions.`],
    ["Trader DNA Fit", context.reasoning?.traderFit === "Aligned" ? 85 : context.reasoning?.traderFit === "Poor Fit" ? 35 : context.strategy.currentStrategy.traderDnaFit === "Aligned" ? 85 : context.strategy.currentStrategy.traderDnaFit === "Poor Fit" ? 35 : 62, context.reasoning ? context.reasoning.coachingMessage : `Trader DNA fit is ${context.strategy.currentStrategy.traderDnaFit.toLowerCase()}.`],
    ["Daily Goal Alignment", context.dailyGoal.toLowerCase().includes("confirmation") && planCompleteness < 100 ? 45 : 75, `Daily goal: ${context.dailyGoal}`],
    ["Plan Completeness", planCompleteness, `${planCompleteness}% of required plan fields are defined.`],
  ];

  return categories.map(([category, score, reason]) => toBreakdownItem(category, score, reason));
}

export function calculateTradeQualityRiskReward(context: TradeQualityContext) {
  const { entryPrice, stopLoss, takeProfit, side } = context.plan;
  const entry = entryPrice ?? context.price;
  if (!entryPrice || !stopLoss || !takeProfit) return null;
  const risk = side === "Long" ? entry - stopLoss : stopLoss - entry;
  const reward = side === "Long" ? takeProfit - entry : entry - takeProfit;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

export function calculatePlanCompleteness(context: TradeQualityContext) {
  const required = [
    context.plan.entryPrice,
    context.plan.stopLoss,
    context.plan.takeProfit,
    context.plan.notional > 0 ? context.plan.notional : undefined,
  ];
  return Math.round((required.filter(Boolean).length / required.length) * 100);
}

function toBreakdownItem(category: TradeQualityCategory, rawScore: number, reason: string): TradeQualityBreakdownItem {
  const max = tradeQualityWeights[category];
  const percentage = clamp(rawScore);
  return {
    category,
    earned: Math.round((percentage / 100) * max),
    max,
    percentage,
    status: statusFor(percentage),
    reason,
  };
}

function scoreNews(context: TradeQualityContext) {
  if (context.news.urgency === "High" && context.news.sentiment === "Negative") return 35;
  if (context.news.urgency === "High") return 55;
  if (context.news.sentiment === "Positive") return 72;
  if (context.news.sentiment === "Negative") return 50;
  return 68;
}

function scoreEntry(context: TradeQualityContext) {
  if (!context.plan.entryPrice) return 20;
  const distance = Math.abs(context.plan.entryPrice - context.price) / context.price;
  if (distance <= 0.004) return 78;
  if (distance <= 0.012) return 65;
  return 48;
}

function entryReason(context: TradeQualityContext) {
  if (!context.plan.entryPrice) return "Entry is missing, so Hermes cannot judge whether price offers discipline.";
  return "Entry is defined and can be compared against current structure.";
}

function scoreStop(context: TradeQualityContext) {
  if (!context.plan.stopLoss) return 10;
  const entry = context.plan.entryPrice ?? context.price;
  const risk = Math.abs(entry - context.plan.stopLoss);
  if (risk <= 0) return 20;
  if (risk < context.visionContext.averageCandleRange * 0.65) return 42;
  return 76;
}

function stopReason(context: TradeQualityContext) {
  if (!context.plan.stopLoss) return "Stop loss is missing.";
  const entry = context.plan.entryPrice ?? context.price;
  const risk = Math.abs(entry - context.plan.stopLoss);
  if (risk < context.visionContext.averageCandleRange * 0.65) return "Stop may sit inside normal candle noise.";
  return "Stop is defined outside the tightest noise zone.";
}

function scoreTarget(context: TradeQualityContext) {
  if (!context.plan.takeProfit) return 15;
  return 72;
}

function targetReason(context: TradeQualityContext) {
  if (!context.plan.takeProfit) return "Take profit is missing.";
  return "Target is defined, allowing reward to be measured.";
}

function scoreRiskReward(value: number | null) {
  if (value === null) return 25;
  if (value >= 3) return 90;
  if (value >= 2) return 76;
  if (value >= 1) return 52;
  return 25;
}

function riskQualityToScore(value: NonNullable<TradeQualityContext["reasoning"]>["riskQuality"]) {
  if (value === "Excellent") return 90;
  if (value === "Good") return 78;
  if (value === "Average") return 58;
  if (value === "Poor") return 42;
  return 20;
}

function average(a: number, b: number) {
  return Math.round((a + b) / 2);
}

function riskRewardReason(value: number | null) {
  if (value === null) return "Risk/reward cannot be measured until entry, stop, and target are defined.";
  if (value >= 2) return `Risk/reward is acceptable at ${value.toFixed(2)}:1.`;
  return `Risk/reward is only ${value.toFixed(2)}:1, below Hermes' preferred 2:1 threshold.`;
}

function scorePositionSize(context: TradeQualityContext) {
  if (!context.portfolio) return 70;
  const pct = (context.plan.notional / Math.max(1, context.portfolio.equity)) * 100;
  if (pct <= 10) return 85;
  if (pct <= 20) return 65;
  return 35;
}

function positionSizeReason(context: TradeQualityContext) {
  if (!context.portfolio) return "Portfolio context is unavailable, so sizing receives a neutral read.";
  const pct = (context.plan.notional / Math.max(1, context.portfolio.equity)) * 100;
  return `Paper position uses ${pct.toFixed(1)}% of account equity.`;
}

function statusFor(score: number): TradeQualityStatus {
  if (score >= 78) return "Strong";
  if (score >= 62) return "Constructive";
  if (score >= 45) return "Needs Work";
  return "Weak";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
