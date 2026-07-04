import type { ConfidenceEngine, MarketCandidate } from "@/lib/opportunity-types";

export const ruleBasedConfidenceEngine: ConfidenceEngine = {
  analyzeConfidence: (candidate) => calculateRuleBasedConfidence(candidate),
};

function calculateRuleBasedConfidence(candidate: MarketCandidate) {
  const breakdown = [
    {
      label: "Trend" as const,
      score: candidate.trend === "Bullish" ? 40 : candidate.trend === "Neutral" ? 24 : 12,
    },
    {
      label: "Momentum" as const,
      score: Math.round(candidate.momentumScore * 0.25),
    },
    {
      label: "Volume" as const,
      score: candidate.volumeTrend === "Increasing" ? 15 : candidate.volumeTrend === "Stable" ? 9 : 3,
    },
    {
      label: "Support" as const,
      score: candidate.supportHeld ? 10 : 4,
    },
    {
      label: "Risk" as const,
      score: candidate.riskLevel === "Low" ? 10 : candidate.riskLevel === "Medium" ? 7 : 3,
    },
  ];
  const score = clamp(
    Math.round(breakdown.reduce((sum, item) => sum + item.score, 0)),
  );

  return {
    score,
    breakdown,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
