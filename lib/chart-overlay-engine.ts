import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { Candle } from "@/lib/market-data";

export type ChartOverlayPoint = {
  time: number;
  value: number;
};

export type ChartIndicatorOverlays = {
  ema20: ChartOverlayPoint[];
  ema50: ChartOverlayPoint[];
  vwap: ChartOverlayPoint[];
};

export type ChartIntelligenceContext = {
  supportLines: ChartDrawing[];
  resistanceLines: ChartDrawing[];
  trendLines: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
};

export function buildChartIndicatorOverlays(candles: Candle[]): ChartIndicatorOverlays {
  return {
    ema20: buildEma(candles, 20),
    ema50: buildEma(candles, 50),
    vwap: buildVwap(candles),
  };
}

export function buildChartIntelligenceContext({
  drawings,
  tradeLevels,
}: {
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
}): ChartIntelligenceContext {
  return {
    supportLines: drawings.filter((drawing) => drawing.type === "support-zone"),
    resistanceLines: drawings.filter((drawing) => drawing.type === "resistance-zone"),
    trendLines: drawings.filter((drawing) => drawing.type === "trend-line" || drawing.type === "ray"),
    tradeLevels,
  };
}

function buildEma(candles: Candle[], period: number): ChartOverlayPoint[] {
  if (candles.length === 0) return [];

  const smoothing = 2 / (period + 1);
  let previous = candles[0].close;

  return candles.map((candle, index) => {
    const value = index === 0 ? candle.close : candle.close * smoothing + previous * (1 - smoothing);
    previous = value;
    return {
      time: candle.time,
      value,
    };
  });
}

function buildVwap(candles: Candle[]): ChartOverlayPoint[] {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  return candles.map((candle, index) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const mockVolume =
      Math.abs(candle.close - candle.open) * 1000 + 90 + (index % 9) * 18;

    cumulativePriceVolume += typicalPrice * mockVolume;
    cumulativeVolume += mockVolume;

    return {
      time: candle.time,
      value: cumulativePriceVolume / Math.max(cumulativeVolume, 1),
    };
  });
}
