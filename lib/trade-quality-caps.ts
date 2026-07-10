import { tradeQualityCaps } from "@/lib/trade-quality-config";
import type { TradeQualityCap, TradeQualityContext } from "@/lib/trade-quality-types";
import { calculatePlanCompleteness, calculateTradeQualityRiskReward } from "@/lib/trade-quality-rules";

export function getTradeQualityCaps(context: TradeQualityContext): TradeQualityCap[] {
  const caps: TradeQualityCap[] = [];
  const rr = calculateTradeQualityRiskReward(context);
  const completeness = calculatePlanCompleteness(context);

  if (!context.plan.stopLoss) caps.push(tradeQualityCaps.missingStop);
  if (!context.plan.takeProfit) caps.push(tradeQualityCaps.missingTarget);
  if (!context.plan.entryPrice) caps.push(tradeQualityCaps.missingEntry);
  if (rr !== null && rr < 1) caps.push(tradeQualityCaps.riskRewardBelowOne);
  if (positionOversized(context)) caps.push(tradeQualityCaps.oversizedPosition);
  if (context.multiTimeframe.countertrendWarning?.includes("Daily")) caps.push(tradeQualityCaps.dailyConflict);
  if (context.news.urgency === "High" && !context.plan.stopLoss) caps.push(tradeQualityCaps.newsRiskWithoutStop);
  if (completeness < 70) caps.push(tradeQualityCaps.incompletePlan);

  return caps;
}

export function applyTradeQualityCaps(score: number, caps: TradeQualityCap[]) {
  if (caps.length === 0) return score;
  return Math.min(score, ...caps.map((cap) => cap.cap));
}

function positionOversized(context: TradeQualityContext) {
  if (!context.portfolio) return false;
  const pct = (context.plan.notional / Math.max(1, context.portfolio.equity)) * 100;
  return pct > 25;
}
