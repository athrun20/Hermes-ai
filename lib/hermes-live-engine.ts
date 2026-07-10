import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import { buildLiveConfidenceSnapshot, type LiveConfidenceSnapshot } from "@/lib/confidence-engine";
import { buildLiveMentorMessage } from "@/lib/live-mentor";
import { buildTimelineEvents } from "@/lib/timeline-engine";
import type { LiveTimelineEvent } from "@/lib/timeline-events";

export type HermesLiveIntelligence = {
  kind: "hermes-live-intelligence-v1";
  symbol: string;
  generatedAt: number;
  confidence: LiveConfidenceSnapshot;
  mentorMessage: string;
  events: LiveTimelineEvent[];
};

export function buildHermesLiveIntelligence({
  context,
  vision,
  hermesScore,
  news,
  memory,
  previousConfidence,
  footprint,
  reasoning,
  chartConfidenceDelta,
}: {
  context: HermesVisionContext;
  vision: HermesVisionResult;
  hermesScore: HermesScoreResult;
  news: NewsIntelligenceResult;
  memory: HermesMemorySnapshot;
  previousConfidence?: number;
  footprint?: InstitutionalFootprintResult;
  reasoning?: ReasoningResult;
  chartConfidenceDelta?: number;
}): HermesLiveIntelligence {
  const confidence = buildLiveConfidenceSnapshot({
    hermesScore,
    news,
    previousScore: previousConfidence,
    reasoning,
    chartConfidenceDelta,
  });
  const events = buildTimelineEvents({
    context,
    vision,
    confidence,
    news,
    memory,
    footprint,
    reasoning,
  });

  return {
    kind: "hermes-live-intelligence-v1",
    symbol: context.symbol,
    generatedAt: Date.now(),
    confidence,
    mentorMessage: buildLiveMentorMessage(events),
    events,
  };
}
