import type { Candle } from "@/lib/market-data";
import type { HermesChartSeries } from "@/lib/hermes-chart-engine/types";
import {
  candleBodyStrength,
  candleWickRead,
  readMacd,
  readRsi,
  readVolume,
} from "@/lib/hermes-chart-engine/indicator-calculations";

export type CandleExplanation = {
  title: string;
  direction: string;
  bodyStrength: string;
  wickBehavior: string;
  volumeRead: string;
  rsiContext: string;
  macdContext: string;
  interpretation: string;
};

export function explainCandle(
  candles: Candle[],
  series: HermesChartSeries,
  index: number | null,
): CandleExplanation | null {
  if (index === null) return null;
  const candle = candles[index];
  if (!candle) return null;

  const direction = candle.close >= candle.open ? "Bullish close" : "Bearish close";
  const bodyStrength = candleBodyStrength(candle);
  const wickBehavior = candleWickRead(candle);
  const volume = readVolume(series.volume, index);
  const rsi = readRsi(series.rsi, index);
  const macd = readMacd(series.macd, index);

  return {
    title: "Why this candle matters",
    direction,
    bodyStrength: sentenceCase(bodyStrength),
    wickBehavior: sentenceCase(wickBehavior),
    volumeRead: volumeLabel(volume.read, volume.ratio),
    rsiContext: rsiLabel(rsi, series.rsi[index] ?? 50),
    macdContext: macdLabel(macd),
    interpretation: buildInterpretation(direction, bodyStrength, wickBehavior, volume.read, rsi, macd),
  };
}

function buildInterpretation(
  direction: string,
  body: string,
  wick: string,
  volume: string,
  rsi: string,
  macd: string,
) {
  if (direction === "Bullish close" && body === "strong" && (volume === "spike" || volume === "increasing")) {
    return "This bullish candle closed with commitment while participation improved. Momentum is constructive, but Hermes still wants confirmation before risk is added.";
  }
  if (direction === "Bearish close" && body === "strong" && wick !== "lower defense") {
    return "Sellers controlled this candle. If this appears near support, Hermes treats it as a reason to wait for stabilization.";
  }
  if (wick === "upper rejection") {
    return "The upper wick shows supply appeared before the close. That can limit reward if resistance is nearby.";
  }
  if (rsi === "overbought" || macd === "fading") {
    return "Momentum is present, but the candle asks for patience. The plan may improve if price pauses instead of extending.";
  }
  return "This candle is useful context rather than a decision by itself. Hermes reads it together with structure, volume, and risk.";
}

function volumeLabel(read: string, ratio: number) {
  const percent = Math.round((ratio - 1) * 100);
  if (read === "spike") return `Volume spike, ${percent}% above average`;
  if (read === "weak") return `Weak participation, ${Math.abs(percent)}% below average`;
  if (read === "increasing") return "Volume is improving";
  if (read === "fading") return "Volume is fading";
  return "Volume is near average";
}

function rsiLabel(read: string, value: number) {
  const label = Math.round(value);
  if (read === "overbought") return `RSI ${label}, stretched`;
  if (read === "oversold") return `RSI ${label}, washed out`;
  if (read === "strengthening") return `RSI ${label}, strengthening`;
  if (read === "weakening") return `RSI ${label}, weakening`;
  return `RSI ${label}, neutral`;
}

function macdLabel(read: string) {
  if (read === "bullish-crossover") return "MACD bullish crossover";
  if (read === "bearish-crossover") return "MACD bearish crossover";
  if (read === "increasing") return "MACD momentum improving";
  if (read === "fading") return "MACD momentum fading";
  if (read === "above-zero") return "MACD above zero";
  return "MACD below zero";
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
