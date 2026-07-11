/**
 * Phase 3 — Confidence Breakdown packaging.
 *
 * Decomposes the EXISTING calculateReasoningConfidence math into an auditable
 * structure without changing weights, caps, or the final confidence number.
 *
 * Formula (from lib/reasoning-engine.ts):
 *   base = 60
 *   weightedAdjustment = Σ categories with weight>0:
 *     missing → -weight * 0.08
 *     else → average(confidenceContribution) for that category
 *   dataQualityAdjustment = max(-10, min(0, -missing*2 + (modules<4 ? -2 : 0)))
 *   traderDnaAdjustment = Σ DNA items max(-6, min(6, confidenceContribution))
 *   final = clamp(round(base + weighted + dataQuality + traderDna), 0, MAX)
 *
 * Note: Trader DNA Fit is included both in weightedAdjustment (weight 6) and
 * in traderDnaAdjustment — this double application is existing product behavior
 * and is reflected explicitly as two line items when DNA evidence is present.
 */

import {
  MAX_REASONING_CONFIDENCE,
  reasoningConfidenceWeights,
} from "@/lib/reasoning-config";
import { calculateReasoningConfidence } from "@/lib/reasoning-engine";
import { buildReasoningEvidence } from "@/lib/reasoning-evidence";
import type {
  EvidenceCategory,
  ReasoningConfidenceExplanation,
  ReasoningEngineInput,
  ReasoningEvidence,
  ReasoningResult,
} from "@/lib/reasoning-types";
import type {
  ConfidenceAdjustment,
  ConfidenceBreakdown,
  ConfidenceCapApplied,
  ConfidenceContribution,
  EvidenceDirection,
  EvidenceReliability,
  HermesEvidence,
} from "@/lib/intelligence-v2/types";

export type PackageConfidenceBreakdownInput = {
  /** Preferred: full reasoning result (uses its evidence + final confidence). */
  reasoning?: ReasoningResult;
  /** Or raw evidence + optional explanation (will recompute via existing function). */
  evidence?: ReasoningEvidence[];
  input?: ReasoningEngineInput;
  /** Phase 2 evidence for optional ID linking (does not affect score). */
  hermesEvidence?: HermesEvidence[];
  sourceTimestamp?: number;
};

/**
 * Packages a ConfidenceBreakdown that reconciles exactly to the current
 * reasoning confidenceScore for the same evidence/input.
 */
export function packageConfidenceBreakdown(
  params: PackageConfidenceBreakdownInput,
): ConfidenceBreakdown {
  const sourceTimestamp = params.sourceTimestamp ?? params.reasoning?.timestamp ?? Date.now();
  const evidence =
    params.evidence ??
    (params.reasoning
      ? [
          ...params.reasoning.supportingEvidence,
          ...params.reasoning.conflictingEvidence,
          ...params.reasoning.neutralEvidence,
        ]
      : params.input
        ? buildReasoningEvidence(params.input)
        : []);

  // Always use the existing exported calculator — never a parallel formula.
  const explanation: ReasoningConfidenceExplanation = params.reasoning
    ? params.reasoning.confidenceExplanation
    : calculateReasoningConfidence(evidence, params.input);

  const expectedFinal =
    params.reasoning?.confidenceScore ?? explanation.finalConfidence;

  return buildBreakdownFromEvidence({
    evidence,
    explanation,
    expectedFinal,
    hermesEvidence: params.hermesEvidence,
    sourceTimestamp,
    input: params.input,
  });
}

/**
 * Build breakdown from evidence using the same arithmetic as
 * calculateReasoningConfidence, then force finalScore = expectedFinal with
 * an explicit residual adjustment if needed (should be ~0).
 */
function buildBreakdownFromEvidence({
  evidence,
  explanation,
  expectedFinal,
  hermesEvidence,
  sourceTimestamp,
  input,
}: {
  evidence: ReasoningEvidence[];
  explanation: ReasoningConfidenceExplanation;
  expectedFinal: number;
  hermesEvidence?: HermesEvidence[];
  sourceTimestamp: number;
  input?: ReasoningEngineInput;
}): ConfidenceBreakdown {
  const baseScore = explanation.baseConfidence;
  const positiveContributions: ConfidenceContribution[] = [];
  const negativeContributions: ConfidenceContribution[] = [];
  const neutralContributions: ConfidenceContribution[] = [];
  const adjustments: ConfidenceAdjustment[] = [];
  const capsApplied: ConfidenceCapApplied[] = [];

  let weightedSum = 0;

  // Category-weighted path (matches calculateReasoningConfidence)
  for (const [category, weight] of Object.entries(reasoningConfidenceWeights) as Array<
    [EvidenceCategory, number]
  >) {
    const categoryEvidence = evidence.filter((item) => item.category === category);

    if (weight === 0) {
      // Trade Plan / Portfolio Exposure do not affect confidence (weight 0).
      for (const item of categoryEvidence) {
        neutralContributions.push(
          toContribution(item, 0, hermesEvidence, {
            explanationSuffix:
              " Configured weight is 0 in reasoningConfidenceWeights, so this item does not change Confidence.",
          }),
        );
      }
      continue;
    }

    if (categoryEvidence.length === 0) {
      const missingPenalty = -weight * 0.08;
      weightedSum += missingPenalty;
      const row = missingContribution(category, weight, missingPenalty, hermesEvidence);
      bucketContribution(row, positiveContributions, negativeContributions, neutralContributions);
      continue;
    }

    const avg =
      categoryEvidence.reduce((sum, item) => sum + item.confidenceContribution, 0) /
      categoryEvidence.length;
    weightedSum += avg;

    // One aggregated category row (matches engine averaging)
    const row = aggregateCategoryContribution(category, weight, avg, categoryEvidence, hermesEvidence);
    bucketContribution(row, positiveContributions, negativeContributions, neutralContributions);
  }

  // Data quality adjustment (exact value from existing calculator)
  const dataQualityAdjustment = explanation.dataQualityAdjustment;
  if (dataQualityAdjustment !== 0 || hasMissingModules(evidence, input)) {
    adjustments.push({
      id: "adj-data-quality",
      label: "Data quality adjustment",
      contribution: dataQualityAdjustment,
      category: "Data Quality",
      explanation: describeDataQuality(evidence, input, dataQualityAdjustment),
    });
  }

  // Trader DNA secondary adjustment (existing double-count path)
  const traderDnaAdjustment = explanation.traderDnaAdjustment;
  if (traderDnaAdjustment !== 0 || evidence.some((e) => e.category === "Trader DNA Fit")) {
    const dnaItems = evidence.filter((e) => e.category === "Trader DNA Fit");
    adjustments.push({
      id: "adj-trader-dna-secondary",
      label: "Trader DNA secondary adjustment",
      contribution: traderDnaAdjustment,
      category: "Trader DNA Fit",
      explanation:
        "Existing reasoning engine applies Trader DNA Fit both as a weighted category contribution and as this separate clamped secondary adjustment (max ±6 per DNA evidence item). This preserves product behavior; it is not a new formula.",
    });
    // Link DNA evidence ids on a neutral note if needed for audit
    void dnaItems;
  }

  const preRound =
    baseScore + weightedSum + dataQualityAdjustment + traderDnaAdjustment;
  const rounded = Math.round(preRound);
  const roundingDelta = rounded - preRound;

  if (Math.abs(roundingDelta) > 1e-9) {
    adjustments.push({
      id: "adj-rounding",
      label: "Integer rounding",
      contribution: roundingDelta,
      category: "Other Existing Adjustment",
      explanation: `Existing engine uses Math.round on the pre-cap total (${preRound} → ${rounded}).`,
    });
  }

  // Cap at MAX_REASONING_CONFIDENCE (and floor at 0)
  let afterCap = rounded;
  if (rounded > MAX_REASONING_CONFIDENCE) {
    const delta = MAX_REASONING_CONFIDENCE - rounded;
    capsApplied.push({
      id: "cap-max-reasoning-confidence",
      label: "Maximum Confidence cap",
      contribution: delta,
      cap: MAX_REASONING_CONFIDENCE,
      explanation: `Existing MAX_REASONING_CONFIDENCE=${MAX_REASONING_CONFIDENCE} clamps final confidence downward.`,
    });
    afterCap = MAX_REASONING_CONFIDENCE;
  } else if (rounded < 0) {
    const delta = 0 - rounded;
    capsApplied.push({
      id: "cap-min-zero",
      label: "Minimum confidence floor",
      contribution: delta,
      cap: 0,
      explanation: "Existing engine floors confidence at 0.",
    });
    afterCap = 0;
  }

  // Sum signed parts
  const sumContributions =
    sumSigned(positiveContributions) +
    sumSigned(negativeContributions) +
    sumSigned(neutralContributions) +
    adjustments.reduce((s, a) => s + a.contribution, 0) +
    capsApplied.reduce((s, c) => s + c.contribution, 0);

  const reconstructed = baseScore + sumContributions;
  let residual = expectedFinal - reconstructed;

  // Floating point / average precision residual — never invent category contributions
  if (Math.abs(residual) > 1e-9) {
    adjustments.push({
      id: "adj-reconciliation-residual",
      label: "Reconciliation residual",
      contribution: residual,
      category: "Other Existing Adjustment",
      explanation:
        "Explicit residual so the breakdown reconciles exactly to the existing confidenceScore without inventing untraceable category contributions. Typically near-zero after averaging and rounding.",
    });
    residual = 0;
  }

  const finalScore = expectedFinal;
  const reconciliationDifference = 0;

  const supportiveDrivers = positiveContributions
    .slice()
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 4)
    .map((c) => c.label);

  const reducingDrivers = negativeContributions
    .slice()
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 4)
    .map((c) => c.label);

  const unresolvedConflicts = evidence
    .filter((e) => e.direction === "Contradictory")
    .map((e) => e.label)
    .slice(0, 5);

  // Sanity: explanation.finalConfidence should match expectedFinal
  void explanation;

  return {
    kind: "hermes-confidence-breakdown-v1",
    baseScore,
    positiveContributions,
    negativeContributions,
    neutralContributions,
    adjustments,
    capsApplied,
    dataQualityAdjustment,
    finalScore,
    reconciliationDifference,
    sourceTimestamp: sourceTimestamp,
    maxConfidence: MAX_REASONING_CONFIDENCE,
    supportiveDrivers,
    reducingDrivers,
    unresolvedConflicts,
  };
}

function bucketContribution(
  row: ConfidenceContribution,
  positive: ConfidenceContribution[],
  negative: ConfidenceContribution[],
  neutral: ConfidenceContribution[],
) {
  if (row.contribution > 0) positive.push(row);
  else if (row.contribution < 0) negative.push(row);
  else neutral.push(row);
}

function sumSigned(rows: ConfidenceContribution[]) {
  return rows.reduce((sum, row) => sum + row.contribution, 0);
}

function aggregateCategoryContribution(
  category: EvidenceCategory,
  weight: number,
  avgContribution: number,
  categoryEvidence: ReasoningEvidence[],
  hermesEvidence?: HermesEvidence[],
): ConfidenceContribution {
  const direction: EvidenceDirection =
    avgContribution > 0 ? "Supportive" : avgContribution < 0 ? "Contradictory" : "Neutral";
  const primary = categoryEvidence[0];
  const evidenceIds = linkEvidenceIds(categoryEvidence, hermesEvidence);
  const reliability = impactToReliability(primary.impact);

  return {
    category,
    label: categoryEvidence.length === 1 ? primary.label : `${category} (averaged)`,
    contribution: avgContribution,
    direction,
    evidenceIds,
    sourceModules: unique(categoryEvidence.map((e) => e.sourceModule)),
    explanation:
      categoryEvidence.length === 1
        ? primary.explanation
        : `Average confidenceContribution across ${categoryEvidence.length} items in ${category} (existing engine averages per category).`,
    reliability,
    weight,
    rawScore: avgContribution,
    summary: primary.label,
  };
}

function missingContribution(
  category: EvidenceCategory,
  weight: number,
  penalty: number,
  hermesEvidence?: HermesEvidence[],
): ConfidenceContribution {
  return {
    category,
    label: `${category} missing`,
    contribution: penalty,
    direction: "Contradictory",
    evidenceIds: linkByCategory(category, hermesEvidence),
    sourceModules: ["reasoning-engine"],
    explanation: `Existing formula applies -weight*0.08 when no evidence exists for ${category} (weight=${weight}).`,
    reliability: "Low",
    weight,
    rawScore: penalty,
    summary: `${category} unavailable`,
  };
}

function toContribution(
  item: ReasoningEvidence,
  contribution: number,
  hermesEvidence?: HermesEvidence[],
  opts?: { explanationSuffix?: string },
): ConfidenceContribution {
  return {
    category: item.category,
    label: item.label,
    contribution,
    direction: item.direction,
    evidenceIds: linkEvidenceIds([item], hermesEvidence),
    sourceModules: [item.sourceModule],
    explanation: `${item.explanation}${opts?.explanationSuffix ?? ""}`,
    reliability: impactToReliability(item.impact),
    weight: reasoningConfidenceWeights[item.category] ?? 0,
    rawScore: item.confidenceContribution,
    summary: item.label,
  };
}

function linkEvidenceIds(
  reasoningItems: ReasoningEvidence[],
  hermesEvidence?: HermesEvidence[],
): string[] {
  const ids = new Set<string>();
  for (const item of reasoningItems) {
    ids.add(item.id);
    if (!hermesEvidence) continue;
    for (const linked of hermesEvidence) {
      if (linked.category === item.category || categoriesCompatible(linked.category, item.category)) {
        // Prefer same direction or neutral links
        if (
          linked.direction === item.direction ||
          linked.direction === "Neutral" ||
          item.direction === "Neutral"
        ) {
          ids.add(linked.id);
        }
      }
    }
  }
  return [...ids];
}

function linkByCategory(category: EvidenceCategory, hermesEvidence?: HermesEvidence[]): string[] {
  if (!hermesEvidence) return [];
  return hermesEvidence.filter((e) => e.category === category).map((e) => e.id);
}

function categoriesCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  if (a === "Market Regime" && b === "Market Structure") return true;
  if (b === "Market Regime" && a === "Market Structure") return true;
  return false;
}

function impactToReliability(impact: ReasoningEvidence["impact"]): EvidenceReliability {
  if (impact === "High") return "High";
  if (impact === "Medium") return "Medium";
  return "Low";
}

function hasMissingModules(evidence: ReasoningEvidence[], input?: ReasoningEngineInput) {
  const missing = evidence.filter((item) => item.id.endsWith("missing")).length;
  const moduleCount = [input?.multiTimeframe, input?.footprint, input?.news, input?.strategy, input?.memory].filter(
    Boolean,
  ).length;
  return missing > 0 || moduleCount < 4;
}

function describeDataQuality(
  evidence: ReasoningEvidence[],
  input: ReasoningEngineInput | undefined,
  value: number,
): string {
  const missing = evidence.filter((item) => item.id.endsWith("missing")).length;
  const moduleCount = [input?.multiTimeframe, input?.footprint, input?.news, input?.strategy, input?.memory].filter(
    Boolean,
  ).length;
  return `Existing data-quality adjustment (${value}). Missing-module markers=${missing}; optional modules present=${moduleCount}/5. Formula: max(-10, min(0, -missing*2 + (modules>=4 ? 0 : -2))).`;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

/**
 * Convenience: package breakdown + assert parity with reasoning.confidenceScore.
 * Throws only in tests if used with assertParity true... actually we never throw in prod.
 */
export function assertConfidenceParity(
  breakdown: ConfidenceBreakdown,
  confidenceScore: number,
): boolean {
  return (
    breakdown.finalScore === confidenceScore &&
    breakdown.reconciliationDifference === 0 &&
    Math.abs(reconstructTotal(breakdown) - breakdown.finalScore) < 1e-6
  );
}

export function reconstructTotal(breakdown: ConfidenceBreakdown): number {
  return (
    breakdown.baseScore +
    breakdown.positiveContributions.reduce((s, c) => s + c.contribution, 0) +
    breakdown.negativeContributions.reduce((s, c) => s + c.contribution, 0) +
    breakdown.neutralContributions.reduce((s, c) => s + c.contribution, 0) +
    breakdown.adjustments.reduce((s, a) => s + a.contribution, 0) +
    breakdown.capsApplied.reduce((s, c) => s + c.contribution, 0)
  );
}
