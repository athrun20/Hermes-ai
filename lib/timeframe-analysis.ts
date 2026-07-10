import type { HermesVisionContext } from "@/lib/hermes-vision-types";
import type { TimeframeAnalysis } from "@/lib/multi-timeframe-types";
import type { WorkspaceTimeframe } from "@/lib/market-universe";

export function analyzeTimeframe({
  timeframe,
  context,
}: {
  timeframe: WorkspaceTimeframe;
  context: HermesVisionContext;
}): TimeframeAnalysis {
  let score = context.candleTrend === "Bullish" ? 58 : context.candleTrend === "Bearish" ? 42 : 50;
  const emaAlignment = getEmaAlignment(context);
  const vwapPosition = getVwapPosition(context);
  const rsiCondition = getRsiCondition(context);
  const macdCondition = getMacdCondition(context);
  const volumeConfirmation = getVolumeConfirmation(context);

  if (emaAlignment === "Bullish") score += 14;
  if (emaAlignment === "Bearish") score -= 14;
  if (vwapPosition === "Above") score += 7;
  if (vwapPosition === "Below") score -= 7;
  if (rsiCondition === "Constructive") score += 8;
  if (rsiCondition === "Stretched") score -= 4;
  if (rsiCondition === "Weak") score -= 8;
  if (macdCondition === "Bullish") score += 8;
  if (macdCondition === "Bearish") score -= 8;
  if (volumeConfirmation === "Confirmed") score += 7;
  if (volumeConfirmation === "Fading") score -= 6;
  if (context.distanceFromSupport !== null && context.distanceFromSupport < 0.015) score += 4;
  if (context.distanceFromResistance !== null && context.distanceFromResistance < 0.015) score -= 3;

  const normalizedScore = clamp(score);

  return {
    timeframe,
    direction: getDirection(normalizedScore),
    score: normalizedScore,
    trend: context.candleTrend,
    emaAlignment,
    vwapPosition,
    rsiCondition,
    macdCondition,
    volumeConfirmation,
    marketStructure: getMarketStructure(context, normalizedScore),
    supportResistanceContext: getSupportResistanceContext(context),
    momentum: macdCondition === "Bullish" && rsiCondition !== "Weak" ? "Improving" : macdCondition === "Bearish" ? "Fading" : "Neutral",
  };
}

function getEmaAlignment(context: HermesVisionContext) {
  if (!context.ema20 || !context.ema50) return "Neutral";
  if (context.ema20 > context.ema50) return "Bullish";
  if (context.ema20 < context.ema50) return "Bearish";
  return "Neutral";
}

function getVwapPosition(context: HermesVisionContext) {
  if (!context.vwap) return "Neutral";
  if (context.currentPrice > context.vwap) return "Above";
  if (context.currentPrice < context.vwap) return "Below";
  return "Neutral";
}

function getRsiCondition(context: HermesVisionContext) {
  if (!context.rsi) return "Neutral";
  if (context.rsi >= 70) return "Stretched";
  if (context.rsi >= 45 && context.rsi <= 66) return "Constructive";
  if (context.rsi <= 38) return "Weak";
  return "Neutral";
}

function getMacdCondition(context: HermesVisionContext) {
  if (!context.macd) return "Neutral";
  if (context.macd.line > context.macd.signal) return "Bullish";
  if (context.macd.line < context.macd.signal) return "Bearish";
  return "Neutral";
}

function getVolumeConfirmation(context: HermesVisionContext) {
  if (context.volume.status === "Rising") return "Confirmed";
  if (context.volume.status === "Fading") return "Fading";
  return "Neutral";
}

function getMarketStructure(context: HermesVisionContext, score: number) {
  if (score >= 64) return "Constructive";
  if (score <= 42) return "Weak";
  return "Range";
}

function getSupportResistanceContext(context: HermesVisionContext) {
  if (context.distanceFromSupport !== null && context.distanceFromSupport < 0.015) return "Near support";
  if (context.distanceFromResistance !== null && context.distanceFromResistance < 0.015) return "Near resistance";
  return "Between key levels";
}

function getDirection(score: number) {
  if (score >= 84) return "Strong Bullish";
  if (score >= 62) return "Bullish";
  if (score <= 22) return "Strong Bearish";
  if (score <= 42) return "Bearish";
  return "Neutral";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
