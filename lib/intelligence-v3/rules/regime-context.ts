/**
 * Optional Intelligence v2 shadow regime → soft context only.
 */

import type {
  IntelligenceV3Input,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

export function contributeRegimeContext(
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

  const shadow = input.intelligenceV2Shadow;
  if (!shadow) {
    return out;
  }

  if (shadow.degraded) {
    out.caveats.push({
      id: "v2-shadow-degraded",
      category: "regime",
      severity: "info",
      title: "Shadow intelligence degraded",
      detail:
        "Optional Intelligence v2 shadow context is degraded — product scores remain authoritative.",
      processGuidance:
        "Prefer product Confidence, Readiness, and Trade Quality. Treat shadow notes as secondary coaching only.",
    });
    out.uncertaintyDrivers.push("Degraded Intelligence v2 shadow context");
  }

  if (shadow.warnings && shadow.warnings.length > 0) {
    for (const [index, warning] of shadow.warnings.slice(0, 3).entries()) {
      out.contextNotes.push({
        id: `cn-v2-warning-${index}`,
        kind: "general",
        text: `Shadow note: ${warning}`,
      });
    }
  }

  if (shadow.regime != null) {
    const regimeText =
      typeof shadow.regime === "string"
        ? shadow.regime
        : typeof shadow.regime === "object" &&
            shadow.regime !== null &&
            "structure" in (shadow.regime as object)
          ? String((shadow.regime as { structure?: unknown }).structure ?? "regime present")
          : "regime context present";
    out.contextNotes.push({
      id: "cn-v2-regime",
      kind: "general",
      text: `Optional regime context (shadow only): ${regimeText}`,
    });
  }

  return out;
}
