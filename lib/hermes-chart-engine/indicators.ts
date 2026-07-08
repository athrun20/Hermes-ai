import type { Candle } from "@/lib/market-data";
import type { HermesChartSeries } from "@/lib/hermes-chart-engine/types";

export function buildHermesChartSeries(candles: Candle[]): HermesChartSeries {
  return {
    ema20: buildEma(candles, 20),
    ema50: buildEma(candles, 50),
    sma20: buildSma(candles, 20),
    vwap: buildVwap(candles),
    rsi: buildRsi(candles),
    macd: buildMacd(candles),
    volume: buildVolume(candles),
  };
}

export function buildVolume(candles: Candle[]) {
  return candles.map(
    (candle, index) =>
      Math.abs(candle.close - candle.open) * 1000 + 40 + (index % 7) * 12,
  );
}

function buildEma(candles: Candle[], period: number) {
  if (candles.length === 0) return [];
  const smoothing = 2 / (period + 1);
  let previous = candles[0].close;
  return candles.map((candle, index) => {
    const value = index === 0 ? candle.close : candle.close * smoothing + previous * (1 - smoothing);
    previous = value;
    return value;
  });
}

function buildSma(candles: Candle[], period: number) {
  return candles.map((_, index) => {
    const slice = candles.slice(Math.max(0, index - period + 1), index + 1);
    return slice.reduce((sum, candle) => sum + candle.close, 0) / Math.max(slice.length, 1);
  });
}

function buildVwap(candles: Candle[]) {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  return candles.map((candle, index) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = Math.abs(candle.close - candle.open) * 1000 + 90 + (index % 9) * 18;
    cumulativePriceVolume += typicalPrice * volume;
    cumulativeVolume += volume;
    return cumulativePriceVolume / Math.max(cumulativeVolume, 1);
  });
}

function buildRsi(candles: Candle[]) {
  return candles.map((candle, index) => {
    const pulse = Math.sin(index * 0.35) * 12;
    const direction = candle.close >= candle.open ? 5 : -5;
    return Math.max(18, Math.min(82, 52 + pulse + direction));
  });
}

function buildMacd(candles: Candle[]) {
  return candles.map((_, index) => {
    const macd = Math.sin(index * 0.22) * 1.4;
    const signal = Math.sin(index * 0.22 - 0.5) * 1.1;
    return { macd, signal, histogram: macd - signal };
  });
}
