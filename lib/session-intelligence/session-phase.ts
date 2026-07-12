/**
 * Session phase detection — pure / deterministic.
 */

import type { Candle } from "@/lib/market-data";
import type {
  SessionBias,
  SessionIntelligenceInput,
  SessionPhase,
} from "@/lib/session-intelligence/types";

export function detectSessionPhase(input: SessionIntelligenceInput): SessionPhase {
  const n = input.candles.length;
  if (n < 4) return "Unknown";

  const progress = sessionProgress(input.candles);
  const rangeRatio = recentRangeRatio(input.candles);
  const trend = structureTrend(input);
  const volStatus = input.context.volume.status;
  /** Treat as plain string so educational phase labels can map freeform structures. */
  const structure = String(input.reasoning.marketStructure ?? "");

  // Late / closing first by progress
  if (progress >= 0.88) {
    if (rangeRatio > 1.15 && isRotating(input)) return "Closing Rotation";
    return "Late Session";
  }

  // Opening window
  if (progress <= 0.18) {
    if (rangeRatio >= 1.35 && volStatus === "Rising") return "Opening Drive";
    return "Opening Balance";
  }

  // Clear directional structure → trend phases (before rotation heuristics)
  if (structure.includes("Higher") || structure.includes("Lower") || structure === "Breakout") {
    if (isAccumulation(input)) return "Accumulation";
    if (isDistribution(input)) return "Distribution";
    // Steady HH/HL trends often have stable (not expanding) ranges — do not
    // demote them to Consolidation unless the absolute range is tight.
    if (structure !== "Breakout" && isAbsoluteRangeTight(input.candles)) {
      return "Consolidation";
    }
    if (progress < 0.4 || structure === "Breakout" || rangeRatio >= 1.2) {
      return progress < 0.45 ? "Trend Expansion" : "Trend Continuation";
    }
    return "Trend Continuation";
  }

  // Explicit range / retest / two-sided rotation
  if (structure === "Range" || structure === "Retest" || isRotating(input)) {
    if (rangeRatio < 0.9) return "Consolidation";
    return "Range Rotation";
  }

  // Mid-session expansion without named structure
  if (trend !== "Neutral" && rangeRatio >= 1.25) {
    if (progress < 0.45) return "Trend Expansion";
    return "Trend Continuation";
  }

  if (isAccumulation(input)) return "Accumulation";
  if (isDistribution(input)) return "Distribution";

  if (rangeRatio < 0.8) return "Consolidation";
  return "Unknown";
}

export function detectSessionBias(input: SessionIntelligenceInput): SessionBias {
  const structure = input.reasoning.marketStructure ?? "";
  const htf = input.multiTimeframe.higherTimeframeDirection;
  const candleTrend = input.context.candleTrend;
  const path = pathBias(input.candles);

  const votes: SessionBias[] = [];
  if (structure.includes("Higher")) votes.push("Bullish");
  else if (structure.includes("Lower")) votes.push("Bearish");
  if (htf === "Bullish") votes.push("Bullish");
  else if (htf === "Bearish") votes.push("Bearish");
  if (candleTrend === "Bullish") votes.push("Bullish");
  else if (candleTrend === "Bearish") votes.push("Bearish");
  if (path === "Bullish") votes.push("Bullish");
  else if (path === "Bearish") votes.push("Bearish");

  const bull = votes.filter((v) => v === "Bullish").length;
  const bear = votes.filter((v) => v === "Bearish").length;
  if (bull >= 3 && bear === 0) return "Bullish";
  if (bear >= 3 && bull === 0) return "Bearish";
  if (bull > 0 && bear > 0) return "Mixed";
  if (bull > bear) return "Bullish";
  if (bear > bull) return "Bearish";
  return "Neutral";
}

function sessionProgress(candles: Candle[]): number {
  // Map bar count onto a typical session length so short samples stay "early".
  // Deterministic; does not invent wall-clock timezone.
  if (candles.length <= 1) return 0;
  const typicalSessionBars = 78;
  return Math.min(0.99, (candles.length - 1) / typicalSessionBars);
}

function recentRangeRatio(candles: Candle[]): number {
  const recent = candles.slice(-8);
  const earlier = candles.slice(-20, -8);
  if (recent.length < 3 || earlier.length < 3) return 1;
  const recentRange =
    Math.max(...recent.map((c) => c.high)) - Math.min(...recent.map((c) => c.low));
  const earlierRange =
    Math.max(...earlier.map((c) => c.high)) - Math.min(...earlier.map((c) => c.low));
  if (earlierRange <= 0) return 1;
  return recentRange / earlierRange;
}

function isAbsoluteRangeTight(candles: Candle[]): boolean {
  const recent = candles.slice(-10);
  if (recent.length < 4) return false;
  const range =
    Math.max(...recent.map((c) => c.high)) - Math.min(...recent.map((c) => c.low));
  const mid = Math.abs(recent[0].close) || 1;
  return range / mid < 0.006;
}

function structureTrend(input: SessionIntelligenceInput): SessionBias {
  const s = input.reasoning.marketStructure ?? "";
  if (s.includes("Higher")) return "Bullish";
  if (s.includes("Lower")) return "Bearish";
  return "Neutral";
}

function isRotating(input: SessionIntelligenceInput): boolean {
  const last = input.candles.slice(-6);
  if (last.length < 5) return false;
  let flips = 0;
  for (let i = 1; i < last.length; i++) {
    const prevUp = last[i - 1].close >= last[i - 1].open;
    const up = last[i].close >= last[i].open;
    if (prevUp !== up) flips += 1;
  }
  return flips >= 3;
}

function isAccumulation(input: SessionIntelligenceInput): boolean {
  const last = input.candles.slice(-10);
  if (last.length < 6) return false;
  const range =
    Math.max(...last.map((c) => c.high)) - Math.min(...last.map((c) => c.low));
  const mid = last[0].close;
  const tight = mid > 0 ? range / mid < 0.012 : false;
  const risingVol = input.context.volume.status === "Rising";
  const biasUp =
    input.context.candleTrend === "Bullish" ||
    (input.reasoning.marketStructure ?? "").includes("Higher");
  return tight && risingVol && biasUp;
}

function isDistribution(input: SessionIntelligenceInput): boolean {
  const last = input.candles.slice(-10);
  if (last.length < 6) return false;
  const range =
    Math.max(...last.map((c) => c.high)) - Math.min(...last.map((c) => c.low));
  const mid = last[0].close;
  const tight = mid > 0 ? range / mid < 0.012 : false;
  const risingVol = input.context.volume.status === "Rising";
  const biasDown =
    input.context.candleTrend === "Bearish" ||
    (input.reasoning.marketStructure ?? "").includes("Lower");
  return tight && risingVol && biasDown;
}

function pathBias(candles: Candle[]): SessionBias {
  if (candles.length < 8) return "Neutral";
  const open = candles[0].open;
  const close = candles[candles.length - 1].close;
  const change = (close - open) / Math.max(1e-9, open);
  if (change > 0.004) return "Bullish";
  if (change < -0.004) return "Bearish";
  return "Neutral";
}
