/**
 * Phase 4 — Personalized coach cooldown / de-duplication state.
 * Pure helpers + optional localStorage persistence.
 * Prevents identical personalized lessons from spamming every render.
 */

export const LEARNING_COACH_DISPLAY_STORAGE_KEY = "hermes-learning-coach-display-v1";

/** Default cooldown before resurfacing the same personalized message id. */
export const PERSONALIZED_COACH_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

export type LearningCoachDisplayState = {
  kind: "hermes-learning-coach-display-v1";
  version: 1;
  /** Last personalized message id that was shown */
  lastShownMessageId: string | null;
  lastShownAt: number | null;
  /** Last dismissed message id (extends suppress window) */
  lastDismissedMessageId: string | null;
  lastDismissedAt: number | null;
  /** Focus key of last shown message — change allows early replace */
  lastFocusKey: string | null;
};

export function createEmptyLearningCoachDisplayState(): LearningCoachDisplayState {
  return {
    kind: "hermes-learning-coach-display-v1",
    version: 1,
    lastShownMessageId: null,
    lastShownAt: null,
    lastDismissedMessageId: null,
    lastDismissedAt: null,
    lastFocusKey: null,
  };
}

export type PersonalizedShowDecision = {
  show: boolean;
  reason:
    | "eligible"
    | "same_message_cooldown"
    | "dismissed_cooldown"
    | "duplicate_render"
    | "missing_id";
};

/**
 * Decide whether a personalized message may be shown given cooldown state.
 * A changed focusKey may replace the prior lesson before cooldown ends.
 */
export function shouldShowPersonalizedMessage(args: {
  messageId: string;
  focusKey: string;
  state: LearningCoachDisplayState;
  now?: number;
  cooldownMs?: number;
}): PersonalizedShowDecision {
  const now = args.now ?? Date.now();
  const cooldownMs = args.cooldownMs ?? PERSONALIZED_COACH_COOLDOWN_MS;
  const { messageId, focusKey, state } = args;

  if (!messageId) {
    return { show: false, reason: "missing_id" };
  }

  // Explicit dismiss of this id within cooldown (check before shown-id).
  if (
    state.lastDismissedMessageId === messageId &&
    state.lastDismissedAt != null &&
    now - state.lastDismissedAt < cooldownMs
  ) {
    return { show: false, reason: "dismissed_cooldown" };
  }

  // Same id within cooldown → suppress (covers re-render spam).
  if (
    state.lastShownMessageId === messageId &&
    state.lastShownAt != null &&
    now - state.lastShownAt < cooldownMs
  ) {
    return { show: false, reason: "same_message_cooldown" };
  }

  // New stronger / different focus may replace even if another message was recent.
  if (
    state.lastFocusKey &&
    state.lastFocusKey !== focusKey &&
    state.lastShownMessageId &&
    state.lastShownMessageId !== messageId
  ) {
    return { show: true, reason: "eligible" };
  }

  // Different message id after cooldown on previous, or first show.
  if (
    state.lastShownMessageId &&
    state.lastShownMessageId !== messageId &&
    state.lastShownAt != null &&
    now - state.lastShownAt < cooldownMs &&
    state.lastFocusKey === focusKey
  ) {
    // Same focus, different wording bucket — still cool down.
    return { show: false, reason: "same_message_cooldown" };
  }

  return { show: true, reason: "eligible" };
}

export function applyMessageShown(
  state: LearningCoachDisplayState,
  args: { messageId: string; focusKey: string; now?: number },
): LearningCoachDisplayState {
  const now = args.now ?? Date.now();
  return {
    ...state,
    lastShownMessageId: args.messageId,
    lastShownAt: now,
    lastFocusKey: args.focusKey,
  };
}

export function applyMessageDismissed(
  state: LearningCoachDisplayState,
  args: { messageId: string; now?: number },
): LearningCoachDisplayState {
  const now = args.now ?? Date.now();
  return {
    ...state,
    lastDismissedMessageId: args.messageId,
    lastDismissedAt: now,
    // Treat dismiss as a show for cooldown of the same id.
    lastShownMessageId: args.messageId,
    lastShownAt: now,
  };
}

/**
 * Load display state from localStorage. Never throws; recovers empty on error.
 */
export function loadLearningCoachDisplayState(
  storage?: Pick<Storage, "getItem"> | null,
): LearningCoachDisplayState {
  try {
    const store =
      storage ??
      (typeof globalThis !== "undefined" && "localStorage" in globalThis
        ? (globalThis as { localStorage?: Storage }).localStorage
        : null);
    if (!store) return createEmptyLearningCoachDisplayState();
    const raw = store.getItem(LEARNING_COACH_DISPLAY_STORAGE_KEY);
    if (!raw) return createEmptyLearningCoachDisplayState();
    const parsed = JSON.parse(raw) as Partial<LearningCoachDisplayState>;
    if (parsed.kind !== "hermes-learning-coach-display-v1" || parsed.version !== 1) {
      return createEmptyLearningCoachDisplayState();
    }
    return {
      ...createEmptyLearningCoachDisplayState(),
      lastShownMessageId:
        typeof parsed.lastShownMessageId === "string" ? parsed.lastShownMessageId : null,
      lastShownAt: typeof parsed.lastShownAt === "number" ? parsed.lastShownAt : null,
      lastDismissedMessageId:
        typeof parsed.lastDismissedMessageId === "string"
          ? parsed.lastDismissedMessageId
          : null,
      lastDismissedAt:
        typeof parsed.lastDismissedAt === "number" ? parsed.lastDismissedAt : null,
      lastFocusKey: typeof parsed.lastFocusKey === "string" ? parsed.lastFocusKey : null,
    };
  } catch {
    return createEmptyLearningCoachDisplayState();
  }
}

/**
 * Persist display state. Returns false on failure (non-blocking).
 */
export function saveLearningCoachDisplayState(
  state: LearningCoachDisplayState,
  storage?: Pick<Storage, "setItem"> | null,
): boolean {
  try {
    const store =
      storage ??
      (typeof globalThis !== "undefined" && "localStorage" in globalThis
        ? (globalThis as { localStorage?: Storage }).localStorage
        : null);
    if (!store) return false;
    store.setItem(LEARNING_COACH_DISPLAY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
