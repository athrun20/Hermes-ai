/**
 * Trade Readiness → process caveats (no score recalculation).
 */

import type {
  IntelligenceV3Input,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

const BLOCKED_STATES = new Set([
  "Not Ready",
  "Incomplete",
  "Developing",
  "not ready",
  "incomplete",
  "developing",
  "blocked",
  "wait",
]);

export function contributeReadiness(input: IntelligenceV3Input): RuleContribution {
  const out: RuleContribution = {
    caveats: [],
    missingConfirmations: [],
    contextNotes: [],
    uncertaintyDrivers: [],
    reduceUncertainty: [],
    warnings: [],
  };

  const readiness = input.tradeReadiness;
  const blockers = readiness.blockers ?? [];
  const state = readiness.state ?? "";
  const hasBlockers = blockers.length > 0;
  const stateSuggestsWait =
    state.length > 0 &&
    (BLOCKED_STATES.has(state) ||
      /not ready|incomplete|developing|wait|caution/i.test(state));

  const confidenceHigh = input.confidence.score >= 75;
  const readinessLow = readiness.score < 55 || hasBlockers || stateSuggestsWait;

  if (confidenceHigh && readinessLow) {
    out.caveats.push({
      id: "rd-high-conf-low-ready",
      category: "readiness",
      severity: "caution",
      title: "Thesis strength is not execution readiness",
      detail:
        "Strong analytical thesis, but execution conditions require additional confirmation.",
      processGuidance:
        "Keep Confidence separate from Trade Readiness. Wait for readiness blockers to clear before treating the setup as actionable process.",
    });
    out.uncertaintyDrivers.push(
      "High Confidence with incomplete or blocked Trade Readiness",
    );
    out.reduceUncertainty.push(
      "Resolve readiness blockers without changing the Confidence number itself",
    );
  }

  if (hasBlockers) {
    for (const [index, blocker] of blockers.entries()) {
      out.missingConfirmations.push({
        id: `mc-readiness-blocker-${index}`,
        label: blocker,
        whyItMatters:
          "Trade Readiness lists this as incomplete confirmation — not a reason to rewrite Confidence.",
        relatedMetric: "tradeReadiness",
      });
    }
    out.caveats.push({
      id: "rd-blockers-present",
      category: "readiness",
      severity: "caution",
      title: "Readiness blockers present",
      detail: `${blockers.length} readiness blocker(s) remain before the setup is process-ready.`,
      processGuidance:
        "Address each blocker explicitly. Do not collapse readiness issues into a lower Confidence score.",
    });
  } else if (stateSuggestsWait && !confidenceHigh) {
    out.caveats.push({
      id: "rd-state-wait",
      category: "readiness",
      severity: "info",
      title: "Readiness still developing",
      detail: `Trade Readiness state is “${state}” — patience is part of the process.`,
      processGuidance:
        "Observe and prepare; treat readiness state as process status, not a new score.",
    });
  }

  return out;
}
