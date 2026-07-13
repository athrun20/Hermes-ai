/**
 * Multi-timeframe context → confirmation notes only (no score changes).
 */

import type {
  IntelligenceV3Input,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

const CONFLICT_STATUSES = /conflict|mixed|no clear alignment/i;

export function contributeMtfContext(input: IntelligenceV3Input): RuleContribution {
  const out: RuleContribution = {
    caveats: [],
    missingConfirmations: [],
    contextNotes: [],
    uncertaintyDrivers: [],
    reduceUncertainty: [],
    warnings: [],
  };

  const mtf = input.multiTimeframe;
  if (!mtf) {
    out.warnings.push(
      "Multi-timeframe context missing — alignment confirmation notes omitted.",
    );
    return out;
  }

  const status = mtf.status ?? "";
  const hasConflict =
    CONFLICT_STATUSES.test(status) ||
    (typeof mtf.alignmentScore === "number" && mtf.alignmentScore < 45) ||
    Boolean(mtf.countertrendWarning);

  if (hasConflict) {
    out.caveats.push({
      id: "mtf-conflict",
      category: "alignment",
      severity: "caution",
      title: "Multi-timeframe confirmation incomplete",
      detail:
        mtf.countertrendWarning ||
        `Timeframe alignment status is “${status || "mixed"}” — treat cross-TF confirmation as incomplete.`,
      processGuidance:
        "Seek higher-timeframe agreement before treating lower-timeframe structure as fully confirmed. This does not rewrite Confidence.",
    });
    out.missingConfirmations.push({
      id: "mc-mtf-alignment",
      label: "Multi-timeframe alignment",
      whyItMatters:
        "Cross-timeframe agreement is a confirmation check, separate from thesis Confidence and plan Trade Quality.",
      relatedMetric: "mtf",
    });
    out.uncertaintyDrivers.push("Multi-timeframe conflict or weak alignment");
    out.reduceUncertainty.push(
      "Wait for constructive alignment or accept countertrend risk explicitly in the plan process",
    );
  }

  if (mtf.pattern) {
    out.contextNotes.push({
      id: "cn-mtf-pattern",
      kind: "general",
      text: `MTF pattern context: ${mtf.pattern}`,
    });
  }

  return out;
}
