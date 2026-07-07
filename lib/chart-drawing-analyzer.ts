import type { HermesVisionContext } from "@/lib/hermes-vision-types";

export type DrawingAnalysis = {
  nearestSupport?: { price: number };
  nearestResistance?: { price: number };
  supportAlignsWithEma20: boolean;
  supportAlignsWithVwap: boolean;
  targetNearResistance: boolean;
  entryExtendedFromVwap: boolean;
  hasTrendStructure: boolean;
};

export function analyzeChartDrawings(context: HermesVisionContext): DrawingAnalysis {
  const nearestSupport = nearestBelow(
    [...context.supportZones, ...context.horizontalLines.filter((line) => line.price <= context.currentPrice)],
    context.currentPrice,
  );
  const nearestResistance = nearestAbove(
    [...context.resistanceZones, ...context.horizontalLines.filter((line) => line.price > context.currentPrice)],
    context.currentPrice,
  );
  const supportPrice = nearestSupport?.price;
  const target = context.tradeLevels.target;
  const entry = context.tradeLevels.entry;

  return {
    nearestSupport,
    nearestResistance,
    supportAlignsWithEma20:
      Boolean(supportPrice && context.ema20) &&
      isNear(supportPrice!, context.ema20!, context.currentPrice, 0.012),
    supportAlignsWithVwap:
      Boolean(supportPrice && context.vwap) &&
      isNear(supportPrice!, context.vwap!, context.currentPrice, 0.012),
    targetNearResistance:
      Boolean(target && nearestResistance) &&
      isNear(target!, nearestResistance!.price, context.currentPrice, 0.012),
    entryExtendedFromVwap:
      Boolean(entry && context.vwap) &&
      Math.abs(entry! - context.vwap!) / context.vwap! > 0.012,
    hasTrendStructure: context.trendLines.length > 0,
  };
}

function nearestBelow(drawings: Array<{ price: number }>, price: number) {
  return drawings
    .filter((drawing) => drawing.price <= price)
    .sort((a, b) => b.price - a.price)[0];
}

function nearestAbove(drawings: Array<{ price: number }>, price: number) {
  return drawings
    .filter((drawing) => drawing.price >= price)
    .sort((a, b) => a.price - b.price)[0];
}

function isNear(a: number, b: number, reference: number, tolerance: number) {
  return Math.abs(a - b) / reference <= tolerance;
}
