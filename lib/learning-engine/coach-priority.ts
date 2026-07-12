/**
 * Phase 4 — Coach display priority.
 * Real-time market / risk coaching outranks personalized learning history.
 */

import type { HermesCoachMoment } from "@/lib/hermes-coach-types";

/**
 * Suggested priority (highest first):
 * 1. Critical market or risk coaching
 * 2. Active-position management
 * 3. Decision guidance
 * 4. Personalized learning coaching
 * 5. General educational fallback
 */
export type CoachDisplayLane =
  | "critical_market"
  | "active_position"
  | "decision"
  | "personalized"
  | "fallback";

export type CoachPriorityContext = {
  /** Critical risk warning from live analysis */
  hasCriticalRiskWarning?: boolean;
  /** Thesis invalidation conditions active */
  hasThesisInvalidation?: boolean;
  /** Stop-risk / invalidation distance concern */
  hasStopRiskWarning?: boolean;
  /** High event / news risk */
  hasEventRiskWarning?: boolean;
  /** Open position needs management coaching */
  hasActivePositionManagement?: boolean;
  /** Any open paper positions */
  hasOpenPositions?: boolean;
  /** Decision review modal / flow is active */
  isDecisionReviewActive?: boolean;
  /** Trigger moment when known */
  moment?: HermesCoachMoment | string;
  /**
   * Explicit lane override from caller (e.g. tests).
   * When set to a blocking lane, personalized is suppressed.
   */
  forcedLane?: CoachDisplayLane;
};

/** Moments that always carry decision / execution coaching (never replaced). */
export const HIGH_PRIORITY_COACH_MOMENTS: ReadonlySet<string> = new Set([
  "trade-plan-created",
  "decision-review-completed",
  "paper-trade-executed",
]);

/**
 * Resolve which coach lane should win for the current context.
 */
export function resolveCoachDisplayLane(
  context: CoachPriorityContext = {},
): CoachDisplayLane {
  if (context.forcedLane) return context.forcedLane;

  if (
    context.hasCriticalRiskWarning ||
    context.hasThesisInvalidation ||
    context.hasStopRiskWarning ||
    context.hasEventRiskWarning
  ) {
    return "critical_market";
  }

  if (context.hasActivePositionManagement) {
    return "active_position";
  }

  if (context.isDecisionReviewActive) {
    return "decision";
  }

  if (context.moment && HIGH_PRIORITY_COACH_MOMENTS.has(context.moment)) {
    return "decision";
  }

  // Open positions alone do not block learning if not in active management mode.
  return "personalized";
}

/**
 * True when personalized learning coaching may surface.
 */
export function canSurfacePersonalizedLearning(
  context: CoachPriorityContext = {},
): boolean {
  const lane = resolveCoachDisplayLane(context);
  return lane === "personalized" || lane === "fallback";
}

/**
 * Rank helper for tests / multi-candidate selection (lower = higher priority).
 */
export function coachLanePriorityRank(lane: CoachDisplayLane): number {
  switch (lane) {
    case "critical_market":
      return 1;
    case "active_position":
      return 2;
    case "decision":
      return 3;
    case "personalized":
      return 4;
    case "fallback":
      return 5;
    default:
      return 99;
  }
}
