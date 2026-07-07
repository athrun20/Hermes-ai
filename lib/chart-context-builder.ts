import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { AssetQuote, Candle, CoinSymbol } from "@/lib/market-data";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { buildChartIndicatorOverlays } from "@/lib/chart-overlay-engine";
import type { ChartIntelligenceContextV1 } from "@/lib/chart-intelligence-types";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";

export function buildChartIntelligenceContext({
  quote,
  candles,
  drawings,
  tradeLevels,
  analysis,
  traderDna,
  dailyGoal,
}: {
  quote: AssetQuote;
  candles: Candle[];
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  analysis: SymbolAnalysis;
  traderDna: string;
  dailyGoal: string;
}): ChartIntelligenceContextV1 {
  const overlays = buildChartIndicatorOverlays(candles);
  const rsi = buildRsiSeries(candles);
  const macd = buildMacdSeries(candles);
  const volume = buildVolumeSeries(candles);
  const currentVolume = volume[volume.length - 1] ?? 0;
  const averageVolume = average(volume.slice(-20));

  return {
    symbol: quote.symbol as CoinSymbol,
    currentPrice: quote.price,
    trendDirection: analysis.marketBias,
    ema20: lastValue(overlays.ema20),
    ema50: lastValue(overlays.ema50),
    vwap: lastValue(overlays.vwap),
    rsi: rsi[rsi.length - 1],
    macd: macd[macd.length - 1],
    volume: {
      current: currentVolume,
      average: averageVolume,
      status:
        currentVolume > averageVolume * 1.12
          ? "Rising"
          : currentVolume < averageVolume * 0.88
            ? "Fading"
            : "Normal",
    },
    drawings,
    supportLines: drawings.filter(
      (drawing) =>
        drawing.type === "support-zone" ||
        (drawing.type === "horizontal-line" && drawing.price <= quote.price),
    ),
    resistanceLines: drawings.filter(
      (drawing) =>
        drawing.type === "resistance-zone" ||
        (drawing.type === "horizontal-line" && drawing.price > quote.price),
    ),
    trendLines: drawings.filter(
      (drawing) => drawing.type === "trend-line" || drawing.type === "ray",
    ),
    tradeLevels,
    riskReward: calculateRiskReward(tradeLevels),
    traderDna,
    dailyGoal,
  };
}

export function buildHermesVisionContext({
  quote,
  candles,
  drawings,
  tradeLevels,
  analysis,
  traderDna,
  dailyGoal,
}: {
  quote: AssetQuote;
  candles: Candle[];
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  analysis: SymbolAnalysis;
  traderDna: string;
  dailyGoal: string;
}): HermesVisionContext {
  const overlays = buildChartIndicatorOverlays(candles);
  const rsi = buildRsiSeries(candles);
  const macd = buildMacdSeries(candles);
  const volume = buildVolumeSeries(candles);
  const currentVolume = volume[volume.length - 1] ?? 0;
  const averageVolume = average(volume.slice(-20));
  const horizontalLines = drawings.filter((drawing) => drawing.type === "horizontal-line");
  const supportZones = drawings.filter((drawing) => drawing.type === "support-zone");
  const resistanceZones = drawings.filter((drawing) => drawing.type === "resistance-zone");
  const supportCandidates = [
    ...supportZones,
    ...horizontalLines.filter((drawing) => drawing.price <= quote.price),
  ];
  const resistanceCandidates = [
    ...resistanceZones,
    ...horizontalLines.filter((drawing) => drawing.price > quote.price),
  ];
  const nearestSupport = nearestBelow(supportCandidates, quote.price);
  const nearestResistance = nearestAbove(resistanceCandidates, quote.price);

  return {
    symbol: quote.symbol as CoinSymbol,
    currentPrice: quote.price,
    candleTrend: analysis.marketBias,
    ema20: lastValue(overlays.ema20),
    ema50: lastValue(overlays.ema50),
    vwap: lastValue(overlays.vwap),
    rsi: rsi[rsi.length - 1],
    macd: macd[macd.length - 1],
    volume: {
      current: currentVolume,
      average: averageVolume,
      status:
        currentVolume > averageVolume * 1.12
          ? "Rising"
          : currentVolume < averageVolume * 0.88
            ? "Fading"
            : "Normal",
    },
    averageCandleRange: average(candles.slice(-14).map((candle) => candle.high - candle.low)),
    horizontalLines,
    trendLines: drawings.filter((drawing) => drawing.type === "trend-line" || drawing.type === "ray"),
    supportZones,
    resistanceZones,
    tradeLevels,
    riskReward: calculateRiskReward(tradeLevels),
    distanceFromSupport: nearestSupport
      ? Math.abs(quote.price - nearestSupport.price) / quote.price
      : null,
    distanceFromResistance: nearestResistance
      ? Math.abs(nearestResistance.price - quote.price) / quote.price
      : null,
    traderDna,
    dailyGoal,
  };
}

function buildVolumeSeries(candles: Candle[]) {
  return candles.map(
    (candle, index) =>
      Math.abs(candle.close - candle.open) * 1000 + 40 + (index % 7) * 12,
  );
}

function buildRsiSeries(candles: Candle[]) {
  return candles.map((candle, index) => {
    const pulse = Math.sin(index * 0.35) * 12;
    const direction = candle.close >= candle.open ? 5 : -5;
    return Math.max(18, Math.min(82, 52 + pulse + direction));
  });
}

function buildMacdSeries(candles: Candle[]) {
  return candles.map((_, index) => {
    const line = Math.sin(index * 0.22) * 1.4;
    const signal = Math.sin(index * 0.22 - 0.5) * 1.1;
    return { line, signal, histogram: line - signal };
  });
}

function calculateRiskReward(tradeLevels: ChartTradeLevels) {
  const { entry, stop, target } = tradeLevels;

  if (!entry || !stop || !target) return null;

  const longPlan = target > entry && stop < entry;
  const shortPlan = target < entry && stop > entry;
  const risk = longPlan ? entry - stop : shortPlan ? stop - entry : 0;
  const reward = longPlan ? target - entry : shortPlan ? entry - target : 0;

  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

function lastValue(points: Array<{ value: number }>) {
  return points[points.length - 1]?.value;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
