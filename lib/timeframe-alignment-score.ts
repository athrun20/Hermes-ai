import type {
  MultiTimeframeDirection,
  MultiTimeframePattern,
  MultiTimeframeStatus,
  TimeframeAnalysis,
} from "@/lib/multi-timeframe-types";
import type { WorkspaceTimeframe } from "@/lib/market-universe";

const weights: Partial<Record<WorkspaceTimeframe, number>> = {
  "5m": 0.1,
  "15m": 0.15,
  "1H": 0.2,
  "4H": 0.25,
  "1D": 0.3,
};

export function calculateTimeframeAlignmentScore(rows: TimeframeAnalysis[]) {
  const weighted = rows.reduce((sum, row) => sum + row.score * (weights[row.timeframe] ?? 0), 0);
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export function detectAlignmentPattern(rows: TimeframeAnalysis[]): MultiTimeframePattern {
  const lower = rows.filter((row) => row.timeframe === "5m" || row.timeframe === "15m");
  const higher = rows.filter((row) => row.timeframe === "1H" || row.timeframe === "4H" || row.timeframe === "1D");
  const lowerBias = directionalBias(lower);
  const higherBias = directionalBias(higher);

  if (rows.every((row) => isBullish(row.direction))) return "Full bullish alignment";
  if (rows.every((row) => isBearish(row.direction))) return "Full bearish alignment";
  if (higherBias === "bullish" && lowerBias === "bearish") return "Higher-timeframe bullish / lower-timeframe bearish pullback";
  if (higherBias === "bearish" && lowerBias === "bullish") return "Higher-timeframe bearish / lower-timeframe bullish bounce";
  if (higherBias === "mixed" || lowerBias === "mixed") return "Mixed conditions";
  return "No clear alignment";
}

export function getAlignmentStatus(score: number, pattern: MultiTimeframePattern): MultiTimeframeStatus {
  if (pattern === "Full bullish alignment" || pattern === "Full bearish alignment") return "Strong Alignment";
  if (score >= 72) return "Constructive";
  if (pattern.includes("pullback") || pattern.includes("bounce")) return "Conflict";
  if (score >= 50) return "Mixed";
  return "No Clear Alignment";
}

export function getHigherTimeframeDirection(rows: TimeframeAnalysis[]): MultiTimeframeDirection {
  const higher = rows.filter((row) => row.timeframe === "1H" || row.timeframe === "4H" || row.timeframe === "1D");
  const average = Math.round(higher.reduce((sum, row) => sum + row.score, 0) / Math.max(1, higher.length));
  if (average >= 84) return "Strong Bullish";
  if (average >= 62) return "Bullish";
  if (average <= 22) return "Strong Bearish";
  if (average <= 42) return "Bearish";
  return "Neutral";
}

export function calculateAlignmentImpact(rows: TimeframeAnalysis[], activeTimeframe: WorkspaceTimeframe) {
  const active = rows.find((row) => row.timeframe === activeTimeframe);
  const fourHour = rows.find((row) => row.timeframe === "4H");
  const daily = rows.find((row) => row.timeframe === "1D");
  const oneHour = rows.find((row) => row.timeframe === "1H");

  if (fourHour && daily && sameDirectionalFamily(fourHour.direction, daily.direction) && isDirectional(fourHour.direction)) {
    if (oneHour && sameDirectionalFamily(oneHour.direction, fourHour.direction)) return isBullish(fourHour.direction) ? 10 : -10;
    return isBullish(fourHour.direction) ? 6 : -6;
  }

  if (active && fourHour && conflicts(active.direction, fourHour.direction)) return -8;
  if (active && daily && conflicts(active.direction, daily.direction)) return -12;
  return -5;
}

export function buildCountertrendWarning(rows: TimeframeAnalysis[], activeTimeframe: WorkspaceTimeframe) {
  const active = rows.find((row) => row.timeframe === activeTimeframe);
  const daily = rows.find((row) => row.timeframe === "1D");
  const fourHour = rows.find((row) => row.timeframe === "4H");
  if (active && daily && conflicts(active.direction, daily.direction)) {
    return `Active ${activeTimeframe} structure conflicts with the Daily trend. This carries countertrend risk.`;
  }
  if (active && fourHour && conflicts(active.direction, fourHour.direction)) {
    return `Active ${activeTimeframe} structure conflicts with the 4H trend. Wait for stronger confirmation.`;
  }
  return null;
}

function directionalBias(rows: TimeframeAnalysis[]) {
  const bullish = rows.filter((row) => isBullish(row.direction)).length;
  const bearish = rows.filter((row) => isBearish(row.direction)).length;
  if (bullish > bearish && bullish >= Math.ceil(rows.length / 2)) return "bullish";
  if (bearish > bullish && bearish >= Math.ceil(rows.length / 2)) return "bearish";
  return "mixed";
}

function isBullish(direction: MultiTimeframeDirection) {
  return direction === "Bullish" || direction === "Strong Bullish";
}

function isBearish(direction: MultiTimeframeDirection) {
  return direction === "Bearish" || direction === "Strong Bearish";
}

function isDirectional(direction: MultiTimeframeDirection) {
  return isBullish(direction) || isBearish(direction);
}

function sameDirectionalFamily(a: MultiTimeframeDirection, b: MultiTimeframeDirection) {
  return (isBullish(a) && isBullish(b)) || (isBearish(a) && isBearish(b));
}

function conflicts(a: MultiTimeframeDirection, b: MultiTimeframeDirection) {
  return (isBullish(a) && isBearish(b)) || (isBearish(a) && isBullish(b));
}
