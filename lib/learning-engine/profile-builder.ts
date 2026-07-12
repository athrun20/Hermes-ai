/**
 * Build TraderLearningProfile from summarized memory + patterns.
 * Small-sample protection: no hard conclusions from 1–2 trades.
 */

import { detectTraderPatterns } from "@/lib/learning-engine/pattern-detection";
import {
  LEARNING_MEMORY_CAPS,
  type DetectedPattern,
  type TraderLearningProfile,
  type TraderMemoryStore,
  type TrendDirection,
} from "@/lib/learning-engine/types";

/**
 * Pure profile builder. Deterministic for the same memory snapshot.
 */
export function buildTraderLearningProfile(
  store: TraderMemoryStore,
  now = Date.now(),
): TraderLearningProfile {
  const sampleSize = store.tradeSummaries.length;
  const patterns = detectTraderPatterns(store);
  const reliable = patterns.filter((p) => p.reliable);
  const minClaims = LEARNING_MEMORY_CAPS.minSampleForProfileClaims;

  const strengths =
    sampleSize >= minClaims
      ? reliable.filter((p) => p.kind === "strength").map((p) => p.label)
      : [];
  const improvementAreas =
    sampleSize >= minClaims
      ? reliable.filter((p) => p.kind === "weakness").map((p) => p.label)
      : sampleSize > 0
        ? ["Collect more completed trades before labeling improvement areas."]
        : ["No completed trades in learning memory yet."];
  const recurringMistakes =
    sampleSize >= minClaims
      ? reliable.filter((p) => p.kind === "recurring_mistake").map((p) => p.label)
      : [];
  const successfulPatterns =
    sampleSize >= minClaims
      ? reliable.filter((p) => p.kind === "success_pattern").map((p) => p.label)
      : [];

  const disciplineTrend = computeDisciplineTrend(store, sampleSize, minClaims);
  const executionTrend = computeExecutionTrend(store, sampleSize, minClaims);
  const confidenceInProfile = computeProfileConfidence(store, reliable, sampleSize);
  const learningSummary = buildLearningSummary({
    sampleSize,
    minClaims,
    strengths,
    improvementAreas,
    recurringMistakes,
    successfulPatterns,
    disciplineTrend,
    executionTrend,
    unreliableHints: patterns.filter((p) => !p.reliable),
  });

  return {
    kind: "hermes-trader-learning-profile-v1",
    generatedAt: now,
    strengths: unique(strengths).slice(0, 6),
    improvementAreas: unique(improvementAreas).slice(0, 6),
    recurringMistakes: unique(recurringMistakes).slice(0, 6),
    successfulPatterns: unique(successfulPatterns).slice(0, 6),
    disciplineTrend,
    executionTrend,
    learningSummary,
    confidenceInProfile,
    sampleSize,
    patterns,
  };
}

function computeDisciplineTrend(
  store: TraderMemoryStore,
  sampleSize: number,
  minClaims: number,
): TrendDirection {
  if (sampleSize < minClaims) return "Insufficient Data";
  const half = Math.max(1, Math.floor(sampleSize / 2));
  // tradeSummaries are newest-first
  const recent = store.tradeSummaries.slice(0, half);
  const older = store.tradeSummaries.slice(half, half * 2);
  if (older.length === 0) return "Stable";

  const recentRate = rate(recent.map((t) => t.followedPlan === true));
  const olderRate = rate(older.map((t) => t.followedPlan === true));
  const delta = recentRate - olderRate;
  if (delta >= 0.15) return "Improving";
  if (delta <= -0.15) return "Declining";
  return "Stable";
}

function computeExecutionTrend(
  store: TraderMemoryStore,
  sampleSize: number,
  minClaims: number,
): TrendDirection {
  if (sampleSize < minClaims) return "Insufficient Data";
  const half = Math.max(1, Math.floor(sampleSize / 2));
  const recent = store.tradeSummaries.slice(0, half);
  const older = store.tradeSummaries.slice(half, half * 2);
  if (older.length === 0) return "Stable";

  const recentWins = rate(recent.map((t) => t.outcome === "Win"));
  const olderWins = rate(older.map((t) => t.outcome === "Win"));
  // Execution quality proxy: high-band quality share + win rate blend
  const recentQuality = rate(recent.map((t) => t.qualityBand === "High"));
  const olderQuality = rate(older.map((t) => t.qualityBand === "High"));
  const recentScore = recentWins * 0.5 + recentQuality * 0.5;
  const olderScore = olderWins * 0.5 + olderQuality * 0.5;
  const delta = recentScore - olderScore;
  if (delta >= 0.12) return "Improving";
  if (delta <= -0.12) return "Declining";
  return "Stable";
}

function computeProfileConfidence(
  store: TraderMemoryStore,
  reliable: DetectedPattern[],
  sampleSize: number,
): number {
  if (sampleSize === 0) return 0;
  if (sampleSize < LEARNING_MEMORY_CAPS.minSampleForReliablePattern) {
    return Math.min(20, sampleSize * 8);
  }
  if (sampleSize < LEARNING_MEMORY_CAPS.minSampleForProfileClaims) {
    return 25 + sampleSize * 5;
  }
  const base = 45 + Math.min(35, sampleSize * 3);
  const patternBoost = Math.min(15, reliable.length * 3);
  const lessonBoost = Math.min(5, store.lessonSummaries.length);
  return Math.max(0, Math.min(95, base + patternBoost + lessonBoost));
}

function buildLearningSummary(args: {
  sampleSize: number;
  minClaims: number;
  strengths: string[];
  improvementAreas: string[];
  recurringMistakes: string[];
  successfulPatterns: string[];
  disciplineTrend: TrendDirection;
  executionTrend: TrendDirection;
  unreliableHints: DetectedPattern[];
}): string {
  if (args.sampleSize === 0) {
    return "Learning memory is empty. Hermes will build a trader profile as completed trades and reflections accumulate.";
  }
  if (args.sampleSize < args.minClaims) {
    const hints = args.unreliableHints
      .slice(0, 2)
      .map((p) => p.label)
      .join("; ");
    return [
      `Sample size is ${args.sampleSize} — too small for firm conclusions.`,
      "One or two trades do not define a trader weakness or strength.",
      hints ? `Early signals (not yet reliable): ${hints}.` : "Keep journaling and completing paper trades.",
    ].join(" ");
  }

  const parts = [
    `Based on ${args.sampleSize} summarized trades,`,
    args.strengths[0] ? `strength shows in ${args.strengths[0].toLowerCase()}.` : "strengths are still forming.",
    args.recurringMistakes[0]
      ? `Recurring process risk: ${args.recurringMistakes[0].toLowerCase()}.`
      : args.improvementAreas[0]
        ? `Focus area: ${args.improvementAreas[0].toLowerCase()}.`
        : "No recurring mistake pattern is dominant.",
    `Discipline trend is ${args.disciplineTrend.toLowerCase()}; execution trend is ${args.executionTrend.toLowerCase()}.`,
  ];
  return parts.join(" ");
}

function rate(flags: boolean[]): number {
  if (flags.length === 0) return 0;
  return flags.filter(Boolean).length / flags.length;
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}
