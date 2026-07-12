/**
 * Phase 3 — Personalized Coaching Intelligence.
 * Ranks TraderLearningProfile patterns; does not invent a second pattern detector.
 * Coaching only — never market scores or trade blocking.
 */

import {
  canClaimRecurringBehavior,
  coachingConfidenceFromSufficiency,
  dataSufficiencyFromSampleSize,
  eventIdsForPattern,
  tradeDateRange,
} from "@/lib/learning-engine/data-sufficiency";
import {
  getPracticeExercise,
  patternKeyToPracticeFocus,
  type PracticeFocusKey,
} from "@/lib/learning-engine/practice-library";
import { buildTraderLearningProfile } from "@/lib/learning-engine/profile-builder";
import type {
  CoachingEvidence,
  DataSufficiency,
  DetectedPattern,
  PersonalizedCoachingSummary,
  TraderLearningProfile,
  TraderMemoryStore,
} from "@/lib/learning-engine/types";

/** Coaching priority: lower number = higher severity. */
const PRIORITY_RANK: Record<string, number> = {
  ignoring_stops: 1,
  plan_broken: 2,
  broken_plan_losses: 2,
  revenge_trading: 3,
  overtrading: 4,
  entering_too_early: 5,
  chasing_breakouts: 6,
  trading_against_htf: 7,
  entry_exit_optimization: 8,
  reinforce_strength: 9,
  review_discipline: 8,
  build_sample: 99,
  no_trade_week: 99,
};

/**
 * Build personalized coaching from profile + store.
 * Pure and deterministic for identical inputs.
 */
export function buildPersonalizedCoachingSummary(
  store: TraderMemoryStore,
  options?: { profile?: TraderLearningProfile; now?: number },
): PersonalizedCoachingSummary {
  const now = options?.now ?? Date.now();
  const profile = options?.profile ?? buildTraderLearningProfile(store, now);
  const sampleSize = profile.sampleSize;
  const sufficiency = dataSufficiencyFromSampleSize(sampleSize);

  if (sampleSize === 0) {
    return insufficientCoaching(store, profile, now, sufficiency);
  }

  const strength = selectStrength(profile, store, sufficiency);
  const primary = selectPrimaryImprovement(profile, store, sufficiency);
  const recurring = selectRecurringPattern(profile, store, sufficiency, primary);
  const focusKey = primary?.focusKey ?? "build_sample";
  const practice = getPracticeExercise(focusKey);

  const evidence = buildEvidenceList(store, profile, strength?.pattern ?? null, primary?.pattern ?? null);

  const confidence = Math.min(
    profile.confidenceInProfile,
    coachingConfidenceFromSufficiency(
      sufficiency,
      Boolean(primary?.pattern?.reliable || strength?.pattern?.reliable),
      primary?.pattern?.occurrences ?? strength?.pattern?.occurrences ?? sampleSize,
    ),
  );

  const headline = buildHeadline({
    sufficiency,
    strength: strength?.label,
    primary: primary?.label,
    sampleSize,
  });

  return {
    kind: "hermes-personalized-coaching-v1",
    headline,
    currentStrength: strength?.label ?? "Not enough reliable strength evidence yet.",
    primaryImprovementArea:
      primary?.label ??
      (sufficiency === "Insufficient Data"
        ? "Collect more completed paper trades before labeling improvements."
        : "No single high-priority process risk stands out yet."),
    recurringPattern: recurring,
    disciplineTrend: profile.disciplineTrend,
    executionTrend: profile.executionTrend,
    currentFocus: primary
      ? `Primary focus: ${primary.label}.`
      : "Build a larger, plan-complete paper sample before specializing practice.",
    recommendedPractice: practice.exercise,
    evidenceFromHistory: evidence,
    confidenceInCoaching: confidence,
    sampleSize,
    dataSufficiency: sufficiency,
    generatedAt: now,
  };
}

type RankedFocus = {
  key: string;
  label: string;
  focusKey: PracticeFocusKey;
  pattern: DetectedPattern;
  score: number;
};

function selectPrimaryImprovement(
  profile: TraderLearningProfile,
  store: TraderMemoryStore,
  sufficiency: DataSufficiency,
): RankedFocus | null {
  if (sufficiency === "Insufficient Data") return null;

  const candidates = profile.patterns.filter(
    (p) => p.kind === "weakness" || p.kind === "recurring_mistake",
  );
  if (candidates.length === 0) {
    // Soft process: entry/exit optimization when quality is weak but no named weakness
    const weakQuality = store.tradeSummaries.filter((t) => t.qualityBand === "Low").length;
    if (weakQuality >= 2 && profile.sampleSize >= 3) {
      const synthetic: DetectedPattern = {
        key: "entry_exit_optimization",
        label: "Entry or exit optimization",
        kind: "weakness",
        occurrences: weakQuality,
        evidence: [`${weakQuality} summarized trade(s) graded Low quality.`],
        reliable: weakQuality >= 3 && profile.sampleSize >= 5,
      };
      return {
        key: synthetic.key,
        label: synthetic.label,
        focusKey: "entry_exit_optimization",
        pattern: synthetic,
        score: scoreFocus(synthetic, store, 8),
      };
    }
    return null;
  }

  const ranked = candidates
    .map((pattern) => {
      const focusKey = patternKeyToPracticeFocus(String(pattern.key), pattern.kind);
      const priority = PRIORITY_RANK[focusKey] ?? PRIORITY_RANK[String(pattern.key)] ?? 8;
      return {
        key: String(pattern.key),
        label: pattern.label,
        focusKey,
        pattern,
        score: scoreFocus(pattern, store, priority),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.label.localeCompare(b.label);
    });

  for (const candidate of ranked) {
    if (isEligiblePrimaryFocus(candidate, profile.sampleSize, sufficiency)) {
      return candidate;
    }
  }
  return null;
}

function isEligiblePrimaryFocus(
  candidate: RankedFocus,
  sampleSize: number,
  sufficiency: DataSufficiency,
): boolean {
  // Early signal: only promote if observationCount >= 2
  if (sufficiency === "Early Signal" && candidate.pattern.occurrences < 2) return false;
  if (
    (sufficiency === "Developing Pattern" || sufficiency === "Reliable Pattern") &&
    !canClaimRecurringBehavior(sampleSize, candidate.pattern.occurrences) &&
    !candidate.pattern.reliable
  ) {
    // Still allow high-severity safety issues if count >= 2
    const prio = PRIORITY_RANK[candidate.focusKey] ?? 99;
    if (!(prio <= 3 && candidate.pattern.occurrences >= 2)) return false;
  }
  return true;
}

function scoreFocus(
  pattern: DetectedPattern,
  store: TraderMemoryStore,
  priorityRank: number,
): number {
  // Severity dominates so priority-1 safety issues beat higher-frequency mild issues.
  const severity = Math.max(1, 10 - Math.min(9, priorityRank)); // 1→9, 9→1
  const frequency = pattern.occurrences;
  const recency = recencyBoost(store, pattern);
  const quality = pattern.reliable ? 1.25 : 0.85;
  return severity * 20 + frequency * 3 + recency * 2 + (quality - 1) * 5;
}

function recencyBoost(store: TraderMemoryStore, pattern: DetectedPattern): number {
  const ids = new Set(eventIdsForPattern(store, pattern, 8));
  const recent = store.tradeSummaries.slice(0, 3);
  const hits = recent.filter((t) => ids.has(t.eventId)).length;
  return hits * 1.5;
}

function selectStrength(
  profile: TraderLearningProfile,
  store: TraderMemoryStore,
  sufficiency: DataSufficiency,
): { label: string; pattern: DetectedPattern | null } | null {
  if (sufficiency === "Insufficient Data") return null;
  const strengths = profile.patterns
    .filter((p) => p.kind === "strength" || p.kind === "success_pattern")
    .sort((a, b) => {
      if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
      return b.occurrences - a.occurrences || a.label.localeCompare(b.label);
    });
  const top = strengths[0];
  if (!top) return null;
  if (sufficiency === "Early Signal" && top.occurrences < 2) return null;
  if (!canClaimRecurringBehavior(profile.sampleSize, top.occurrences) && !top.reliable) {
    if (top.occurrences < 2) return null;
  }
  return { label: top.label, pattern: top };
}

function selectRecurringPattern(
  profile: TraderLearningProfile,
  store: TraderMemoryStore,
  sufficiency: DataSufficiency,
  primary: RankedFocus | null,
): string {
  if (sufficiency === "Insufficient Data") {
    return "No recurring pattern yet — sample is too small.";
  }
  if (primary && (primary.pattern.reliable || primary.pattern.occurrences >= 2)) {
    return `${primary.label} (${primary.pattern.occurrences} observation(s) in ${profile.sampleSize} trades).`;
  }
  const any = profile.patterns
    .filter((p) => p.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)[0];
  if (!any) return "No repeated behavior pattern is clear yet.";
  return `${any.label} appears ${any.occurrences} time(s) — ${any.reliable ? "reliable" : "still forming"}.`;
}

function buildEvidenceList(
  store: TraderMemoryStore,
  profile: TraderLearningProfile,
  strength: DetectedPattern | null,
  primary: DetectedPattern | null,
): CoachingEvidence[] {
  const out: CoachingEvidence[] = [];
  const range = tradeDateRange(store.tradeSummaries);

  if (strength) {
    out.push({
      behavior: strength.label,
      observationCount: strength.occurrences,
      relevantSampleSize: profile.sampleSize,
      dateRange: range,
      sourceEventIds: eventIdsForPattern(store, strength),
      confidence: coachingConfidenceFromSufficiency(
        dataSufficiencyFromSampleSize(profile.sampleSize),
        strength.reliable,
        strength.occurrences,
      ),
      explanation: `${strength.label} observed ${strength.occurrences} time(s) across ${profile.sampleSize} summarized trade(s).`,
    });
  }

  if (primary) {
    out.push({
      behavior: primary.label,
      observationCount: primary.occurrences,
      relevantSampleSize: profile.sampleSize,
      dateRange: range,
      sourceEventIds: eventIdsForPattern(store, primary),
      confidence: coachingConfidenceFromSufficiency(
        dataSufficiencyFromSampleSize(profile.sampleSize),
        primary.reliable,
        primary.occurrences,
      ),
      explanation: `${primary.label} is prioritized from severity, frequency, and recency — not a one-off mistake label.`,
    });
  }

  out.push({
    behavior: "Sample coverage",
    observationCount: profile.sampleSize,
    relevantSampleSize: profile.sampleSize,
    dateRange: range,
    sourceEventIds: store.tradeSummaries.slice(0, 6).map((t) => t.eventId),
    confidence: profile.confidenceInProfile,
    explanation: `Profile confidence ${profile.confidenceInProfile} with discipline trend ${profile.disciplineTrend} and execution trend ${profile.executionTrend}.`,
  });

  return out.slice(0, 6);
}

function buildHeadline(args: {
  sufficiency: DataSufficiency;
  strength?: string;
  primary?: string;
  sampleSize: number;
}): string {
  if (args.sufficiency === "Insufficient Data") {
    return `Coaching on hold: only ${args.sampleSize} completed trade(s) — not enough for habits.`;
  }
  if (args.primary) {
    return args.strength
      ? `Protect ${args.strength.toLowerCase()}; focus next on ${args.primary.toLowerCase()}.`
      : `Primary process focus: ${args.primary.toLowerCase()}.`;
  }
  if (args.strength) {
    return `Strength showing: ${args.strength.toLowerCase()}. Keep sample quality high.`;
  }
  return "Process is forming — keep plan-complete paper trades and reviews flowing.";
}

function insufficientCoaching(
  store: TraderMemoryStore,
  profile: TraderLearningProfile,
  now: number,
  sufficiency: DataSufficiency,
): PersonalizedCoachingSummary {
  const lesson = store.lessonSummaries[0];
  const practice = getPracticeExercise(lesson ? "review_discipline" : "build_sample");
  const range = tradeDateRange(store.tradeSummaries);

  return {
    kind: "hermes-personalized-coaching-v1",
    headline:
      profile.sampleSize === 0
        ? "No completed trades in learning memory yet."
        : `Early sample only (${profile.sampleSize} trade(s)) — do not treat this as a habit profile.`,
    currentStrength: "Not enough data to cite a reliable strength.",
    primaryImprovementArea: "Collect plan-complete paper trades before labeling weaknesses.",
    recurringPattern: "No recurring pattern can be claimed yet.",
    disciplineTrend: profile.disciplineTrend,
    executionTrend: profile.executionTrend,
    currentFocus: lesson
      ? `Unresolved lesson: ${lesson}`
      : "Complete one planned paper trade and its review.",
    recommendedPractice: practice.exercise,
    evidenceFromHistory: [
      {
        behavior: "Sample size",
        observationCount: profile.sampleSize,
        relevantSampleSize: profile.sampleSize,
        dateRange: range,
        sourceEventIds: store.tradeSummaries.map((t) => t.eventId).slice(0, 4),
        confidence: profile.confidenceInProfile,
        explanation:
          "One or two trades never define a trader weakness or strength. Hermes waits for repeated structure.",
      },
    ],
    confidenceInCoaching: Math.min(20, profile.confidenceInProfile),
    sampleSize: profile.sampleSize,
    dataSufficiency: sufficiency,
    generatedAt: now,
  };
}
