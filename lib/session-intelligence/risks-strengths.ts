/**
 * Current session risks and strengths (max 3 each).
 */

import type {
  LiquidityState,
  MarketHealth,
  MomentumState,
  ParticipationState,
  SessionIntelligenceInput,
  SessionPhase,
  VolatilityState,
} from "@/lib/session-intelligence/types";

export function buildCurrentRisks(args: {
  input: SessionIntelligenceInput;
  phase: SessionPhase;
  health: MarketHealth;
  volatility: VolatilityState;
  liquidity: LiquidityState;
  momentum: MomentumState;
  participation: ParticipationState;
}): string[] {
  const risks: Array<{ text: string; weight: number }> = [];
  const { input, phase, health, volatility, liquidity, momentum, participation } = args;

  if (input.news.urgency === "High" || input.news.riskCaution?.active) {
    risks.push({ text: "High event risk", weight: 10 });
  }
  if (participation === "Weak" || participation === "Absent") {
    risks.push({ text: "Weak participation", weight: 9 });
  }
  if (liquidity === "Thin" || liquidity === "Dislocated") {
    risks.push({ text: "Low liquidity", weight: 8 });
  }
  if (
    input.context.distanceFromResistance != null &&
    input.context.distanceFromResistance < 0.012
  ) {
    risks.push({ text: "Resistance overhead", weight: 7 });
  }
  if (momentum === "Fading") {
    risks.push({ text: "Momentum fading", weight: 7 });
  }
  if (volatility === "Compressed") {
    risks.push({ text: "Volatility compression", weight: 6 });
  }
  if (volatility === "Extreme") {
    risks.push({ text: "Extreme volatility", weight: 9 });
  }
  if (health === "Unstable" || health === "Weak") {
    risks.push({ text: "Fragile session environment", weight: 8 });
  }
  if (phase === "Closing Rotation" || phase === "Late Session") {
    risks.push({ text: "Late-session process risk", weight: 5 });
  }
  if (input.multiTimeframe.countertrendWarning) {
    risks.push({ text: "Higher-timeframe conflict", weight: 7 });
  }

  return risks
    .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text))
    .slice(0, 3)
    .map((r) => r.text);
}

export function buildCurrentStrengths(args: {
  input: SessionIntelligenceInput;
  phase: SessionPhase;
  health: MarketHealth;
  momentum: MomentumState;
  participation: ParticipationState;
}): string[] {
  const strengths: Array<{ text: string; weight: number }> = [];
  const { input, phase, health, momentum, participation } = args;
  const structure = input.reasoning.marketStructure ?? "";

  if (
    phase === "Trend Continuation" ||
    phase === "Trend Expansion" ||
    structure.includes("Higher") ||
    structure.includes("Lower")
  ) {
    strengths.push({ text: "Healthy trend structure", weight: 9 });
  }
  if (
    input.footprint.direction === "Bullish" ||
    input.footprint.direction === "Bearish"
  ) {
    if (input.footprint.confidence >= 58) {
      strengths.push({ text: "Institutional participation signal", weight: 8 });
    }
  }
  if (participation === "Strong") {
    strengths.push({ text: "Strong volume", weight: 9 });
  }
  if (
    input.context.vwap &&
    input.context.currentPrice >= input.context.vwap &&
    Math.abs(input.context.currentPrice - input.context.vwap) / input.context.currentPrice <
      0.015
  ) {
    strengths.push({ text: "VWAP support", weight: 7 });
  }
  if ((input.vision.setupStructureScore ?? 0) >= 65) {
    strengths.push({ text: "Market structure intact", weight: 8 });
  }
  if (momentum === "Accelerating") {
    strengths.push({ text: "Momentum aligned", weight: 7 });
  }
  if (health === "Excellent" || health === "Healthy") {
    strengths.push({ text: "Constructive session health", weight: 6 });
  }

  return strengths
    .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text))
    .slice(0, 3)
    .map((s) => s.text);
}
