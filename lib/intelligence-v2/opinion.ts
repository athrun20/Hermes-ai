/**
 * Phase 5 — Hermes Opinion (pure orchestration layer).
 *
 * Converts Market Regime + Evidence + Confidence Breakdown + Judgment into
 * one coherent, explainable opinion. Does NOT:
 * - recompute Confidence, Readiness, or Trade Quality
 * - calculate Conviction
 * - emit Buy/Sell language
 * - wire into the dashboard
 *
 * Every claim is traceable to existing stage outputs.
 */

import type {
  ConfidenceBreakdown,
  ConfidenceContribution,
  EvidenceDirection,
  HermesEvidence,
  HermesJudgment,
  HermesJudgmentStance,
  HermesOpinion,
  HermesOpinionEvidenceRef,
  MarketRegime,
} from "@/lib/intelligence-v2/types";

export type BuildHermesOpinionInput = {
  regime: MarketRegime;
  evidence: HermesEvidence[];
  confidenceBreakdown: ConfidenceBreakdown;
  judgment: HermesJudgment;
  /**
   * Optional existing Trade Readiness (read-only context for coaching copy).
   * Never recomputed here.
   */
  readinessScore?: number;
  readinessState?: string;
  /** Optional thesis text from reasoning when available */
  thesis?: string;
  sourceTimestamp?: number;
};

/**
 * Build a deterministic Hermes Opinion from existing v2 stage outputs.
 */
export function buildHermesOpinion(input: BuildHermesOpinionInput): HermesOpinion {
  const sourceTimestamp =
    input.sourceTimestamp ??
    input.judgment.sourceTimestamp ??
    input.confidenceBreakdown.sourceTimestamp ??
    input.regime.sourceTimestamp;

  const supportingEvidence = collectSupportingRefs(input);
  const contradictingEvidence = collectContradictingRefs(input);
  const sourceEvidenceIds = uniqueIds([
    ...supportingEvidence.map((r) => r.evidenceId),
    ...contradictingEvidence.map((r) => r.evidenceId),
    ...input.confidenceBreakdown.positiveContributions.flatMap((c) => c.evidenceIds),
    ...input.confidenceBreakdown.negativeContributions.flatMap((c) => c.evidenceIds),
  ]);

  const opinion = buildOpinionStatement(input);
  const why = buildWhy(input, supportingEvidence);
  const whatWouldChangeOpinion = buildWhatWouldChange(input);
  const biggestRisk = buildBiggestRisk(input, contradictingEvidence);
  const commonTraderMistake = buildCommonMistake(input);
  const nextFocus = buildNextFocus(input);
  const summary = buildSummary(input, opinion);

  return {
    kind: "hermes-opinion-v1",
    opinion,
    why,
    supportingEvidence: supportingEvidence.slice(0, 8),
    contradictingEvidence: contradictingEvidence.slice(0, 8),
    whatWouldChangeOpinion: uniqueStrings(whatWouldChangeOpinion).slice(0, 8),
    biggestRisk,
    commonTraderMistake,
    nextFocus,
    stance: input.judgment.stance,
    confidenceFinalScore: input.confidenceBreakdown.finalScore,
    readinessScore: input.readinessScore,
    regimeSummary: input.regime.summary,
    sourceEvidenceIds: sourceEvidenceIds.slice(0, 24),
    sourceTimestamp,
    summary,
  };
}

function buildOpinionStatement(input: BuildHermesOpinionInput): string {
  const { judgment, regime, confidenceBreakdown } = input;
  const conf = confidenceBreakdown.finalScore;
  const ready =
    input.readinessScore === undefined
      ? "not provided"
      : String(input.readinessScore);
  const thesisBit = input.thesis
    ? ` Thesis context: ${trimSentence(input.thesis)}`
    : "";

  switch (judgment.stance) {
    case "Take":
      return `Hermes would personally take this setup for paper practice: stance Take with existing Confidence ${conf} and readiness ${ready}. Regime is ${regime.structureRegime} with ${regime.eventRegime} event backdrop.${thesisBit}`;
    case "Take With Caution":
      return `Hermes sees an actionable idea but would only proceed with caution: stance Take With Caution. Existing Confidence ${conf}; readiness ${ready}. Residual risk remains under ${regime.structureRegime} / ${regime.volatilityRegime} volatility.${thesisBit}`;
    case "Wait":
      return `Hermes would wait. A thesis may exist (Confidence ${conf}), but personal actionability is incomplete (readiness ${ready}). Judgment stance is Wait — high Confidence is not automatic permission to enter.${thesisBit}`;
    case "Avoid":
      return `Hermes would personally pass on this trade right now (stance Avoid). Existing Confidence ${conf} and readiness ${ready} are interpreted inside a ${regime.eventRegime} / ${regime.structureRegime} regime — not rewritten.${thesisBit}`;
    case "Manage Existing Position":
      return `Hermes' opinion is management-first: a position is already open. Focus on invalidation and process, not a fresh entry. Confidence ${conf} and readiness ${ready} are context only.${thesisBit}`;
    case "Insufficient Data":
      return `Hermes withholds a personal market take: data quality or required inputs are insufficient for a reliable opinion (stance Insufficient Data). Regime data quality is ${regime.dataQuality}.${thesisBit}`;
    default:
      return `Hermes holds a ${judgment.stance} stance with Confidence ${conf} under ${regime.summary}.`;
  }
}

function buildWhy(
  input: BuildHermesOpinionInput,
  supporting: HermesOpinionEvidenceRef[],
): string {
  const parts: string[] = [
    input.judgment.primaryReason,
    `Regime effect: ${input.judgment.regimeEffect.level} — ${input.judgment.regimeEffect.summary}`,
    `Trader fit effect: ${input.judgment.traderFitEffect.level} — ${input.judgment.traderFitEffect.summary}`,
  ];

  if (input.confidenceBreakdown.supportiveDrivers[0]) {
    parts.push(
      `Confidence breakdown supportive driver: ${input.confidenceBreakdown.supportiveDrivers[0]}.`,
    );
  }
  if (input.confidenceBreakdown.reducingDrivers[0]) {
    parts.push(
      `Confidence breakdown reducing driver: ${input.confidenceBreakdown.reducingDrivers[0]}.`,
    );
  }
  if (supporting[0]) {
    parts.push(`Top supporting claim: ${supporting[0].claim}`);
  }
  if (input.judgment.blockingReasons[0]) {
    parts.push(`Primary blocking reason: ${input.judgment.blockingReasons[0]}`);
  }

  return uniqueStrings(parts).join(" ");
}

function collectSupportingRefs(input: BuildHermesOpinionInput): HermesOpinionEvidenceRef[] {
  const refs: HermesOpinionEvidenceRef[] = [];

  // Phase 2 supportive evidence (highest strength first)
  const supportive = input.evidence
    .filter((e) => e.direction === "Supportive")
    .slice()
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));

  for (const e of supportive) {
    refs.push(fromEvidence(e));
  }

  // Phase 3 positive contributions
  for (const row of sortContributions(input.confidenceBreakdown.positiveContributions)) {
    refs.push(fromContribution(row, "Supportive"));
  }

  // Judgment supporting reasons (traceable as judgment source)
  for (const reason of input.judgment.supportingReasons) {
    refs.push({
      claim: reason,
      direction: "Supportive",
      source: "judgment",
    });
  }

  // Supportive regime signals
  for (const signal of input.regime.supportingSignals) {
    refs.push({
      claim: signal,
      category: "Market Regime",
      direction: "Supportive",
      source: "regime",
      weightHint: input.regime.confidence,
    });
  }

  return dedupeRefs(refs);
}

function collectContradictingRefs(input: BuildHermesOpinionInput): HermesOpinionEvidenceRef[] {
  const refs: HermesOpinionEvidenceRef[] = [];

  const contradictory = input.evidence
    .filter((e) => e.direction === "Contradictory")
    .slice()
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));

  for (const e of contradictory) {
    refs.push(fromEvidence(e));
  }

  for (const row of sortContributions(input.confidenceBreakdown.negativeContributions)) {
    refs.push(fromContribution(row, "Contradictory"));
  }

  for (const reason of input.judgment.blockingReasons) {
    refs.push({
      claim: reason,
      direction: "Contradictory",
      source: "judgment",
    });
  }

  for (const signal of input.regime.conflictingSignals) {
    refs.push({
      claim: signal,
      category: "Market Regime",
      direction: "Contradictory",
      source: "regime",
      weightHint: input.regime.confidence,
    });
  }

  for (const conflict of input.confidenceBreakdown.unresolvedConflicts) {
    refs.push({
      claim: conflict,
      direction: "Contradictory",
      source: "confidence-breakdown",
    });
  }

  return dedupeRefs(refs);
}

function buildWhatWouldChange(input: BuildHermesOpinionInput): string[] {
  const items: string[] = [];
  const { judgment, confidenceBreakdown, regime } = input;

  items.push(...judgment.conditionsToProceed.map((c) => `Proceed if: ${c}`));
  items.push(...judgment.conditionsToAvoid.map((c) => `Opinion worsens if: ${c}`));

  if (confidenceBreakdown.reducingDrivers[0]) {
    items.push(
      `Opinion strengthens if reducing driver eases: ${confidenceBreakdown.reducingDrivers[0]}.`,
    );
  }
  if (confidenceBreakdown.unresolvedConflicts[0]) {
    items.push(
      `Opinion updates when conflict resolves: ${confidenceBreakdown.unresolvedConflicts[0]}.`,
    );
  }
  if (regime.eventRegime === "Event Driven" || regime.eventRegime === "Elevated Event Risk") {
    items.push("Opinion softens toward actionability only after event risk cools.");
  }
  if (judgment.stance === "Wait" || judgment.stance === "Avoid") {
    items.push(
      "A stronger personal take requires higher Trade Readiness without treating Confidence as a substitute.",
    );
  }
  if (judgment.stance === "Take" || judgment.stance === "Take With Caution") {
    items.push("Opinion flips to Avoid/Wait if planned invalidation triggers or regime turns hostile.");
  }
  if (judgment.stance === "Manage Existing Position") {
    items.push("Opinion returns to a fresh-entry frame only after the open position is closed or fully planned.");
  }
  if (judgment.stance === "Insufficient Data") {
    items.push("Opinion can form only after data quality and required Reasoning inputs are restored.");
  }

  return items;
}

function buildBiggestRisk(
  input: BuildHermesOpinionInput,
  contradicting: HermesOpinionEvidenceRef[],
): string {
  const { judgment, regime, confidenceBreakdown } = input;

  if (judgment.stance === "Insufficient Data") {
    return `Biggest risk is deciding from incomplete information (data quality ${regime.dataQuality}).`;
  }
  if (judgment.regimeEffect.level === "Hostile") {
    return `Biggest risk is acting inside a hostile regime: ${judgment.regimeEffect.summary}`;
  }
  if (regime.eventRegime === "Event Driven") {
    return "Biggest risk is event-driven volatility distorting execution and thesis quality.";
  }
  if (judgment.blockingReasons[0]) {
    return `Biggest risk: ${judgment.blockingReasons[0]}`;
  }
  if (confidenceBreakdown.reducingDrivers[0]) {
    return `Biggest risk from confidence reducers: ${confidenceBreakdown.reducingDrivers[0]}.`;
  }
  if (contradicting[0]) {
    return `Biggest risk from contradicting evidence: ${contradicting[0].claim}`;
  }
  if (regime.volatilityRegime === "Extreme" || regime.volatilityRegime === "High") {
    return `Biggest risk is ${regime.volatilityRegime.toLowerCase()} volatility degrading plan quality.`;
  }
  if (input.readinessScore !== undefined && input.readinessScore < 70) {
    return "Biggest risk is acting before Trade Readiness supports the setup (good idea ≠ ready now).";
  }
  return "Biggest risk is process failure — entering without confirmation or plan discipline.";
}

function buildCommonMistake(input: BuildHermesOpinionInput): string {
  const { judgment, regime } = input;
  const ready = input.readinessScore;
  const conf = input.confidenceBreakdown.finalScore;

  if (judgment.stance === "Insufficient Data") {
    return "Filling gaps with narrative certainty — treating missing data as confirmation.";
  }
  if (judgment.stance === "Manage Existing Position") {
    return "Using an open position as an excuse to add size or ignore invalidation.";
  }
  if (judgment.stance === "Avoid" && conf >= 72) {
    return "Forcing a trade because Confidence looks high while Judgment still says Avoid.";
  }
  if (
    judgment.stance === "Wait" ||
    (ready !== undefined && ready < 70 && conf >= 72)
  ) {
    return "Confusing a strong thesis (Confidence) with permission to enter now (Readiness).";
  }
  if (regime.eventRegime === "Event Driven" || regime.eventRegime === "Elevated Event Risk") {
    return "Trading through elevated event risk as if it were a normal session.";
  }
  if (regime.structureRegime === "Range" || regime.structureRegime === "Transition") {
    return "Forcing breakout aggression in a range or transition regime without acceptance.";
  }
  if (judgment.traderFitEffect.level === "Conflict") {
    return "Taking a setup that conflicts with personal DNA because the chart looks exciting.";
  }
  if (judgment.stance === "Take With Caution") {
    return "Treating Take With Caution as full Take and sizing as if residual risks were gone.";
  }
  if (judgment.stance === "Take") {
    return "Skipping final plan validation because Judgment already said Take.";
  }
  return "Acting on incomplete confirmation and rewriting the plan after entry.";
}

function buildNextFocus(input: BuildHermesOpinionInput): string {
  const { judgment, regime, confidenceBreakdown } = input;

  if (judgment.stance === "Insufficient Data") {
    return "Restore data quality and ensure Confidence/Readiness inputs are available before seeking a personal take.";
  }
  if (judgment.stance === "Manage Existing Position") {
    return (
      judgment.conditionsToProceed[0] ??
      "Manage the open risk against invalidation; do not open a second unplanned thesis."
    );
  }
  if (judgment.conditionsToProceed[0]) {
    return `Next focus: ${judgment.conditionsToProceed[0]}`;
  }
  if (judgment.stance === "Wait" || judgment.stance === "Avoid") {
    if (confidenceBreakdown.reducingDrivers[0]) {
      return `Next focus: address the top reducing driver — ${confidenceBreakdown.reducingDrivers[0]}.`;
    }
    return "Next focus: improve Trade Readiness and resolve blockers without inventing a directional prediction.";
  }
  if (judgment.stance === "Take With Caution") {
    return (
      judgment.conditionsToProceed[0] ??
      "Next focus: keep size conservative and demand confirmation before increasing risk."
    );
  }
  if (judgment.stance === "Take") {
    return (
      judgment.conditionsToProceed[0] ??
      "Next focus: validate stop/target once more, then use paper Decision Review — Opinion is not execution."
    );
  }
  if (regime.eventRegime !== "Normal") {
    return "Next focus: wait for event backdrop clarity before elevating personal willingness to act.";
  }
  return "Next focus: study structure and confirmation; protect process over urgency.";
}

function buildSummary(input: BuildHermesOpinionInput, opinion: string): string {
  const conf = input.confidenceBreakdown.finalScore;
  const ready =
    input.readinessScore === undefined ? "n/a" : String(input.readinessScore);
  return [
    `Opinion [${input.judgment.stance}]`,
    `Confidence ${conf}`,
    `Readiness ${ready}`,
    `Regime ${input.regime.structureRegime}/${input.regime.eventRegime}.`,
    trimSentence(opinion),
  ].join(" · ");
}

function fromEvidence(e: HermesEvidence): HermesOpinionEvidenceRef {
  return {
    evidenceId: e.id,
    claim: e.claim,
    category: e.category,
    direction: e.direction,
    source: "evidence",
    weightHint: e.strength,
  };
}

function fromContribution(
  row: ConfidenceContribution,
  direction: EvidenceDirection,
): HermesOpinionEvidenceRef {
  return {
    evidenceId: row.evidenceIds[0],
    claim: row.explanation || row.label || row.summary || row.category,
    category: row.category,
    direction,
    source: "confidence-breakdown",
    weightHint: Math.abs(row.contribution),
  };
}

function sortContributions(rows: ConfidenceContribution[]): ConfidenceContribution[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        Math.abs(b.contribution) - Math.abs(a.contribution) ||
        a.category.localeCompare(b.category),
    );
}

function dedupeRefs(refs: HermesOpinionEvidenceRef[]): HermesOpinionEvidenceRef[] {
  const seen = new Set<string>();
  const out: HermesOpinionEvidenceRef[] = [];
  for (const ref of refs) {
    const key = `${ref.source}|${ref.evidenceId ?? ""}|${normalize(ref.claim)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function uniqueIds(ids: Array<string | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function trimSentence(text: string, max = 220): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Guard for tests and callers — opinion must never invent Buy/Sell. */
export function opinionContainsTradeCommands(opinion: HermesOpinion): boolean {
  const text = [
    opinion.opinion,
    opinion.why,
    opinion.biggestRisk,
    opinion.commonTraderMistake,
    opinion.nextFocus,
    opinion.summary,
    ...opinion.whatWouldChangeOpinion,
    ...opinion.supportingEvidence.map((e) => e.claim),
    ...opinion.contradictingEvidence.map((e) => e.claim),
  ].join(" ");
  return /\bbuy\b|\bsell\b/i.test(text);
}

/** Stance helper for exhaustive checks in tests */
export function isJudgmentStance(value: string): value is HermesJudgmentStance {
  return (
    value === "Take" ||
    value === "Take With Caution" ||
    value === "Wait" ||
    value === "Avoid" ||
    value === "Manage Existing Position" ||
    value === "Insufficient Data"
  );
}
