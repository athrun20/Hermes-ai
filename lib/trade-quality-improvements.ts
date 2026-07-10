import type { TradeQualityBreakdownItem, TradeQualityContext } from "@/lib/trade-quality-types";

export function buildTradeQualityImprovements(
  context: TradeQualityContext,
  breakdown: TradeQualityBreakdownItem[],
) {
  const improvements = new Set<string>();

  if (!context.plan.entryPrice) improvements.add("Define a specific entry before asking Hermes to review quality.");
  if (!context.plan.stopLoss) improvements.add("Add a stop loss at a clear invalidation level.");
  if (!context.plan.takeProfit) improvements.add("Add a take-profit target so reward can be measured.");
  if (breakdown.find((item) => item.category === "Risk / Reward" && item.percentage < 62)) {
    improvements.add("Improve entry, stop, or target until reward reaches at least 2:1.");
  }
  if (breakdown.find((item) => item.category === "Volume" && item.percentage < 62)) {
    improvements.add("Wait for volume to exceed its recent average.");
  }
  if (context.multiTimeframe.countertrendWarning) {
    improvements.add("Avoid entering while the active timeframe conflicts with 4H or Daily structure.");
  }
  if (context.footprint.direction !== "Neutral" && context.footprint.confidenceImpact < 0) {
    improvements.add("Wait for footprint evidence to stop conflicting with the trade direction.");
  }

  return Array.from(improvements).slice(0, 5);
}

export function getMissingRequirements(context: TradeQualityContext) {
  return [
    !context.plan.entryPrice ? "Entry price" : "",
    !context.plan.stopLoss ? "Stop loss" : "",
    !context.plan.takeProfit ? "Take profit" : "",
    context.plan.notional <= 0 ? "Position size" : "",
  ].filter(Boolean);
}
