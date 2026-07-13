/**
 * Hermes coach tone helpers — process language only.
 */

import type { IntelligenceV3Severity } from "@/lib/intelligence-v3/types";

const SEVERITY_RANK: Record<IntelligenceV3Severity, number> = {
  none: 0,
  info: 1,
  caution: 2,
  "block-process": 3,
};

export function maxSeverity(
  a: IntelligenceV3Severity,
  b: IntelligenceV3Severity,
): IntelligenceV3Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function severityFromCaveats(
  severities: IntelligenceV3Severity[],
): IntelligenceV3Severity {
  return severities.reduce<IntelligenceV3Severity>(
    (acc, s) => maxSeverity(acc, s),
    "none",
  );
}

/** Stable sort: higher severity first, then id. */
export function compareCaveatSeverity(
  a: { severity: Exclude<IntelligenceV3Severity, "none">; id: string },
  b: { severity: Exclude<IntelligenceV3Severity, "none">; id: string },
): number {
  const diff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}

export const DEFAULT_HEADLINE_NONE =
  "Existing scores stand; continue to separate thesis strength, readiness, and plan quality.";
