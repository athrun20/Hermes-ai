/**
 * Deterministic trader pattern detection from summarized memory.
 * Observable behaviors only — not personality diagnosis.
 */

import {
  LEARNING_MEMORY_CAPS,
  type BehaviorKey,
  type DetectedPattern,
  type TraderMemoryStore,
} from "@/lib/learning-engine/types";

const STRENGTH_LABELS: Partial<Record<BehaviorKey, string>> = {
  good_risk_control: "Good risk control",
  strong_patience: "Strong patience",
  good_trend_identification: "Good trend identification",
  good_entry_timing: "Good entry timing",
  good_exit_discipline: "Good exit discipline",
  plan_followed: "Plan discipline",
};

const WEAKNESS_LABELS: Partial<Record<BehaviorKey, string>> = {
  entering_too_early: "Entering too early",
  chasing_breakouts: "Chasing breakouts",
  ignoring_stops: "Ignoring stop losses",
  overtrading: "Overtrading",
  trading_against_htf: "Trading against higher timeframe trend",
  revenge_trading: "Emotional revenge trades",
  plan_broken: "Breaking the trade plan",
};

/**
 * Detect strengths, weaknesses, and success patterns from memory counts.
 * Patterns with fewer than minSample occurrences are marked unreliable.
 */
export function detectTraderPatterns(store: TraderMemoryStore): DetectedPattern[] {
  const min = LEARNING_MEMORY_CAPS.minSampleForReliablePattern;
  const sampleSize = store.tradeSummaries.length;
  const patterns: DetectedPattern[] = [];

  for (const [key, label] of Object.entries(STRENGTH_LABELS) as Array<[BehaviorKey, string]>) {
    const occurrences = store.behaviorCounts[key] ?? 0;
    if (occurrences <= 0) continue;
    patterns.push({
      key,
      label,
      kind: key === "plan_followed" ? "success_pattern" : "strength",
      occurrences,
      evidence: buildEvidence(store, key, label),
      reliable: occurrences >= min && sampleSize >= min,
    });
  }

  for (const [key, label] of Object.entries(WEAKNESS_LABELS) as Array<[BehaviorKey, string]>) {
    const occurrences = store.behaviorCounts[key] ?? 0;
    if (occurrences <= 0) continue;
    patterns.push({
      key,
      kind: key === "plan_broken" ? "recurring_mistake" : "weakness",
      label,
      occurrences,
      evidence: buildEvidence(store, key, label),
      reliable: occurrences >= min && sampleSize >= min,
    });
  }

  // Success pattern: repeated wins with plan followed
  const plannedWins = store.tradeSummaries.filter(
    (t) => t.outcome === "Win" && t.followedPlan === true,
  ).length;
  if (plannedWins > 0) {
    patterns.push({
      key: "planned_wins",
      label: "Wins while following the plan",
      kind: "success_pattern",
      occurrences: plannedWins,
      evidence: [
        `${plannedWins} summarized win(s) tagged as plan-followed.`,
      ],
      reliable: plannedWins >= min && sampleSize >= min,
    });
  }

  // Recurring mistake: repeated losses with broken plan
  const brokenLosses = store.tradeSummaries.filter(
    (t) => t.outcome === "Loss" && t.followedPlan === false,
  ).length;
  if (brokenLosses > 0) {
    patterns.push({
      key: "broken_plan_losses",
      label: "Losses after breaking the plan",
      kind: "recurring_mistake",
      occurrences: brokenLosses,
      evidence: [
        `${brokenLosses} summarized loss(es) with broken plan discipline.`,
      ],
      reliable: brokenLosses >= min && sampleSize >= min,
    });
  }

  // Overtrading heuristic from dense timestamps (observable cadence)
  const overtradeBursts = countOvertradeBursts(store);
  if (overtradeBursts > 0) {
    const existing = store.behaviorCounts.overtrading ?? 0;
    const occurrences = Math.max(overtradeBursts, existing);
    patterns.push({
      key: "overtrading",
      label: "Overtrading",
      kind: "weakness",
      occurrences,
      evidence: [
        `${overtradeBursts} dense trade cluster(s) detected in summarized history.`,
      ],
      reliable: occurrences >= min && sampleSize >= min,
    });
  }

  return patterns.sort((a, b) => {
    if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
    return b.occurrences - a.occurrences || a.label.localeCompare(b.label);
  });
}

function buildEvidence(store: TraderMemoryStore, key: BehaviorKey, label: string): string[] {
  const count = store.behaviorCounts[key] ?? 0;
  const related = store.tradeSummaries
    .filter((t) => t.tags.some((tag) => tag.includes(key.replace(/_/g, "")) || tagIncludesKey(tag, key)))
    .slice(0, 3)
    .map((t) => `${t.symbol ?? "trade"} · ${t.outcome} · ${t.eventId}`);

  return [
    `${label} observed ${count} time(s) in summarized memory.`,
    ...related,
  ].slice(0, 4);
}

function tagIncludesKey(tag: string, key: BehaviorKey): boolean {
  const map: Partial<Record<BehaviorKey, string[]>> = {
    chasing_breakouts: ["chase", "chasing_breakouts"],
    entering_too_early: ["early_entry", "entering_too_early"],
    ignoring_stops: ["ignored_stop", "no_stop"],
    revenge_trading: ["revenge"],
    trading_against_htf: ["against_htf", "countertrend"],
    overtrading: ["overtrading"],
    plan_followed: ["plan_followed"],
    plan_broken: ["plan_broken"],
  };
  return (map[key] ?? []).includes(tag);
}

/** Count clusters of 3+ trades within 2 hours — observable overtrading cadence. */
function countOvertradeBursts(store: TraderMemoryStore): number {
  const times = store.tradeSummaries.map((t) => t.timestamp).sort((a, b) => a - b);
  if (times.length < 3) return 0;
  let bursts = 0;
  let windowStart = 0;
  for (let i = 0; i < times.length; i += 1) {
    while (times[i] - times[windowStart] > 2 * 60 * 60 * 1000) {
      windowStart += 1;
    }
    if (i - windowStart + 1 >= 3) {
      bursts += 1;
      // skip ahead to reduce double-count density
      windowStart = i + 1;
    }
  }
  return bursts;
}
