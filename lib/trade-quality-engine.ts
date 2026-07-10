import { applyTradeQualityCaps, getTradeQualityCaps } from "@/lib/trade-quality-caps";
import {
  buildTradeQualitySummary,
  buildWhyNotAPlus,
  getSuggestedNextAction,
  getTradeQualityGrade,
} from "@/lib/trade-quality-explanations";
import { buildTradeQualityImprovements, getMissingRequirements } from "@/lib/trade-quality-improvements";
import {
  buildTradeQualityBreakdown,
  calculatePlanCompleteness,
  calculateTradeQualityRiskReward,
} from "@/lib/trade-quality-rules";
import type { TradeQualityContext, TradeQualityResult } from "@/lib/trade-quality-types";

export function evaluateTradeQuality(context: TradeQualityContext): TradeQualityResult {
  const breakdown = buildTradeQualityBreakdown(context);
  const rawScore = Math.round(
    breakdown.reduce((sum, item) => sum + item.earned, 0),
  );
  const capsApplied = getTradeQualityCaps(context);
  const score = applyTradeQualityCaps(rawScore, capsApplied);
  const grade = getTradeQualityGrade(score);
  const sorted = [...breakdown].sort((a, b) => b.percentage - a.percentage);
  const strongestFactor = sorted[0];
  const weakestFactor = [...breakdown].sort((a, b) => a.percentage - b.percentage)[0];
  const strengths = sorted.slice(0, 3).map((item) => `${item.category}: ${item.reason}`);
  const weaknesses = [...breakdown]
    .filter((item) => item.percentage < 62)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 4)
    .map((item) => `${item.category}: ${item.reason}`);

  return {
    kind: "hermes-trade-quality-v1",
    symbol: context.symbol,
    score,
    rawScore,
    grade: grade.grade,
    label: grade.label,
    breakdown,
    strengths,
    weaknesses,
    missingRequirements: getMissingRequirements(context),
    improvements: buildTradeQualityImprovements(context, breakdown),
    whyNotAPlus: buildWhyNotAPlus(breakdown),
    summary: buildTradeQualitySummary({
      score,
      label: grade.label,
      strongest: strongestFactor,
      weakest: weakestFactor,
    }),
    suggestedNextAction: getSuggestedNextAction(score),
    capsApplied,
    strongestFactor,
    weakestFactor,
    riskReward: calculateTradeQualityRiskReward(context),
    planCompleteness: calculatePlanCompleteness(context),
  };
}
