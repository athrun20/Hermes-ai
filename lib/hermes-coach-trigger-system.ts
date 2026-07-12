"use client";

import { buildHermesCoachMessage } from "@/lib/hermes-coach-engine";
import type { HermesCoachMessage, HermesCoachTrigger } from "@/lib/hermes-coach-types";
import {
  buildPersonalizedHermesCoachMessage,
  type BuildPersonalizedCoachOptions,
} from "@/lib/learning-engine/coach-integration";
import {
  canSurfacePersonalizedLearning,
  HIGH_PRIORITY_COACH_MOMENTS,
  type CoachPriorityContext,
} from "@/lib/learning-engine/coach-priority";

export const HERMES_COACH_EVENT = "hermes-coach-message";

export type TriggerHermesCoachOptions = HermesCoachTrigger & {
  /** Live risk / decision context for priority gating. */
  priority?: CoachPriorityContext;
  /**
   * When true (default for calm moments), prefer one personalized learning
   * message over the generic moment copy if eligible and not on cooldown.
   * High-priority moments never replace with personalized coaching.
   */
  preferPersonalizedLearning?: boolean;
};

/**
 * Dispatch a Hermes Coach toast. Failure-isolated for learning path.
 * High-priority market/decision moments always use the moment message.
 */
export function triggerHermesCoach(trigger: TriggerHermesCoachOptions) {
  if (typeof window === "undefined") return;

  try {
    const moment = trigger.moment;
    const isHighPriority = HIGH_PRIORITY_COACH_MOMENTS.has(moment);
    const preferPersonalized =
      trigger.preferPersonalizedLearning ??
      (moment === "morning-briefing-completed" ||
        moment === "end-of-day" ||
        moment === "replay-finished");

    if (!isHighPriority && preferPersonalized) {
      const priority: CoachPriorityContext = {
        ...(trigger.priority ?? {}),
        moment,
      };
      if (canSurfacePersonalizedLearning(priority)) {
        const personalized = buildPersonalizedHermesCoachMessage({ priority });
        if (personalized.message) {
          dispatchCoachMessage(personalized.message);
          return;
        }
      }
    }

    const message = buildHermesCoachMessage(trigger);
    dispatchCoachMessage(message);
  } catch {
    // Never block the host workflow if coach dispatch fails.
    try {
      const message = buildHermesCoachMessage(trigger);
      dispatchCoachMessage(message);
    } catch {
      // ignore
    }
  }
}

/**
 * Explicit personalized-only trigger (calm moments / tests).
 * Respects priority + cooldown. Never throws.
 */
export function triggerPersonalizedLearningCoach(
  options: BuildPersonalizedCoachOptions = {},
): HermesCoachMessage | null {
  if (typeof window === "undefined") return null;
  try {
    const result = buildPersonalizedHermesCoachMessage(options);
    if (result.message) {
      dispatchCoachMessage(result.message);
    }
    return result.message;
  } catch {
    return null;
  }
}

function dispatchCoachMessage(message: HermesCoachMessage) {
  window.dispatchEvent(
    new CustomEvent<HermesCoachMessage>(HERMES_COACH_EVENT, {
      detail: message,
    }),
  );
}
