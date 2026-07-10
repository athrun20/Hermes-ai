import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";

export function calculateFootprintConfidenceImpact({
  footprint,
  multiTimeframe,
  strategy,
}: {
  footprint: Pick<InstitutionalFootprintResult, "type" | "direction" | "confidence">;
  multiTimeframe: MultiTimeframeIntelligence;
  strategy: StrategyIntelligenceResult;
}) {
  if (footprint.type === "No clear institutional footprint") return 0;
  const bullishHtf = multiTimeframe.higherTimeframeDirection.includes("Bullish");
  const bearishHtf = multiTimeframe.higherTimeframeDirection.includes("Bearish");
  const strategyType = strategy.currentStrategy.type;

  if (["Buyer Absorption", "Failed Breakdown", "Supply Absorbed"].includes(footprint.type) && bullishHtf) return 8;
  if (footprint.type === "Accumulation" && bullishHtf) return 6;
  if (["Seller Absorption", "Failed Breakout", "Demand Absorbed"].includes(footprint.type) && bearishHtf) return -8;
  if (footprint.type === "Distribution" && strategyType !== "Resistance Rejection") return -8;
  if (footprint.type === "Failed Breakout" && ["Momentum Breakout", "Trend Continuation"].includes(strategyType)) return -10;
  if (footprint.type === "Exhaustion") return -6;
  if (footprint.direction === "Bullish" && bullishHtf) return 4;
  if (footprint.direction === "Bearish" && bearishHtf) return -4;
  return 0;
}
