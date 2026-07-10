import type { Candle } from "@/lib/market-data";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";

export type FootprintEvidenceState = {
  latest: Candle | null;
  previous: Candle | null;
  bodyPct: number;
  upperWickPct: number;
  lowerWickPct: number;
  relativeVolume: number;
  nearSupport: boolean;
  nearResistance: boolean;
  recoveredAboveSupport: boolean;
  rejectedAtResistance: boolean;
  brokePriorHigh: boolean;
  brokePriorLow: boolean;
  failedBreakout: boolean;
  failedBreakdown: boolean;
  aboveVwap: boolean;
  belowVwap: boolean;
  emaBullish: boolean;
  emaBearish: boolean;
  momentumBullish: boolean;
  momentumBearish: boolean;
};

export function buildFootprintEvidenceState(
  candles: Candle[],
  context: HermesVisionContext,
): FootprintEvidenceState {
  const latest = candles[candles.length - 1] ?? null;
  const previous = candles[candles.length - 2] ?? null;
  const recent = candles.slice(-12, -1);
  const range = latest ? Math.max(0.0001, latest.high - latest.low) : 1;
  const body = latest ? Math.abs(latest.close - latest.open) : 0;
  const upperWick = latest ? latest.high - Math.max(latest.open, latest.close) : 0;
  const lowerWick = latest ? Math.min(latest.open, latest.close) - latest.low : 0;
  const priorHigh = Math.max(...recent.map((candle) => candle.high), previous?.high ?? 0);
  const priorLow = Math.min(...recent.map((candle) => candle.low), previous?.low ?? 0);
  const relativeVolume = context.volume.average > 0 ? context.volume.current / context.volume.average : 1;
  const nearSupport = context.distanceFromSupport !== null && context.distanceFromSupport < 0.018;
  const nearResistance = context.distanceFromResistance !== null && context.distanceFromResistance < 0.018;

  return {
    latest,
    previous,
    bodyPct: body / range,
    upperWickPct: upperWick / range,
    lowerWickPct: lowerWick / range,
    relativeVolume,
    nearSupport,
    nearResistance,
    recoveredAboveSupport: Boolean(latest && nearSupport && latest.close > latest.open && lowerWick / range > 0.34),
    rejectedAtResistance: Boolean(latest && nearResistance && latest.close < latest.open && upperWick / range > 0.34),
    brokePriorHigh: Boolean(latest && latest.high > priorHigh),
    brokePriorLow: Boolean(latest && latest.low < priorLow),
    failedBreakout: Boolean(latest && latest.high > priorHigh && latest.close < priorHigh),
    failedBreakdown: Boolean(latest && latest.low < priorLow && latest.close > priorLow),
    aboveVwap: Boolean(context.vwap && context.currentPrice > context.vwap),
    belowVwap: Boolean(context.vwap && context.currentPrice < context.vwap),
    emaBullish: Boolean(context.ema20 && context.ema50 && context.ema20 >= context.ema50),
    emaBearish: Boolean(context.ema20 && context.ema50 && context.ema20 < context.ema50),
    momentumBullish: Boolean(context.macd && context.macd.line > context.macd.signal && (context.rsi ?? 50) >= 45),
    momentumBearish: Boolean(context.macd && context.macd.line < context.macd.signal && (context.rsi ?? 50) <= 58),
  };
}
