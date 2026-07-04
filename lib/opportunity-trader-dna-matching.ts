import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type {
  MarketCandidate,
  TraderDnaMatcher,
} from "@/lib/opportunity-types";

export const ruleBasedTraderDnaMatcher: TraderDnaMatcher = {
  match: (candidate, memory) => matchTraderDna(candidate, memory),
};

function matchTraderDna(candidate: MarketCandidate, memory?: HermesMemorySnapshot) {
  if (!memory || memory.performance.totalTrades < 3) {
    return {
      traderDnaMatch: "Moderate Match" as const,
      dnaExplanation:
        "Hermes needs more completed paper trades before making a confident DNA match. Study the setup, but keep size modest in paper mode.",
    };
  }

  const dominantStyle = memory.strategyPreference.dominantStyle;
  const riskFit = candidate.riskLevel !== "High" || memory.scores.riskManagement >= 75;
  const patienceFit =
    candidate.setupType !== "Trend Continuation" || memory.scores.patience >= 65;
  const styleFit =
    (dominantStyle === "breakout" && candidate.setupType === "Breakout") ||
    (dominantStyle === "reversal" && candidate.setupType === "Range Reversal") ||
    (dominantStyle === "swing" && candidate.setupType === "Trend Continuation") ||
    dominantStyle === "balanced";

  if (styleFit && riskFit && patienceFit) {
    return {
      traderDnaMatch: "Excellent Match" as const,
      dnaExplanation:
        "This setup aligns with your current Trader DNA strengths and does not push against your main behavior risks.",
    };
  }

  if ((styleFit || riskFit) && patienceFit) {
    return {
      traderDnaMatch: "Moderate Match" as const,
      dnaExplanation:
        "This setup shares part of your Trader DNA, but Hermes would still require confirmation before studying it deeply.",
    };
  }

  return {
    traderDnaMatch: "Poor Match" as const,
    dnaExplanation:
      "This setup does not currently match your strongest habits. Study it for education, not urgency.",
  };
}
