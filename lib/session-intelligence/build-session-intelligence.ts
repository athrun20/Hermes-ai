/**
 * Hermes Session Intelligence v1 — main builder.
 * Pure / deterministic. Educational session evolution only.
 */

import {
  detectMarketHealth,
  detectLiquidityState,
  detectMomentumState,
  detectParticipationState,
  detectVolatilityState,
} from "@/lib/session-intelligence/market-health";
import {
  buildOpportunityWindows,
  detectOpportunityState,
} from "@/lib/session-intelligence/opportunity-state";
import {
  buildCurrentRisks,
  buildCurrentStrengths,
} from "@/lib/session-intelligence/risks-strengths";
import { detectSessionBias, detectSessionPhase } from "@/lib/session-intelligence/session-phase";
import { buildSessionStory } from "@/lib/session-intelligence/session-story";
import { buildSessionSummary } from "@/lib/session-intelligence/session-summary";
import type {
  SessionClarityLabel,
  SessionIntelligence,
  SessionIntelligenceInput,
} from "@/lib/session-intelligence/types";

/**
 * Build session intelligence for the current tape.
 * Does not mutate inputs or product scores.
 */
export function buildSessionIntelligence(
  input: SessionIntelligenceInput,
): SessionIntelligence {
  const now = input.now ?? lastCandleTime(input) ?? Date.now();
  const sessionPhase = detectSessionPhase(input);
  const sessionBias = detectSessionBias(input);
  const volatilityState = detectVolatilityState(input);
  const liquidityState = detectLiquidityState(input);
  const momentumState = detectMomentumState(input);
  const participationState = detectParticipationState(input);
  const marketHealth = detectMarketHealth(input);
  const opportunityState = detectOpportunityState({
    input,
    phase: sessionPhase,
    bias: sessionBias,
    health: marketHealth,
  });
  const sessionStory = buildSessionStory({ input, phase: sessionPhase, now });
  const opportunityWindows = buildOpportunityWindows({
    input,
    phase: sessionPhase,
    bias: sessionBias,
    opportunityState,
  });
  const currentRisks = buildCurrentRisks({
    input,
    phase: sessionPhase,
    health: marketHealth,
    volatility: volatilityState,
    liquidity: liquidityState,
    momentum: momentumState,
    participation: participationState,
  });
  const currentStrengths = buildCurrentStrengths({
    input,
    phase: sessionPhase,
    health: marketHealth,
    momentum: momentumState,
    participation: participationState,
  });
  const sessionSummary = buildSessionSummary({
    phase: sessionPhase,
    bias: sessionBias,
    health: marketHealth,
    opportunityState,
    volatility: volatilityState,
    story: sessionStory,
    risks: currentRisks,
    strengths: currentStrengths,
  });
  const sessionClarity = computeSessionClarityScore({
    input,
    phase: sessionPhase,
    health: marketHealth,
    storyCount: sessionStory.length,
  });
  const sessionClarityLabel = labelFromSessionClarity(sessionClarity);

  return {
    kind: "hermes-session-intelligence-v1",
    sessionPhase,
    sessionBias,
    marketHealth,
    opportunityState,
    volatilityState,
    liquidityState,
    momentumState,
    participationState,
    sessionSummary,
    sessionStory,
    opportunityWindows,
    currentRisks,
    currentStrengths,
    sessionClarity,
    sessionClarityLabel,
    generatedAt: now,
  };
}

/**
 * Internal 0–100 session-read clarity score.
 * Calculation preserved from sessionConfidence rename — not product Confidence.
 */
function computeSessionClarityScore(args: {
  input: SessionIntelligenceInput;
  phase: SessionPhaseLike;
  health: string;
  storyCount: number;
}): number {
  let clarity = 45;
  if (args.phase !== "Unknown") clarity += 15;
  if (args.input.candles.length >= 12) clarity += 10;
  if (args.input.candles.length >= 24) clarity += 5;
  if (args.storyCount >= 3) clarity += 10;
  if (args.health === "Excellent" || args.health === "Healthy") clarity += 8;
  if (args.health === "Unstable") clarity -= 10;
  if (args.input.news.urgency === "High") clarity -= 5;
  if ((args.input.vision.setupStructureScore ?? 0) >= 60) clarity += 5;
  return Math.max(0, Math.min(100, Math.round(clarity)));
}

/** Map internal clarity score to user-facing categorical label. */
export function labelFromSessionClarity(score: number): SessionClarityLabel {
  if (score >= 70) return "Clear Read";
  if (score >= 45) return "Developing Read";
  return "Unclear Read";
}

type SessionPhaseLike = string;

function lastCandleTime(input: SessionIntelligenceInput): number | null {
  const last = input.candles[input.candles.length - 1];
  return last && Number.isFinite(last.time) ? last.time : null;
}
