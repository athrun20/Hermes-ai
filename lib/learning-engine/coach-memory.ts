/**
 * HermesCoachMemory — future-ready coaching object.
 * Phase 1: constructed only; not displayed in UI.
 */

import type {
  HermesCoachMemory,
  TraderLearningProfile,
  TraderMemoryStore,
} from "@/lib/learning-engine/types";
import { LEARNING_MEMORY_CAPS } from "@/lib/learning-engine/types";

/**
 * Build coach memory from profile + store summaries.
 * Pure and deterministic for identical inputs.
 */
export function buildHermesCoachMemory(
  profile: TraderLearningProfile,
  store: TraderMemoryStore,
  now = Date.now(),
): HermesCoachMemory {
  const previousLesson =
    store.lessonSummaries[0] ??
    (profile.sampleSize > 0
      ? "Recent paper trades are teaching process quality more than outcome luck."
      : "No prior lesson stored yet.");

  const currentFocus =
    profile.sampleSize < LEARNING_MEMORY_CAPS.minSampleForProfileClaims
      ? "Build a larger sample of completed paper trades before changing process rules."
      : profile.recurringMistakes[0]
        ? `Reduce: ${profile.recurringMistakes[0]}.`
        : profile.improvementAreas[0]
          ? `Practice: ${profile.improvementAreas[0]}.`
          : profile.strengths[0]
            ? `Protect strength: ${profile.strengths[0]}.`
            : "Stay process-first on every paper decision.";

  const recommendedPractice =
    profile.sampleSize < LEARNING_MEMORY_CAPS.minSampleForProfileClaims
      ? "Complete more plan-complete paper trades and short journal reflections after each close."
      : profile.recurringMistakes.some((m) => /stop/i.test(m))
        ? "Run stop-first drills: define invalidation before entry on the next five paper setups."
        : profile.recurringMistakes.some((m) => /early|chase/i.test(m))
          ? "Practice delayed entry: wait for confirmation candle acceptance before paper execution."
          : profile.strengths[0]
            ? `Repeat the conditions behind “${profile.strengths[0]}” on the next A-quality setup only.`
            : "Use Decision Review on every paper trade with entry, stop, and target defined.";

  const evidenceFromHistory = collectEvidence(profile, store);

  return {
    kind: "hermes-coach-memory-v1",
    generatedAt: now,
    previousLesson: clip(previousLesson, 220),
    currentFocus: clip(currentFocus, 220),
    recommendedPractice: clip(recommendedPractice, 240),
    evidenceFromHistory,
  };
}

function collectEvidence(profile: TraderLearningProfile, store: TraderMemoryStore): string[] {
  const items: string[] = [
    `Sample size: ${profile.sampleSize} summarized trade(s); profile confidence ${profile.confidenceInProfile}.`,
    `Discipline trend: ${profile.disciplineTrend}; execution trend: ${profile.executionTrend}.`,
  ];

  for (const pattern of profile.patterns.filter((p) => p.reliable).slice(0, 3)) {
    items.push(`${pattern.label} ×${pattern.occurrences}`);
  }
  for (const lesson of store.lessonSummaries.slice(0, 2)) {
    items.push(`Lesson: ${clip(lesson, 120)}`);
  }
  if (profile.sampleSize < LEARNING_MEMORY_CAPS.minSampleForProfileClaims) {
    items.push("Small-sample protection active — avoid overgeneralizing from sparse history.");
  }

  return unique(items).slice(0, 8);
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}
