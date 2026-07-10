import type { EvidenceCategory } from "@/lib/reasoning-types";

export const reasoningConfidenceWeights: Record<EvidenceCategory, number> = {
  "Market Structure": 18,
  "Multi-Timeframe Alignment": 18,
  "Trend Quality": 12,
  "Institutional Activity": 12,
  "Volume Quality": 10,
  Momentum: 8,
  "Risk/Reward": 10,
  "News and Event Risk": 6,
  "Trader DNA Fit": 6,
  "Trade Plan": 0,
  "Portfolio Exposure": 0,
};

export const reasoningPipeline = [
  "Observe",
  "Interpret",
  "Challenge",
  "Validate",
  "Decide",
  "Coach",
  "Learn",
] as const;

export const MAX_REASONING_CONFIDENCE = 95;
