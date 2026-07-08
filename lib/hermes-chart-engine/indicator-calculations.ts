import type { Candle } from "@/lib/market-data";

export type VolumeRead = "spike" | "increasing" | "fading" | "weak" | "normal";
export type RsiRead = "overbought" | "oversold" | "strengthening" | "weakening" | "neutral";
export type MacdRead = "bullish-crossover" | "bearish-crossover" | "increasing" | "fading" | "above-zero" | "below-zero";

export function buildMovingAverage(values: number[], period: number) {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - period + 1), index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / Math.max(slice.length, 1);
  });
}

export function buildVolumeAverage(volume: number[], period = 20) {
  return buildMovingAverage(volume, period);
}

export function buildRsiSignal(rsi: number[], period = 9) {
  return buildMovingAverage(rsi, period);
}

export function readVolume(volume: number[], index: number): { read: VolumeRead; ratio: number; average: number } {
  const average = buildVolumeAverage(volume)[index] ?? volume[index] ?? 0;
  const current = volume[index] ?? 0;
  const ratio = average > 0 ? current / average : 1;
  const previousAverage = buildVolumeAverage(volume.slice(0, Math.max(0, index)))[index - 1] ?? average;

  if (ratio >= 1.45) return { read: "spike", ratio, average };
  if (ratio <= 0.62) return { read: "weak", ratio, average };
  if (average > previousAverage * 1.04) return { read: "increasing", ratio, average };
  if (average < previousAverage * 0.96) return { read: "fading", ratio, average };
  return { read: "normal", ratio, average };
}

export function readRsi(rsi: number[], index: number): RsiRead {
  const current = rsi[index] ?? 50;
  const previous = rsi[Math.max(0, index - 3)] ?? current;
  if (current >= 70) return "overbought";
  if (current <= 30) return "oversold";
  if (current > 52 && current > previous + 2) return "strengthening";
  if (current < 48 && current < previous - 2) return "weakening";
  return "neutral";
}

export function findMacdCrossovers(macd: Array<{ macd: number; signal: number; histogram: number }>) {
  return macd.map((point, index) => {
    if (index === 0) return "none" as const;
    const previous = macd[index - 1];
    if (previous.macd <= previous.signal && point.macd > point.signal) return "bullish" as const;
    if (previous.macd >= previous.signal && point.macd < point.signal) return "bearish" as const;
    return "none" as const;
  });
}

export function readMacd(macd: Array<{ macd: number; signal: number; histogram: number }>, index: number): MacdRead {
  const crossovers = findMacdCrossovers(macd);
  if (crossovers[index] === "bullish") return "bullish-crossover";
  if (crossovers[index] === "bearish") return "bearish-crossover";
  const current = macd[index] ?? { macd: 0, signal: 0, histogram: 0 };
  const previous = macd[Math.max(0, index - 3)] ?? current;
  if (current.histogram > previous.histogram + 0.08) return "increasing";
  if (current.histogram < previous.histogram - 0.08) return "fading";
  return current.macd >= 0 ? "above-zero" : "below-zero";
}

export function candleBodyStrength(candle: Candle) {
  const range = Math.max(candle.high - candle.low, 0.0001);
  const body = Math.abs(candle.close - candle.open);
  const ratio = body / range;
  if (ratio >= 0.62) return "strong";
  if (ratio >= 0.32) return "balanced";
  return "indecisive";
}

export function candleWickRead(candle: Candle) {
  const range = Math.max(candle.high - candle.low, 0.0001);
  const upper = candle.high - Math.max(candle.open, candle.close);
  const lower = Math.min(candle.open, candle.close) - candle.low;
  if (upper / range > 0.42) return "upper rejection";
  if (lower / range > 0.42) return "lower defense";
  return "clean close";
}
