/**
 * Phase 4 — Map PersonalizedCoachingSummary → compact coach presentation.
 * Pure / deterministic. No React. No market scores.
 * Never exposes raw journal text or internal event IDs.
 */

import type {
  DataSufficiency,
  PersonalizedCoachingSummary,
} from "@/lib/learning-engine/types";

export type PersonalizedCoachMode =
  | "sample_building"
  | "strength"
  | "improvement"
  | "balanced";

/**
 * Compact presentation for existing Hermes Coach surfaces.
 */
export type PersonalizedCoachPresentation = {
  kind: "hermes-personalized-coach-presentation-v1";
  /** Stable identity for cooldown / de-duplication (not a random toast id). */
  messageId: string;
  title: string;
  /** Single coaching sentence (+ optional practice clause). */
  message: string;
  practiceLine: string | null;
  evidenceLabel: string;
  /** Full body for coach card (message + optional practice + evidence label). */
  body: string;
  mode: PersonalizedCoachMode;
  focusKey: string;
  dataSufficiency: DataSufficiency;
  sampleSize: number;
  actionLabel: string;
};

const INSUFFICIENT_MESSAGE =
  "Not enough completed trades yet. Complete and review a few planned paper trades before Hermes personalizes your coaching.";

/**
 * Convert a coaching summary into at most one compact coach presentation.
 * Returns null when the summary is missing or evidence is not present.
 */
export function learningCoachingToCoachMessage(
  summary: PersonalizedCoachingSummary | null | undefined,
): PersonalizedCoachPresentation | null {
  if (!summary || summary.kind !== "hermes-personalized-coaching-v1") {
    return null;
  }

  // Eligibility: memory-backed summary with traceable evidence structure.
  if (!Array.isArray(summary.evidenceFromHistory)) {
    return null;
  }
  if (summary.evidenceFromHistory.length === 0 && summary.sampleSize > 0) {
    return null;
  }

  const sufficiency = summary.dataSufficiency;
  const sampleSize = summary.sampleSize;
  const evidenceLabel = buildEvidenceLabel(sufficiency, sampleSize);

  if (sufficiency === "Insufficient Data") {
    const messageId = stablePersonalizedMessageId({
      sufficiency,
      focusKey: "build_sample",
      mode: "sample_building",
      sampleSize,
    });
    const practiceLine = compactPractice(summary.recommendedPractice);
    return {
      kind: "hermes-personalized-coach-presentation-v1",
      messageId,
      title: "Build your sample",
      message: INSUFFICIENT_MESSAGE,
      practiceLine,
      evidenceLabel,
      body: composeBody(INSUFFICIENT_MESSAGE, practiceLine, evidenceLabel),
      mode: "sample_building",
      focusKey: "build_sample",
      dataSufficiency: sufficiency,
      sampleSize,
      actionLabel: "Learning",
    };
  }

  // Prefer a single improvement focus when present; otherwise reinforce strength.
  const improvement = sanitizeCoachLine(summary.primaryImprovementArea);
  const strength = sanitizeCoachLine(summary.currentStrength);
  const hasImprovement =
    Boolean(improvement) &&
    !isPlaceholderImprovement(improvement) &&
    !isPlaceholderStrengthOrPattern(improvement);
  const hasStrength =
    Boolean(strength) && !isPlaceholderStrengthOrPattern(strength);

  let mode: PersonalizedCoachMode;
  let focusKey: string;
  let title: string;
  let coachingSentence: string;
  let practiceLine: string | null = null;

  if (hasImprovement) {
    mode = "improvement";
    focusKey = deriveFocusKey(summary.currentFocus, improvement);
    title = shortHeadline(improvement, "Focus");
    coachingSentence = buildImprovementSentence(sufficiency, improvement);
    practiceLine = compactPractice(summary.recommendedPractice);
    if (practiceLine) {
      coachingSentence = `${coachingSentence} ${practiceLine}`;
      // Practice is already inlined for compact card body; keep field for tests.
    }
  } else if (hasStrength) {
    mode = "strength";
    focusKey = deriveFocusKey(summary.currentFocus, strength);
    title = shortHeadline(strength, "Strength");
    coachingSentence = buildStrengthSentence(sufficiency, strength);
    practiceLine = compactPractice(summary.recommendedPractice);
    if (practiceLine && sufficiency !== "Early Signal") {
      coachingSentence = `${coachingSentence} ${practiceLine}`;
    }
  } else {
    mode = "balanced";
    focusKey = "build_sample";
    title = "Process forming";
    coachingSentence =
      "Your process sample is still forming. Keep plan-complete paper trades and reviews flowing.";
    practiceLine = compactPractice(summary.recommendedPractice);
  }

  // Evidence required for non-sample claims (traceable observations).
  if (summary.evidenceFromHistory.length === 0) {
    return null;
  }

  const messageId = stablePersonalizedMessageId({
    sufficiency,
    focusKey,
    mode,
    sampleSize,
  });

  return {
    kind: "hermes-personalized-coach-presentation-v1",
    messageId,
    title,
    message: coachingSentence,
    practiceLine,
    evidenceLabel,
    body: composeBody(coachingSentence, null, evidenceLabel),
    mode,
    focusKey,
    dataSufficiency: sufficiency,
    sampleSize,
    actionLabel: sufficiencyActionLabel(sufficiency),
  };
}

/**
 * Stable message identity — same inputs → same id (no Date.now).
 */
export function stablePersonalizedMessageId(args: {
  sufficiency: DataSufficiency;
  focusKey: string;
  mode: PersonalizedCoachMode;
  sampleSize: number;
}): string {
  const bucket = sampleSizeBucket(args.sampleSize);
  const focus = slug(args.focusKey);
  const sufficiencySlug = slug(args.sufficiency);
  return `personalized:${sufficiencySlug}:${focus}:${args.mode}:${bucket}`;
}

export function buildEvidenceLabel(
  sufficiency: DataSufficiency,
  sampleSize: number,
): string {
  if (sufficiency === "Insufficient Data") {
    if (sampleSize <= 0) return "Based on 0 completed trades";
    return `Early sample from ${sampleSize} completed trade${sampleSize === 1 ? "" : "s"}`;
  }
  if (sufficiency === "Early Signal") {
    return `Early signal from ${sampleSize} completed trades`;
  }
  if (sufficiency === "Developing Pattern") {
    return `Based on ${sampleSize} reviewed trades`;
  }
  return `Reliable pattern across ${sampleSize} trades`;
}

export function buildImprovementSentence(
  sufficiency: DataSufficiency,
  area: string,
): string {
  const topic = softenTopic(area);
  if (sufficiency === "Early Signal") {
    return `${topic} may be emerging as an early signal worth watching.`;
  }
  if (sufficiency === "Developing Pattern") {
    return `${topic} is becoming a pattern and has appeared repeatedly.`;
  }
  // Reliable Pattern
  return `Your history shows ${topicLower(topic)} across recent trades.`;
}

export function buildStrengthSentence(
  sufficiency: DataSufficiency,
  strength: string,
): string {
  const topic = softenTopic(strength);
  if (sufficiency === "Early Signal") {
    return `${topic} may be emerging as an early strength worth protecting.`;
  }
  if (sufficiency === "Developing Pattern") {
    return `${topic} has appeared repeatedly — keep reinforcing that process.`;
  }
  return `Your recent trades show ${topicLower(topic)}. Keep defining invalidation and plan rules before entry.`;
}

function composeBody(
  message: string,
  practiceLine: string | null,
  evidenceLabel: string,
): string {
  const parts = [message];
  if (practiceLine && !message.includes(practiceLine)) {
    parts.push(practiceLine);
  }
  parts.push(evidenceLabel);
  return parts.join(" ");
}

function compactPractice(practice: string | undefined): string | null {
  if (!practice || !practice.trim()) return null;
  const cleaned = sanitizeCoachLine(practice);
  if (!cleaned) return null;
  // Keep practices educational and short.
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function sanitizeCoachLine(value: string | undefined): string {
  if (!value) return "";
  // Strip anything that looks like raw freeform journal dumps (multi-paragraph).
  const single = value.replace(/\s+/g, " ").trim();
  // Never surface internal event id prefixes.
  if (/^(paper-trading|decision-journal|paper-replay):/i.test(single)) return "";
  return single;
}

function isPlaceholderImprovement(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("not enough") ||
    lower.includes("collect more") ||
    lower.includes("no single high-priority") ||
    lower.includes("before labeling")
  );
}

function isPlaceholderStrengthOrPattern(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("not enough") ||
    lower.includes("no recurring") ||
    lower.includes("no repeated") ||
    lower.includes("not enough reliable")
  );
}

function deriveFocusKey(currentFocus: string, fallbackLabel: string): string {
  const fromFocus = currentFocus?.match(/Primary focus:\s*(.+)\.?$/i)?.[1];
  const raw = (fromFocus ?? fallbackLabel).trim();
  return slug(raw) || "process";
}

function shortHeadline(label: string, kind: "Focus" | "Strength"): string {
  const trimmed = label.length > 42 ? `${label.slice(0, 39).trim()}…` : label;
  return kind === "Focus" ? trimmed : trimmed;
}

function softenTopic(label: string): string {
  const t = label.trim();
  if (!t) return "This process item";
  // Capitalize first letter for sentence starts.
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function topicLower(label: string): string {
  const t = label.trim();
  if (!t) return "this process item";
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function sampleSizeBucket(n: number): string {
  if (n < 3) return "n0-2";
  if (n < 5) return "n3-4";
  if (n < 10) return "n5-9";
  if (n < 20) return "n10-19";
  return "n20p";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sufficiencyActionLabel(sufficiency: DataSufficiency): string {
  if (sufficiency === "Early Signal") return "Early signal";
  if (sufficiency === "Developing Pattern") return "Developing";
  if (sufficiency === "Reliable Pattern") return "Reliable pattern";
  return "Learning";
}

/**
 * Compact weekly lines for existing briefing/review surfaces (no new UI chrome).
 */
export type WeeklyLearningBriefLines = {
  progressSummary: string;
  strongestBehavior: string;
  mainImprovementFocus: string;
  recommendedPractice: string;
  dataSufficiencyLabel: string;
};

export function weeklyLearningToBriefLines(review: {
  progressSummary: string;
  strongestBehavior: string;
  mostFrequentMistake: string;
  nextWeekFocus: string;
  recommendedPractice: string;
  dataSufficiency: DataSufficiency;
  tradesReviewed: number;
} | null | undefined): WeeklyLearningBriefLines | null {
  if (!review) return null;
  return {
    progressSummary: sanitizeCoachLine(review.progressSummary) || "No weekly progress summary yet.",
    strongestBehavior: sanitizeCoachLine(review.strongestBehavior) || "None cited yet.",
    mainImprovementFocus:
      sanitizeCoachLine(review.mostFrequentMistake) ||
      sanitizeCoachLine(review.nextWeekFocus) ||
      "Build a larger paper sample.",
    recommendedPractice:
      sanitizeCoachLine(review.recommendedPractice) ||
      "Complete one planned paper trade and its review.",
    dataSufficiencyLabel: review.dataSufficiency,
  };
}
