import type { DrawingAnalysis } from "@/lib/chart-drawing-analyzer";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";

export type TradeLevelAnalysis = {
  hasCompletePlan: boolean;
  riskReward: number | null;
  riskRewardIsWeak: boolean;
  stopInsideNormalVolatility: boolean;
  stopInsideSupport: boolean;
  targetIsClear: boolean;
};

export function analyzeTradeLevels(
  context: HermesVisionContext,
  drawingAnalysis: DrawingAnalysis,
): TradeLevelAnalysis {
  const { entry, stop, target } = context.tradeLevels;
  const hasCompletePlan = Boolean(entry && stop && target);
  const stopDistance = entry && stop ? Math.abs(entry - stop) : null;

  return {
    hasCompletePlan,
    riskReward: context.riskReward,
    riskRewardIsWeak: context.riskReward !== null && context.riskReward < 2,
    stopInsideNormalVolatility:
      Boolean(stopDistance) && stopDistance! < context.averageCandleRange * 0.85,
    stopInsideSupport:
      Boolean(stop && drawingAnalysis.nearestSupport) &&
      Math.abs(stop! - drawingAnalysis.nearestSupport!.price) / context.currentPrice < 0.006,
    targetIsClear: Boolean(target) && !drawingAnalysis.targetNearResistance,
  };
}
