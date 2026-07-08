import type { Candle } from "@/lib/market-data";
import type {
  ChartRect,
  HermesChartBounds,
  HermesChartHit,
  HermesChartViewport,
} from "@/lib/hermes-chart-engine/types";

export function buildChartBounds(
  width: number,
  height: number,
  panels: { volume: boolean; rsi: boolean; macd: boolean },
): HermesChartBounds {
  const axisWidth = 74;
  const timeAxisHeight = 28;
  const gap = 7;
  const volumeHeight = panels.volume ? 92 : 0;
  const rsiHeight = panels.rsi ? 104 : 0;
  const macdHeight = panels.macd ? 112 : 0;
  const lowerHeight =
    volumeHeight +
    rsiHeight +
    macdHeight +
    (panels.volume ? gap : 0) +
    (panels.rsi ? gap : 0) +
    (panels.macd ? gap : 0);
  const plot: ChartRect = {
    x: 8,
    y: 8,
    width: Math.max(120, width - axisWidth - 16),
    height: Math.max(240, height - lowerHeight - timeAxisHeight - 16),
  };
  let y = plot.y + plot.height + gap;
  const volume = panels.volume ? { x: plot.x, y, width: plot.width, height: volumeHeight } : null;
  if (volume) y += volume.height + gap;
  const rsi = panels.rsi ? { x: plot.x, y, width: plot.width, height: rsiHeight } : null;
  if (rsi) y += rsi.height + gap;
  const macd = panels.macd ? { x: plot.x, y, width: plot.width, height: macdHeight } : null;
  return { width, height, plot, volume, rsi, macd };
}

export function getVisibleCandles(candles: Candle[], viewport: HermesChartViewport) {
  return candles.slice(viewport.start, viewport.end + 1);
}

export function getPriceRange(candles: Candle[]) {
  const min = Math.min(...candles.map((candle) => candle.low));
  const max = Math.max(...candles.map((candle) => candle.high));
  const padding = (max - min) * 0.08 || max * 0.01 || 1;
  return { min: min - padding, max: max + padding };
}

export function priceToY(
  price: number,
  range: { min: number; max: number },
  rect: ChartRect,
) {
  return rect.y + (1 - (price - range.min) / (range.max - range.min)) * rect.height;
}

export function valueToY(
  value: number,
  range: { min: number; max: number },
  rect: ChartRect,
) {
  return rect.y + (1 - (value - range.min) / (range.max - range.min)) * rect.height;
}

export function indexToX(index: number, viewport: HermesChartViewport, rect: ChartRect) {
  const count = Math.max(1, viewport.end - viewport.start + 1);
  const slot = rect.width / count;
  return rect.x + (index - viewport.start + 0.5) * slot;
}

export function hitTestChart({
  x,
  y,
  candles,
  viewport,
  rect,
  priceRange,
}: {
  x: number;
  y: number;
  candles: Candle[];
  viewport: HermesChartViewport;
  rect: ChartRect;
  priceRange: { min: number; max: number };
}): HermesChartHit {
  const ratioX = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
  const index = Math.max(
    viewport.start,
    Math.min(
      viewport.end,
      Math.round(viewport.start + ratioX * Math.max(0, viewport.end - viewport.start)),
    ),
  );
  const ratioY = Math.max(0, Math.min(1, (y - rect.y) / rect.height));
  const price = priceRange.max - ratioY * (priceRange.max - priceRange.min);
  return {
    price,
    candleIndex: index,
    time: candles[index]?.time ?? 0,
  };
}
