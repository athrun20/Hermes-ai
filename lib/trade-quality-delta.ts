import type { TradeQualityResult } from "@/lib/trade-quality-types";

export type TradeQualityDelta = {
  previousScore: number;
  currentScore: number;
  delta: number;
  reason: string;
};

export function calculateTradeQualityDelta(
  previous: TradeQualityResult | null,
  current: TradeQualityResult,
): TradeQualityDelta | null {
  if (!previous) return null;
  const delta = current.score - previous.score;
  if (delta === 0) return null;
  const changedFactor = [...current.breakdown]
    .map((item) => {
      const prior = previous.breakdown.find((oldItem) => oldItem.category === item.category);
      return {
        category: item.category,
        change: item.percentage - (prior?.percentage ?? item.percentage),
        reason: item.reason,
      };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];

  return {
    previousScore: previous.score,
    currentScore: current.score,
    delta,
    reason: changedFactor
      ? `${changedFactor.category} changed: ${changedFactor.reason}`
      : "Trade quality changed after the plan update.",
  };
}
