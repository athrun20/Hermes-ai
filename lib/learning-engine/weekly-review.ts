/**
 * Phase 3 — Weekly Learning Reviews.
 * Rolling 7-day window by default; optional calendar week when timezone provided.
 */

import {
  canClaimRecurringBehavior,
  coachingConfidenceFromSufficiency,
  dataSufficiencyFromSampleSize,
  tradeDateRange,
} from "@/lib/learning-engine/data-sufficiency";
import {
  getPracticeExercise,
  patternKeyToPracticeFocus,
} from "@/lib/learning-engine/practice-library";
import { buildPersonalizedCoachingSummary } from "@/lib/learning-engine/personalized-coaching";
import { buildTraderLearningProfile } from "@/lib/learning-engine/profile-builder";
import type {
  CoachingEvidence,
  TradeLearningSummary,
  TraderLearningProfile,
  TraderMemoryStore,
  WeeklyLearningReview,
} from "@/lib/learning-engine/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type WeeklyReviewOptions = {
  now?: number;
  /** IANA timezone when known (e.g. "America/New_York"). Do not invent. */
  timeZone?: string;
  profile?: TraderLearningProfile;
};

/**
 * Build a weekly learning review from summarized trades in memory.
 * Pure and deterministic for identical store + now + timezone.
 */
export function buildWeeklyLearningReview(
  store: TraderMemoryStore,
  options?: WeeklyReviewOptions,
): WeeklyLearningReview {
  const now = options?.now ?? Date.now();
  const { periodStart, periodEnd } = resolveWeekWindow(now, options?.timeZone);
  const weekTrades = store.tradeSummaries.filter(
    (t) => t.timestamp >= periodStart && t.timestamp <= periodEnd,
  );
  const profile = options?.profile ?? buildTraderLearningProfile(store, now);
  const coaching = buildPersonalizedCoachingSummary(store, { profile, now });

  if (weekTrades.length === 0) {
    return noTradeWeekReview({
      store,
      profile,
      coaching,
      periodStart,
      periodEnd,
      now,
    });
  }

  const wins = weekTrades.filter((t) => t.outcome === "Win").length;
  const losses = weekTrades.filter((t) => t.outcome === "Loss").length;
  const planned = weekTrades.filter((t) => t.followedPlan === true).length;
  const planKnown = weekTrades.filter((t) => t.followedPlan !== undefined).length;
  const planFollowRate =
    planKnown > 0 ? Math.round((planned / planKnown) * 1000) / 10 : null;

  const sufficiency = dataSufficiencyFromSampleSize(weekTrades.length);
  const strongest = pickStrongestWeekBehavior(weekTrades, profile);
  const mistake = pickMostFrequentMistake(weekTrades, profile);

  const focusKey = mistake
    ? patternKeyToPracticeFocus(mistake.key, mistake.kind)
    : strongest
      ? patternKeyToPracticeFocus(strongest.key, strongest.kind)
      : "build_sample";
  const practice = getPracticeExercise(focusKey);

  const evidence = buildWeekEvidence(weekTrades, strongest, mistake, sufficiency);
  const confidence = coachingConfidenceFromSufficiency(
    sufficiency,
    Boolean(mistake?.reliable || strongest?.reliable),
    Math.max(mistake?.occurrences ?? 0, strongest?.occurrences ?? 0, weekTrades.length),
  );

  const averageTradeGrade = averageQualityLabel(weekTrades);
  const progressSummary = buildProgressSummary({
    weekTrades,
    wins,
    losses,
    planFollowRate,
    profile,
    sufficiency,
  });

  const keyLesson =
    store.lessonSummaries[0] ??
    (mistake
      ? `Watch for ${mistake.label.toLowerCase()} — it appeared ${mistake.occurrences} time(s) this window.`
      : strongest
        ? `Protect ${strongest.label.toLowerCase()} — it showed up with structured evidence this window.`
        : "Keep plan-complete trades and reviews so weekly lessons can stabilize.");

  return {
    kind: "hermes-weekly-learning-review-v1",
    periodStart,
    periodEnd,
    tradesReviewed: weekTrades.length,
    wins,
    losses,
    planFollowRate,
    averageTradeGrade,
    strongestBehavior: strongest?.label ?? "No reliable strength isolated this week.",
    mostFrequentMistake:
      mistake?.label ?? "No repeated process mistake isolated this week.",
    disciplineTrend: profile.disciplineTrend,
    executionTrend: profile.executionTrend,
    progressSummary,
    keyLesson: clip(keyLesson, 220),
    nextWeekFocus: coaching.currentFocus,
    recommendedPractice: practice.exercise,
    evidence,
    confidence: Math.min(confidence, profile.confidenceInProfile + 5),
    dataSufficiency: sufficiency,
    generatedAt: now,
  };
}

/**
 * Resolve review window: calendar week if timeZone given, else rolling 7 days.
 */
export function resolveWeekWindow(
  now: number,
  timeZone?: string,
): { periodStart: number; periodEnd: number } {
  if (timeZone) {
    try {
      return calendarWeekInTimeZone(now, timeZone);
    } catch {
      // Fall through — never invent timezone behavior on failure
    }
  }
  return {
    periodStart: now - WEEK_MS + 1,
    periodEnd: now,
  };
}

function calendarWeekInTimeZone(
  now: number,
  timeZone: string,
): { periodStart: number; periodEnd: number } {
  // Monday 00:00 → next Monday 00:00 in the provided zone, expressed as UTC ms via offset probe
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(now)).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const y = Number(parts.year);
  const m = Number(parts.month);
  const day = Number(parts.day);
  const weekday = parts.weekday; // Sun, Mon, ...
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const wd = weekdayIndex[weekday] ?? 1;
  // Days since Monday
  const daysFromMonday = (wd + 6) % 7;

  // Approximate local midnight as UTC by using Date.UTC then adjusting with zone offset
  const localMidnightUtcGuess = Date.UTC(y, m - 1, day, 0, 0, 0);
  const offset = localOffsetMs(localMidnightUtcGuess, timeZone);
  const startOfLocalDay = localMidnightUtcGuess - offset;
  const periodStart = startOfLocalDay - daysFromMonday * DAY_MS;
  const periodEnd = periodStart + WEEK_MS - 1;
  return { periodStart, periodEnd };
}

function localOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcMs;
}

function noTradeWeekReview(args: {
  store: TraderMemoryStore;
  profile: TraderLearningProfile;
  coaching: ReturnType<typeof buildPersonalizedCoachingSummary>;
  periodStart: number;
  periodEnd: number;
  now: number;
}): WeeklyLearningReview {
  const unresolved = args.store.lessonSummaries[0];
  const practice = getPracticeExercise(unresolved ? "review_discipline" : "no_trade_week");

  return {
    kind: "hermes-weekly-learning-review-v1",
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    tradesReviewed: 0,
    wins: 0,
    losses: 0,
    planFollowRate: null,
    averageTradeGrade: null,
    strongestBehavior: "No completed trades available this week.",
    mostFrequentMistake: "No completed trades available this week.",
    disciplineTrend: args.profile.disciplineTrend,
    executionTrend: args.profile.executionTrend,
    progressSummary:
      "No completed trades were available in this review window. Performance statistics are not invented.",
    keyLesson: unresolved
      ? `Unresolved lesson remains: ${clip(unresolved, 160)}`
      : "No completed trades were available — complete one planned paper trade and its review.",
    nextWeekFocus: args.coaching.currentFocus,
    recommendedPractice: practice.exercise,
    evidence: [
      {
        behavior: "Weekly sample",
        observationCount: 0,
        relevantSampleSize: 0,
        dateRange: { start: args.periodStart, end: args.periodEnd },
        sourceEventIds: [],
        confidence: 0,
        explanation: "Zero completed trades in the review window.",
      },
    ],
    confidence: 0,
    dataSufficiency: "Insufficient Data",
    generatedAt: args.now,
  };
}

function pickStrongestWeekBehavior(
  weekTrades: TradeLearningSummary[],
  profile: TraderLearningProfile,
) {
  const strengths = profile.patterns.filter(
    (p) => p.kind === "strength" || p.kind === "success_pattern",
  );
  // Prefer patterns that also show in this week's trades
  const scored = strengths.map((p) => {
    const weekHits = countPatternInWeek(weekTrades, p.key);
    return { ...p, weekHits };
  });
  scored.sort((a, b) => b.weekHits - a.weekHits || b.occurrences - a.occurrences);
  const top = scored.find((p) => p.weekHits > 0) ?? scored[0];
  if (!top || top.weekHits === 0) {
    const planFollows = weekTrades.filter((t) => t.followedPlan === true).length;
    if (planFollows >= 2) {
      return {
        key: "plan_followed",
        label: "Plan discipline",
        kind: "success_pattern" as const,
        occurrences: planFollows,
        evidence: [],
        reliable: canClaimRecurringBehavior(weekTrades.length, planFollows),
      };
    }
    return null;
  }
  return top;
}

function pickMostFrequentMistake(
  weekTrades: TradeLearningSummary[],
  profile: TraderLearningProfile,
) {
  const weaknesses = profile.patterns.filter(
    (p) => p.kind === "weakness" || p.kind === "recurring_mistake",
  );
  const scored = weaknesses.map((p) => {
    const weekHits = countPatternInWeek(weekTrades, p.key);
    return { ...p, weekHits };
  });
  scored.sort((a, b) => b.weekHits - a.weekHits || b.occurrences - a.occurrences);
  const top = scored.find((p) => p.weekHits > 0);
  if (top) return top;

  const broken = weekTrades.filter((t) => t.followedPlan === false).length;
  if (broken >= 2) {
    return {
      key: "plan_broken",
      label: "Breaking the trade plan",
      kind: "recurring_mistake" as const,
      occurrences: broken,
      evidence: [],
      reliable: canClaimRecurringBehavior(weekTrades.length, broken),
    };
  }
  return null;
}

function countPatternInWeek(weekTrades: TradeLearningSummary[], key: string | number): number {
  const k = String(key);
  return weekTrades.filter((t) => {
    if (k === "plan_followed" || k === "planned_wins") return t.followedPlan === true;
    if (k === "plan_broken" || k === "broken_plan_losses") return t.followedPlan === false;
    if (k === "entering_too_early") return t.holdBucket === "Scalp" || t.tags.includes("early_entry");
    if (k === "good_entry_timing" || k === "good_exit_discipline") {
      return t.qualityBand === "High" && t.outcome === "Win";
    }
    return t.tags.some((tag) => tag.includes(k.replace(/_/g, "")) || tag.includes(k));
  }).length;
}

function averageQualityLabel(trades: TradeLearningSummary[]): string | null {
  const map: Record<string, number> = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
  const known = trades.filter((t) => t.qualityBand !== "Unknown");
  if (known.length === 0) return null;
  const avg =
    known.reduce((sum, t) => sum + (map[t.qualityBand] ?? 0), 0) / known.length;
  if (avg >= 2.5) return "High";
  if (avg >= 1.5) return "Medium";
  return "Low";
}

function buildProgressSummary(args: {
  weekTrades: TradeLearningSummary[];
  wins: number;
  losses: number;
  planFollowRate: number | null;
  profile: TraderLearningProfile;
  sufficiency: ReturnType<typeof dataSufficiencyFromSampleSize>;
}): string {
  const planText =
    args.planFollowRate === null
      ? "plan-follow rate unavailable"
      : `plan-follow rate ${args.planFollowRate}%`;
  return [
    `${args.weekTrades.length} completed trade(s) this window (${args.wins} win / ${args.losses} loss).`,
    planText + ".",
    `Overall discipline trend ${args.profile.disciplineTrend.toLowerCase()}; execution trend ${args.profile.executionTrend.toLowerCase()}.`,
    `Data sufficiency: ${args.sufficiency}.`,
  ].join(" ");
}

function buildWeekEvidence(
  weekTrades: TradeLearningSummary[],
  strongest: { label: string; occurrences: number; reliable: boolean; key: string } | null,
  mistake: { label: string; occurrences: number; reliable: boolean; key: string } | null,
  sufficiency: ReturnType<typeof dataSufficiencyFromSampleSize>,
): CoachingEvidence[] {
  const range = tradeDateRange(weekTrades);
  const ids = weekTrades.map((t) => t.eventId);
  const out: CoachingEvidence[] = [
    {
      behavior: "Weekly completed trades",
      observationCount: weekTrades.length,
      relevantSampleSize: weekTrades.length,
      dateRange: range,
      sourceEventIds: ids.slice(0, 8),
      confidence: coachingConfidenceFromSufficiency(sufficiency, false, weekTrades.length),
      explanation: `${weekTrades.length} summarized trade(s) closed in the review window.`,
    },
  ];
  if (strongest) {
    out.push({
      behavior: strongest.label,
      observationCount: strongest.occurrences,
      relevantSampleSize: weekTrades.length,
      dateRange: range,
      sourceEventIds: ids.slice(0, 6),
      confidence: coachingConfidenceFromSufficiency(
        sufficiency,
        strongest.reliable,
        strongest.occurrences,
      ),
      explanation: `${strongest.label} supported by structured weekly observations (not generic praise).`,
    });
  }
  if (mistake) {
    out.push({
      behavior: mistake.label,
      observationCount: mistake.occurrences,
      relevantSampleSize: weekTrades.length,
      dateRange: range,
      sourceEventIds: ids.slice(0, 6),
      confidence: coachingConfidenceFromSufficiency(
        sufficiency,
        mistake.reliable,
        mistake.occurrences,
      ),
      explanation: `${mistake.label} is the most frequent process risk in this window; one instance is never treated as a habit alone.`,
    });
  }
  return out.slice(0, 6);
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}
