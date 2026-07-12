/**
 * Phase 4 — Safe orchestration for read-only personalized coach surfacing.
 * Never throws into user workflows. Never blocks trading.
 * Learning Engine remains coaching-only.
 */

import {
  applyMessageDismissed,
  applyMessageShown,
  loadLearningCoachDisplayState,
  saveLearningCoachDisplayState,
  shouldShowPersonalizedMessage,
  type LearningCoachDisplayState,
} from "@/lib/learning-engine/coach-cooldown";
import {
  canSurfacePersonalizedLearning,
  type CoachPriorityContext,
} from "@/lib/learning-engine/coach-priority";
import {
  learningCoachingToCoachMessage,
  weeklyLearningToBriefLines,
  type PersonalizedCoachPresentation,
  type WeeklyLearningBriefLines,
} from "@/lib/learning-engine/coach-presentation";
import {
  getPersonalizedCoachingSnapshot,
  getWeeklyLearningReviewSnapshot,
} from "@/lib/learning-engine/service";
import type { PersonalizedCoachingSummary } from "@/lib/learning-engine/types";
import type { HermesCoachMessage } from "@/lib/hermes-coach-types";

export type { PersonalizedCoachPresentation, WeeklyLearningBriefLines };

export type BuildPersonalizedCoachOptions = {
  priority?: CoachPriorityContext;
  summary?: PersonalizedCoachingSummary | null;
  now?: number;
  /** When true, do not mutate cooldown state (preview / tests). */
  dryRun?: boolean;
  /** Injected display state (tests). */
  displayState?: LearningCoachDisplayState;
  /** Skip cooldown check (tests only). */
  ignoreCooldown?: boolean;
};

export type PersonalizedCoachBuildResult = {
  message: HermesCoachMessage | null;
  presentation: PersonalizedCoachPresentation | null;
  suppressedReason?: string;
};

/**
 * Build at most one HermesCoachMessage from Learning Engine coaching.
 * Returns null when ineligible, suppressed by priority, or on cooldown.
 * Failure-isolated: never throws.
 */
export function buildPersonalizedHermesCoachMessage(
  options: BuildPersonalizedCoachOptions = {},
): PersonalizedCoachBuildResult {
  try {
    if (!canSurfacePersonalizedLearning(options.priority ?? {})) {
      return {
        message: null,
        presentation: null,
        suppressedReason: "priority_block",
      };
    }

    const summary =
      options.summary === undefined
        ? safeGetCoachingSummary(options.now)
        : options.summary;

    if (!summary) {
      return {
        message: null,
        presentation: null,
        suppressedReason: "no_summary",
      };
    }

    const presentation = learningCoachingToCoachMessage(summary);
    if (!presentation) {
      return {
        message: null,
        presentation: null,
        suppressedReason: "not_eligible",
      };
    }

    let state = options.displayState ?? loadLearningCoachDisplayState();
    if (!options.ignoreCooldown) {
      const decision = shouldShowPersonalizedMessage({
        messageId: presentation.messageId,
        focusKey: presentation.focusKey,
        state,
        now: options.now,
      });
      if (!decision.show) {
        return {
          message: null,
          presentation,
          suppressedReason: decision.reason,
        };
      }
    }

    if (!options.dryRun) {
      state = applyMessageShown(state, {
        messageId: presentation.messageId,
        focusKey: presentation.focusKey,
        now: options.now,
      });
      saveLearningCoachDisplayState(state);
    }

    const message = presentationToHermesCoachMessage(presentation);
    return { message, presentation };
  } catch (error) {
    devWarn("buildPersonalizedHermesCoachMessage failed; coach continues.", error);
    return {
      message: null,
      presentation: null,
      suppressedReason: "error",
    };
  }
}

/**
 * Map presentation → existing HermesCoachMessage contract.
 */
export function presentationToHermesCoachMessage(
  presentation: PersonalizedCoachPresentation,
): HermesCoachMessage {
  return {
    id: presentation.messageId,
    moment: "personalized-learning",
    category: "Growth",
    title: presentation.title,
    message: presentation.body,
    actionLabel: presentation.actionLabel,
  };
}

/**
 * Record dismiss for cooldown (compatible with HermesCoachCard dismiss).
 * Never throws.
 */
export function recordPersonalizedCoachDismiss(
  messageId: string | null | undefined,
  options?: { now?: number },
): void {
  try {
    if (!messageId || !messageId.startsWith("personalized:")) return;
    const state = applyMessageDismissed(loadLearningCoachDisplayState(), {
      messageId,
      now: options?.now,
    });
    saveLearningCoachDisplayState(state);
  } catch (error) {
    devWarn("recordPersonalizedCoachDismiss failed; ignored.", error);
  }
}

/**
 * One-line habit advice for existing post-trade HermesCoach panel.
 * Failure-isolated; returns null so callers keep prior advice.
 */
export function buildPersonalizedHabitAdviceLine(
  summary?: PersonalizedCoachingSummary | null,
  now?: number,
): string | null {
  try {
    const resolved =
      summary === undefined ? safeGetCoachingSummary(now) : summary;
    const presentation = learningCoachingToCoachMessage(resolved);
    if (!presentation) return null;
    // Prefer single sentence without evidence label for panel row density.
    return presentation.message;
  } catch (error) {
    devWarn("buildPersonalizedHabitAdviceLine failed; ignored.", error);
    return null;
  }
}

/**
 * Compact weekly lines for existing briefing surfaces.
 * Returns null on failure or insufficient data (caller keeps prior copy).
 */
export function getWeeklyLearningBriefLinesSafe(options?: {
  now?: number;
  timeZone?: string;
}): WeeklyLearningBriefLines | null {
  try {
    const weekly = getWeeklyLearningReviewSnapshot({
      now: options?.now,
      timeZone: options?.timeZone,
    });
    return weeklyLearningToBriefLines(weekly);
  } catch (error) {
    devWarn("getWeeklyLearningBriefLinesSafe failed; ignored.", error);
    return null;
  }
}

function safeGetCoachingSummary(now?: number): PersonalizedCoachingSummary | null {
  try {
    return getPersonalizedCoachingSnapshot({ now });
  } catch (error) {
    devWarn("getPersonalizedCoachingSnapshot failed; ignored.", error);
    return null;
  }
}

function devWarn(message: string, error?: unknown): void {
  if (typeof console === "undefined" || typeof console.warn !== "function") return;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.warn(`[Hermes Learning Engine] ${message}`, error ?? "");
}
