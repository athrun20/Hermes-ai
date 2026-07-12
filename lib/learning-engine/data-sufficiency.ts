/**
 * Shared data-sufficiency helpers for Phase 3 coaching.
 */

import {
  COACHING_DATA_THRESHOLDS,
  type DataSufficiency,
  type DetectedPattern,
  type TradeLearningSummary,
  type TraderMemoryStore,
} from "@/lib/learning-engine/types";

/**
 * Ladder based on completed-trade sample size.
 * Behavior-level recurrence is enforced separately by callers.
 */
export function dataSufficiencyFromSampleSize(sampleSize: number): DataSufficiency {
  if (sampleSize <= COACHING_DATA_THRESHOLDS.insufficientMax) return "Insufficient Data";
  if (sampleSize <= COACHING_DATA_THRESHOLDS.earlySignalMax) return "Early Signal";
  if (sampleSize <= COACHING_DATA_THRESHOLDS.developingMax) return "Developing Pattern";
  return "Reliable Pattern";
}

/**
 * Behavior may be called recurring only when sample + occurrences clear thresholds.
 */
export function canClaimRecurringBehavior(
  sampleSize: number,
  observationCount: number,
): boolean {
  if (sampleSize < 3 || observationCount < 2) return false;
  if (sampleSize < 5) return observationCount >= 2; // Early Signal: soft claim only
  return observationCount >= 3;
}

export function coachingConfidenceFromSufficiency(
  sufficiency: DataSufficiency,
  patternReliable: boolean,
  observationCount: number,
): number {
  const base =
    sufficiency === "Insufficient Data"
      ? 12
      : sufficiency === "Early Signal"
        ? 28
        : sufficiency === "Developing Pattern"
          ? 52
          : 72;
  const bump = patternReliable ? 10 : 0;
  const freq = Math.min(12, observationCount * 2);
  return Math.max(0, Math.min(92, base + bump + freq));
}

export function tradeDateRange(trades: TradeLearningSummary[]): {
  start: number | null;
  end: number | null;
} {
  if (trades.length === 0) return { start: null, end: null };
  const times = trades.map((t) => t.timestamp);
  return { start: Math.min(...times), end: Math.max(...times) };
}

export function eventIdsForPattern(
  store: TraderMemoryStore,
  pattern: DetectedPattern | null,
  limit = 6,
): string[] {
  if (!pattern) return store.tradeSummaries.slice(0, limit).map((t) => t.eventId);
  const key = String(pattern.key);
  const matched = store.tradeSummaries.filter((t) => {
    if (key === "plan_followed" || key === "planned_wins") return t.followedPlan === true;
    if (key === "plan_broken" || key === "broken_plan_losses") return t.followedPlan === false;
    if (key === "good_entry_timing" || key === "good_exit_discipline") {
      return t.qualityBand === "High" && t.outcome === "Win";
    }
    if (key === "strong_patience") return t.holdBucket === "Swing" && t.outcome === "Win";
    if (key === "entering_too_early") {
      return t.holdBucket === "Scalp" || t.tags.includes("early_entry");
    }
    return t.tags.some((tag) => tag.includes(key.replace(/_/g, "")) || tag.includes(String(key)));
  });
  const ids = (matched.length > 0 ? matched : store.tradeSummaries).map((t) => t.eventId);
  return [...new Set(ids)].slice(0, limit);
}
