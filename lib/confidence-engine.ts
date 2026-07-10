import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import {
  buildWeightedConfidenceEngine,
  type WeightedConfidenceEngineResult,
} from "@/lib/hermes-mentor-intelligence";
import type { ReasoningResult } from "@/lib/reasoning-types";

export type LiveConfidenceSnapshot = WeightedConfidenceEngineResult & {
  changedBy: number;
};

export function buildLiveConfidenceSnapshot({
  hermesScore,
  news,
  previousScore,
  reasoning,
  chartConfidenceDelta,
}: {
  hermesScore: HermesScoreResult;
  news: NewsIntelligenceResult;
  previousScore?: number;
  reasoning?: ReasoningResult;
  chartConfidenceDelta?: number;
}): LiveConfidenceSnapshot {
  const confidence = buildWeightedConfidenceEngine({ hermesScore, news, reasoning, chartConfidenceDelta });

  return {
    ...confidence,
    changedBy: typeof previousScore === "number" ? confidence.score - previousScore : 0,
  };
}

export function applyConfidenceDelta(score: number, delta: number) {
  return Math.max(0, Math.min(100, Math.round(score + delta)));
}
