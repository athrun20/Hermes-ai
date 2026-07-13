/**
 * Trade Quality context notes — does not recompute TQ.
 */

import type {
  IntelligenceV3Input,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

export function contributeTradeQualityContext(
  input: IntelligenceV3Input,
): RuleContribution {
  const out: RuleContribution = {
    caveats: [],
    missingConfirmations: [],
    contextNotes: [],
    uncertaintyDrivers: [],
    reduceUncertainty: [],
    warnings: [],
  };

  const tq = input.tradeQuality;
  if (!tq) {
    out.warnings.push(
      "Trade Quality not supplied — plan-quality context notes omitted.",
    );
    return out;
  }

  const notes = tq.notes ?? [];
  if (notes.length > 0) {
    out.contextNotes.push({
      id: "cn-tq-notes",
      kind: "general",
      text: `Plan quality notes (unchanged score ${tq.score}${tq.grade ? `, grade ${tq.grade}` : ""}): ${notes.slice(0, 3).join("; ")}`,
    });
  }

  // Soft process caution when plan quality is weak — never invent a new score.
  if (tq.score < 55) {
    out.caveats.push({
      id: "tq-weak-plan",
      category: "plan-quality",
      severity: "caution",
      title: "Plan quality needs work",
      detail:
        "Trade Quality is below a comfortable process threshold — revise levels and risk before treating the plan as complete.",
      processGuidance:
        "Improve the plan structure. Do not use low Trade Quality as a substitute Confidence number.",
    });
    out.missingConfirmations.push({
      id: "mc-plan-complete",
      label: "Complete trade plan (levels, risk, constraints)",
      whyItMatters:
        "Trade Quality measures plan completeness — separate from thesis Confidence and timing readiness.",
      relatedMetric: "tradeQuality",
    });
    out.uncertaintyDrivers.push("Incomplete or weak trade plan quality");
    out.reduceUncertainty.push(
      "Clarify entry, invalidation, targets, and size constraints on the plan",
    );
  } else if (tq.score >= 75 && (input.tradeReadiness.score < 55)) {
    // High TQ + low readiness: keep concepts distinct
    out.caveats.push({
      id: "tq-good-plan-not-ready",
      category: "plan-quality",
      severity: "info",
      title: "Plan quality is not timing readiness",
      detail:
        "Plan quality may be constructive while Trade Readiness still requires confirmation.",
      processGuidance:
        "A better plan does not automatically mean it is time to act. Hold readiness blockers separate.",
    });
  }

  return out;
}
