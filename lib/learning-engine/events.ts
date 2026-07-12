/**
 * Learning event factories — pure, deterministic for identical inputs.
 */

import type { CoinSymbol } from "@/lib/market-data";
import type {
  LearningEvent,
  LearningEventOutcome,
  LearningEventSource,
  LearningEventType,
} from "@/lib/learning-engine/types";

export type CreateLearningEventInput = {
  id: string;
  timestamp: number;
  eventType: LearningEventType;
  source: LearningEventSource | string;
  symbol?: CoinSymbol | string;
  timeframe?: string;
  strategyContext?: string;
  outcome?: LearningEventOutcome;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * Create a typed learning event. Throws only for invalid programmer inputs.
 */
export function createLearningEvent(input: CreateLearningEventInput): LearningEvent {
  if (!input.id || typeof input.id !== "string") {
    throw new Error("createLearningEvent: id is required.");
  }
  if (!Number.isFinite(input.timestamp)) {
    throw new Error("createLearningEvent: timestamp must be a finite number.");
  }
  if (!input.eventType) {
    throw new Error("createLearningEvent: eventType is required.");
  }
  if (!input.source) {
    throw new Error("createLearningEvent: source is required.");
  }

  return {
    id: input.id,
    timestamp: input.timestamp,
    eventType: input.eventType,
    source: input.source,
    symbol: input.symbol,
    timeframe: input.timeframe,
    strategyContext: input.strategyContext,
    outcome: input.outcome,
    tags: uniqueTags(input.tags ?? []),
    metadata: input.metadata ? { ...input.metadata } : undefined,
  };
}

export type TradeCompletedInput = {
  id: string;
  timestamp: number;
  symbol: CoinSymbol | string;
  timeframe?: string;
  strategyContext?: string;
  side?: "Long" | "Short";
  pnl: number;
  followedPlan?: boolean;
  qualityScore?: number;
  holdMinutes?: number;
  tags?: string[];
  source?: LearningEventSource | string;
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * Map a completed paper trade into a TradeCompleted learning event.
 * Does not mutate paper-trading state.
 */
export function createTradeCompletedEvent(input: TradeCompletedInput): LearningEvent {
  const outcome = outcomeFromPnl(input.pnl);
  const tags = uniqueTags([
    ...(input.tags ?? []),
    outcome === "Win" ? "win" : outcome === "Loss" ? "loss" : "flat",
    input.followedPlan === true ? "plan_followed" : input.followedPlan === false ? "plan_broken" : "",
    input.side === "Long" ? "long" : input.side === "Short" ? "short" : "",
  ]);

  return createLearningEvent({
    id: input.id,
    timestamp: input.timestamp,
    eventType: "TradeCompleted",
    source: input.source ?? "paper-trading",
    symbol: input.symbol,
    timeframe: input.timeframe,
    strategyContext: input.strategyContext,
    outcome,
    tags,
    metadata: {
      pnl: input.pnl,
      followedPlan: input.followedPlan ?? null,
      qualityScore: input.qualityScore ?? null,
      holdMinutes: input.holdMinutes ?? null,
      side: input.side ?? null,
      ...input.metadata,
    },
  });
}

export function createTradeReviewedEvent(input: {
  id: string;
  timestamp: number;
  symbol?: string;
  outcome?: LearningEventOutcome;
  tags?: string[];
  lesson?: string;
  source?: string;
}): LearningEvent {
  return createLearningEvent({
    id: input.id,
    timestamp: input.timestamp,
    eventType: "TradeReviewed",
    source: input.source ?? "decision-journal",
    symbol: input.symbol,
    outcome: input.outcome ?? "Neutral",
    tags: uniqueTags([...(input.tags ?? []), "review"]),
    metadata: {
      lesson: input.lesson ?? null,
    },
  });
}

export function createJournalReflectionEvent(input: {
  id: string;
  timestamp: number;
  tags?: string[];
  reflection?: string;
  source?: string;
}): LearningEvent {
  // Privacy: only persist structured reflection text when explicitly provided.
  // Callers that map journal UI should omit freeform text entirely.
  return createLearningEvent({
    id: input.id,
    timestamp: input.timestamp,
    eventType: "JournalReflectionAdded",
    source: input.source ?? "decision-journal",
    outcome: "Neutral",
    tags: uniqueTags([...(input.tags ?? []), "journal"]),
    metadata: input.reflection
      ? {
          reflection: input.reflection,
        }
      : {
          structuredOnly: true,
        },
  });
}

export function createReplayCompletedEvent(input: {
  id: string;
  timestamp: number;
  symbol?: string;
  timeframe?: string;
  tags?: string[];
  lesson?: string;
}): LearningEvent {
  return createLearningEvent({
    id: input.id,
    timestamp: input.timestamp,
    eventType: "ReplayCompleted",
    source: "replay-mode",
    symbol: input.symbol,
    timeframe: input.timeframe,
    outcome: "Neutral",
    tags: uniqueTags([...(input.tags ?? []), "replay"]),
    metadata: {
      lesson: input.lesson ?? null,
    },
  });
}

export function createCoachingFeedbackEvent(input: {
  id: string;
  timestamp: number;
  tags?: string[];
  feedback?: string;
}): LearningEvent {
  return createLearningEvent({
    id: input.id,
    timestamp: input.timestamp,
    eventType: "CoachingFeedbackReceived",
    source: "coach",
    outcome: "Neutral",
    tags: uniqueTags([...(input.tags ?? []), "coaching"]),
    metadata: {
      feedback: input.feedback ?? null,
    },
  });
}

export function outcomeFromPnl(pnl: number): LearningEventOutcome {
  if (!Number.isFinite(pnl) || pnl === 0) return "Breakeven";
  return pnl > 0 ? "Win" : "Loss";
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}
