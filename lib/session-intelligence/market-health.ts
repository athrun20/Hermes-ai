/**
 * Market Health — categorical session environment quality.
 * Not product Confidence. Pure / deterministic.
 */

import type {
  LiquidityState,
  MarketHealth,
  MomentumState,
  ParticipationState,
  SessionIntelligenceInput,
  VolatilityState,
} from "@/lib/session-intelligence/types";

export function detectVolatilityState(input: SessionIntelligenceInput): VolatilityState {
  const newsExtreme =
    input.news.urgency === "High" &&
    (input.news.riskCaution?.active || input.news.sentiment === "Negative");
  if (newsExtreme) return "Extreme";

  const candles = input.candles.slice(-12);
  if (candles.length < 4) return "Normal";
  const avg =
    candles.reduce((s, c) => s + (c.high - c.low), 0) / candles.length;
  const price = input.context.currentPrice || candles[candles.length - 1].close;
  const pct = price > 0 ? avg / price : 0;
  if (pct >= 0.018) return "Extreme";
  if (pct >= 0.01) return "Elevated";
  if (pct <= 0.0035) return "Compressed";
  return "Normal";
}

export function detectLiquidityState(input: SessionIntelligenceInput): LiquidityState {
  // Prefer footprint / volume as proxies; no invented book data.
  const vol = input.context.volume;
  const ratio = vol.average > 0 ? vol.current / vol.average : 1;
  if (ratio < 0.55) return "Thin";
  if (input.news.urgency === "High" && ratio < 0.8) return "Dislocated";
  if (ratio >= 0.75) return "Healthy";
  if (vol.status === "Fading") return "Thin";
  return "Unknown";
}

export function detectMomentumState(input: SessionIntelligenceInput): MomentumState {
  const macd = input.context.macd;
  if (!macd) return "Unclear";
  if (macd.histogram > 0 && macd.line > macd.signal) return "Accelerating";
  if (macd.histogram < 0 || macd.line < macd.signal) return "Fading";
  return "Steady";
}

export function detectParticipationState(
  input: SessionIntelligenceInput,
): ParticipationState {
  const vol = input.context.volume;
  const ratio = vol.average > 0 ? vol.current / vol.average : 1;
  if (ratio >= 1.35 || vol.status === "Rising") return "Strong";
  if (ratio < 0.65 || vol.status === "Fading") return "Weak";
  if (ratio < 0.4) return "Absent";
  return "Normal";
}

export function detectMarketHealth(input: SessionIntelligenceInput): MarketHealth {
  const volatility = detectVolatilityState(input);
  const liquidity = detectLiquidityState(input);
  const momentum = detectMomentumState(input);
  const participation = detectParticipationState(input);
  const structureScore = input.vision.setupStructureScore ?? 50;
  const newsBad =
    input.news.urgency === "High" &&
    (input.news.sentiment === "Negative" || input.news.riskCaution?.active);

  let score = 0;
  // Structure
  if (structureScore >= 72) score += 2;
  else if (structureScore >= 55) score += 1;
  else if (structureScore < 40) score -= 2;
  else score -= 1;

  // Volatility
  if (volatility === "Normal") score += 1;
  else if (volatility === "Compressed") score += 0;
  else if (volatility === "Elevated") score -= 1;
  else score -= 2;

  // Liquidity
  if (liquidity === "Healthy") score += 2;
  else if (liquidity === "Thin") score -= 1;
  else if (liquidity === "Dislocated") score -= 2;

  // Participation
  if (participation === "Strong") score += 2;
  else if (participation === "Normal") score += 1;
  else if (participation === "Weak") score -= 1;
  else score -= 2;

  // Momentum
  if (momentum === "Accelerating") score += 1;
  else if (momentum === "Fading") score -= 1;

  // News — event risk dominates environment health
  if (newsBad) score -= 5;
  else if (input.news.urgency === "High") score -= 2;

  let health: MarketHealth;
  if (score >= 6) health = "Excellent";
  else if (score >= 3) health = "Healthy";
  else if (score >= 0) health = "Mixed";
  else if (score >= -3) health = "Weak";
  else health = "Unstable";

  // Hard caps under active event risk
  if (newsBad && (health === "Excellent" || health === "Healthy")) {
    health = "Mixed";
  }
  if (
    newsBad &&
    input.news.sentiment === "Negative" &&
    input.news.riskCaution?.active &&
    health === "Mixed"
  ) {
    health = "Weak";
  }

  return health;
}
