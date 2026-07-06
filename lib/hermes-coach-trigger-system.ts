"use client";

import { buildHermesCoachMessage } from "@/lib/hermes-coach-engine";
import type { HermesCoachMessage, HermesCoachTrigger } from "@/lib/hermes-coach-types";

export const HERMES_COACH_EVENT = "hermes-coach-message";

export function triggerHermesCoach(trigger: HermesCoachTrigger) {
  if (typeof window === "undefined") return;

  const message = buildHermesCoachMessage(trigger);
  window.dispatchEvent(
    new CustomEvent<HermesCoachMessage>(HERMES_COACH_EVENT, {
      detail: message,
    }),
  );
}
