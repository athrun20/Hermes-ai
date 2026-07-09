import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import { scoreStrategy, type StrategyScoringContext } from "@/lib/strategy-scoring";
import type { StrategyIntelligenceResult, StrategyType } from "@/lib/strategy-types";

const supportedStrategies: StrategyType[] = [
  "Trend Pullback",
  "Momentum Breakout",
  "Range Trading",
  "Trend Continuation",
  "Reversal",
  "Support Bounce",
  "Resistance Rejection",
  "VWAP Reclaim",
  "Opening Range Breakout",
  "Consolidation",
];

export function analyzeStrategyIntelligence({
  context,
  vision,
  news,
  traderMemory,
  confidence,
  timeframe,
}: {
  context: HermesVisionContext;
  vision: HermesVisionResult;
  news: NewsIntelligenceResult;
  traderMemory: HermesMemorySnapshot;
  confidence: number;
  timeframe: string;
}): StrategyIntelligenceResult {
  const scoringContext: StrategyScoringContext = {
    context,
    vision,
    news,
    traderMemory,
    confidence,
    timeframe,
  };
  const strategies = supportedStrategies
    .map((strategy) => scoreStrategy(strategy, scoringContext))
    .sort((a, b) => b.score - a.score);
  const best = strategies[0];
  const noValid = scoreStrategy("No Valid Strategy", scoringContext);
  const currentStrategy = best.score >= 48 && best.score >= noValid.score ? best : noValid;

  return {
    currentStrategy,
    strategies: [currentStrategy, ...strategies.filter((strategy) => strategy.type !== currentStrategy.type)].slice(0, 5),
  };
}
