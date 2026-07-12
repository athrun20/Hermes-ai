/**
 * Developer-only Shadow Mode validation utilities.
 *
 * Summarizes the in-memory Shadow Mode ring buffer for local debugging.
 * No user-facing panel, route, or production side effects.
 */

import {
  getRecentShadowComparisons,
  clearShadowComparisons,
  SHADOW_RING_BUFFER_CAPACITY,
} from "@/lib/intelligence-v2/shadow-mode";
import type {
  HermesShadowComparison,
  ShadowFieldComparison,
  ShadowParityStatus,
} from "@/lib/intelligence-v2/shadow-mode-types";

export type ShadowDifferenceClass =
  | "Expected"
  | "Acceptable"
  | "Needs Investigation"
  | "Blocker";

export type ShadowValidationRow = {
  symbol: string;
  timeframe: string;
  timestamp: number;
  parityStatus: ShadowParityStatus;
  confidenceParity: string;
  readinessParity: string;
  tradeQualityParity: string;
  hermesScoreParity: string;
  degraded: boolean;
  missingInputs: string;
  warnings: string;
  judgmentStance: string;
  convictionLevel: string;
  openPosition: boolean;
  durationMs: number;
  blockers: string[];
  notes: string[];
};

export type ShadowValidationReport = {
  kind: "hermes-shadow-validation-report-v1";
  generatedAt: number;
  ringBufferCapacity: number;
  comparisonCount: number;
  rows: ShadowValidationRow[];
  summary: {
    pass: number;
    partial: number;
    fail: number;
    error: number;
    skipped: number;
    blockerCount: number;
    needsInvestigationCount: number;
    avgDurationMs: number;
    maxDurationMs: number;
    uniqueSymbols: string[];
    uniqueTimeframes: string[];
    commonMissingInputs: Array<{ input: string; count: number }>;
  };
  classifiedDifferences: Array<{
    field: string;
    class: ShadowDifferenceClass;
    detail: string;
    symbol?: string;
  }>;
  recommendation: "Continue Shadow Mode" | "Ready for controlled cutover" | "Not ready for cutover";
  recommendationRationale: string[];
};

/**
 * Build a structured validation report from recent shadow comparisons.
 * Defaults to the live ring buffer; pass comparisons for deterministic tests.
 */
export function buildShadowValidationReport(
  comparisons: readonly HermesShadowComparison[] = getRecentShadowComparisons(),
  options?: { generatedAt?: number },
): ShadowValidationReport {
  const generatedAt = options?.generatedAt ?? Date.now();
  const rows = comparisons.map(toValidationRow);
  const classifiedDifferences = classifyDifferences(comparisons);

  const pass = comparisons.filter((c) => c.parityStatus === "Pass").length;
  const partial = comparisons.filter((c) => c.parityStatus === "Partial").length;
  const fail = comparisons.filter((c) => c.parityStatus === "Fail").length;
  const error = comparisons.filter((c) => c.parityStatus === "Error").length;
  const skipped = comparisons.filter((c) => c.parityStatus === "Skipped").length;

  const durations = comparisons.map((c) => c.durationMs).filter((d) => d >= 0);
  const avgDurationMs =
    durations.length === 0
      ? 0
      : Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100;
  const maxDurationMs = durations.length === 0 ? 0 : Math.max(...durations);

  const missingCounts = new Map<string, number>();
  for (const c of comparisons) {
    for (const m of c.missingInputs) {
      missingCounts.set(m, (missingCounts.get(m) ?? 0) + 1);
    }
  }
  const commonMissingInputs = [...missingCounts.entries()]
    .map(([input, count]) => ({ input, count }))
    .sort((a, b) => b.count - a.count || a.input.localeCompare(b.input));

  const blockerCount = classifiedDifferences.filter((d) => d.class === "Blocker").length;
  const needsInvestigationCount = classifiedDifferences.filter(
    (d) => d.class === "Needs Investigation",
  ).length;

  const recommendation = recommendCutover({
    fail,
    error,
    blockerCount,
    needsInvestigationCount,
    comparisonCount: comparisons.length,
  });

  return {
    kind: "hermes-shadow-validation-report-v1",
    generatedAt,
    ringBufferCapacity: SHADOW_RING_BUFFER_CAPACITY,
    comparisonCount: comparisons.length,
    rows,
    summary: {
      pass,
      partial,
      fail,
      error,
      skipped,
      blockerCount,
      needsInvestigationCount,
      avgDurationMs,
      maxDurationMs,
      uniqueSymbols: unique(comparisons.map((c) => c.symbol)),
      uniqueTimeframes: unique(
        comparisons.map((c) => c.timeframe ?? "").filter(Boolean),
      ),
      commonMissingInputs,
    },
    classifiedDifferences,
    recommendation: recommendation.label,
    recommendationRationale: recommendation.rationale,
  };
}

/**
 * Print a developer console table of recent shadow comparisons.
 * Safe no-op when console is unavailable.
 */
export function printShadowValidationTable(
  comparisons: readonly HermesShadowComparison[] = getRecentShadowComparisons(),
): ShadowValidationReport {
  const report = buildShadowValidationReport(comparisons);
  if (typeof console === "undefined") return report;

  const tableRows = report.rows.map((row) => ({
    symbol: row.symbol,
    tf: row.timeframe,
    parity: row.parityStatus,
    conf: row.confidenceParity,
    ready: row.readinessParity,
    tq: row.tradeQualityParity,
    score: row.hermesScoreParity,
    degraded: row.degraded,
    open: row.openPosition,
    judgment: row.judgmentStance,
    conviction: row.convictionLevel,
    ms: row.durationMs,
    missing: row.missingInputs,
  }));

  // eslint-disable-next-line no-console
  console.info(
    `[Hermes Shadow Validation] ${report.comparisonCount} comparison(s) · recommendation: ${report.recommendation}`,
  );
  if (typeof console.table === "function") {
    // eslint-disable-next-line no-console
    console.table(tableRows);
  } else {
    // eslint-disable-next-line no-console
    console.info(tableRows);
  }
  // eslint-disable-next-line no-console
  console.info("[Hermes Shadow Validation] summary", report.summary);
  if (report.classifiedDifferences.length) {
    // eslint-disable-next-line no-console
    console.info("[Hermes Shadow Validation] differences", report.classifiedDifferences);
  }
  return report;
}

/**
 * Callable developer helper — inspect ring buffer without UI.
 * Attach in devtools: globalThis.__hermesShadowValidation?.()
 */
export function inspectHermesShadowBuffer(): ShadowValidationReport {
  return printShadowValidationTable(getRecentShadowComparisons());
}

/**
 * Register developer helper on globalThis in non-production environments only.
 * Does nothing in production builds.
 */
export function registerShadowValidationDevHelper(
  globalRef: typeof globalThis = globalThis,
  env: { NODE_ENV?: string } = { NODE_ENV: process.env.NODE_ENV },
): void {
  if (env.NODE_ENV === "production") return;
  const target = globalRef as typeof globalThis & {
    __hermesShadowValidation?: () => ShadowValidationReport;
    __hermesShadowClear?: () => void;
  };
  target.__hermesShadowValidation = inspectHermesShadowBuffer;
  target.__hermesShadowClear = () => {
    clearShadowComparisons();
  };
}

export function formatShadowValidationMarkdown(report: ShadowValidationReport): string {
  const lines: string[] = [
    `# Hermes Shadow Validation Report`,
    ``,
    `- Generated: ${new Date(report.generatedAt).toISOString()}`,
    `- Comparisons: ${report.comparisonCount} (capacity ${report.ringBufferCapacity})`,
    `- Recommendation: **${report.recommendation}**`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Pass | ${report.summary.pass} |`,
    `| Partial | ${report.summary.partial} |`,
    `| Fail | ${report.summary.fail} |`,
    `| Error | ${report.summary.error} |`,
    `| Blockers | ${report.summary.blockerCount} |`,
    `| Needs investigation | ${report.summary.needsInvestigationCount} |`,
    `| Avg duration ms | ${report.summary.avgDurationMs} |`,
    `| Max duration ms | ${report.summary.maxDurationMs} |`,
    `| Symbols | ${report.summary.uniqueSymbols.join(", ") || "—"} |`,
    `| Timeframes | ${report.summary.uniqueTimeframes.join(", ") || "—"} |`,
    ``,
    `## Rationale`,
    ``,
    ...report.recommendationRationale.map((r) => `- ${r}`),
    ``,
    `## Classified differences`,
    ``,
  ];

  if (report.classifiedDifferences.length === 0) {
    lines.push(`- None recorded.`);
  } else {
    for (const d of report.classifiedDifferences) {
      lines.push(
        `- **${d.class}** · ${d.field}${d.symbol ? ` (${d.symbol})` : ""}: ${d.detail}`,
      );
    }
  }

  lines.push(``, `## Rows`, ``);
  for (const row of report.rows) {
    lines.push(
      `- ${row.symbol} ${row.timeframe} · ${row.parityStatus} · conf ${row.confidenceParity} · ready ${row.readinessParity} · tq ${row.tradeQualityParity} · score ${row.hermesScoreParity} · ${row.durationMs}ms · open=${row.openPosition} · judgment=${row.judgmentStance} · conviction=${row.convictionLevel}`,
    );
  }

  return lines.join("\n");
}

function toValidationRow(comparison: HermesShadowComparison): ShadowValidationRow {
  const conf = findField(comparison, "confidence");
  const ready = findField(comparison, "readiness");
  const tq = findField(comparison, "tradeQualityScore");
  const score = findField(comparison, "hermesScore");
  const blockers = comparison.comparisons
    .filter((c) => isNumericBlockerField(c.field) && c.passed === false)
    .map((c) => `${c.field}: ${c.explanation}`);

  const notes: string[] = [];
  if (comparison.degraded) notes.push("degraded");
  if (comparison.error) notes.push(`error: ${comparison.error}`);
  if (comparison.missingInputs.length) notes.push(`missing: ${comparison.missingInputs.join(",")}`);

  return {
    symbol: comparison.symbol,
    timeframe: comparison.timeframe ?? "—",
    timestamp: comparison.timestamp,
    parityStatus: comparison.parityStatus,
    confidenceParity: formatFieldParity(conf),
    readinessParity: formatFieldParity(ready),
    tradeQualityParity: formatFieldParity(tq),
    hermesScoreParity: formatFieldParity(score),
    degraded: comparison.degraded,
    missingInputs: comparison.missingInputs.join(", ") || "—",
    warnings: comparison.warnings.slice(0, 3).join(" | ") || "—",
    judgmentStance: comparison.v2Snapshot.judgmentStance ?? "—",
    convictionLevel: comparison.v2Snapshot.convictionLevel ?? "—",
    openPosition: comparison.currentSnapshot.hasOpenPosition,
    durationMs: comparison.durationMs,
    blockers,
    notes,
  };
}

function classifyDifferences(
  comparisons: readonly HermesShadowComparison[],
): ShadowValidationReport["classifiedDifferences"] {
  const out: ShadowValidationReport["classifiedDifferences"] = [];

  for (const comparison of comparisons) {
    for (const field of comparison.comparisons) {
      if (field.passed === true || field.passed === null) {
        if (field.comparableStatus === "Not Comparable") {
          // Document once-style: skip bulk noise for not-comparable presence
          continue;
        }
        if (
          field.comparableStatus === "Partially Comparable" &&
          field.difference === "semantic-divergence"
        ) {
          out.push({
            field: field.field,
            class: "Acceptable",
            detail: field.explanation,
            symbol: comparison.symbol,
          });
        }
        continue;
      }

      // failed
      if (isNumericBlockerField(field.field)) {
        out.push({
          field: field.field,
          class: "Blocker",
          detail: `${field.explanation} (current=${String(field.currentValue)} v2=${String(field.v2Value)} Δ=${String(field.difference)})`,
          symbol: comparison.symbol,
        });
        continue;
      }

      if (field.field === "openPositionManagement") {
        out.push({
          field: field.field,
          class: "Needs Investigation",
          detail: field.explanation,
          symbol: comparison.symbol,
        });
        continue;
      }

      if (field.field === "thesisVsOpinion" || field.field === "coachConclusion") {
        out.push({
          field: field.field,
          class: "Acceptable",
          detail: field.explanation,
          symbol: comparison.symbol,
        });
        continue;
      }

      if (field.field === "dataQuality") {
        out.push({
          field: field.field,
          class: comparison.degraded ? "Expected" : "Needs Investigation",
          detail: field.explanation,
          symbol: comparison.symbol,
        });
        continue;
      }

      out.push({
        field: field.field,
        class: "Needs Investigation",
        detail: field.explanation,
        symbol: comparison.symbol,
      });
    }

    if (comparison.parityStatus === "Error") {
      out.push({
        field: "shadow-run",
        class: "Blocker",
        detail: comparison.error ?? "Shadow run error",
        symbol: comparison.symbol,
      });
    }

    for (const missing of comparison.missingInputs) {
      // Missing optional modules are expected in partial scenarios
      out.push({
        field: `missing:${missing}`,
        class:
          missing === "reasoning" || missing === "candles"
            ? "Needs Investigation"
            : "Expected",
        detail: `Missing input: ${missing}`,
        symbol: comparison.symbol,
      });
    }
  }

  return dedupeClassified(out).slice(0, 100);
}

function recommendCutover(args: {
  fail: number;
  error: number;
  blockerCount: number;
  needsInvestigationCount: number;
  comparisonCount: number;
}): {
  label: ShadowValidationReport["recommendation"];
  rationale: string[];
} {
  const rationale: string[] = [];
  if (args.comparisonCount === 0) {
    return {
      label: "Continue Shadow Mode",
      rationale: ["No shadow comparisons available yet — keep collecting runtime samples."],
    };
  }
  if (args.blockerCount > 0 || args.fail > 0 || args.error > 0) {
    rationale.push(
      `Found ${args.blockerCount} blocker difference(s), ${args.fail} fail and ${args.error} error parity result(s).`,
    );
    rationale.push("Do not cut over until numeric Confidence/Readiness/TQ/Hermes Score parity is clean.");
    return { label: "Not ready for cutover", rationale };
  }
  if (args.needsInvestigationCount > 0) {
    rationale.push(
      `${args.needsInvestigationCount} item(s) need investigation (non-numeric or open-position handling).`,
    );
    rationale.push("Continue Shadow Mode until investigations close.");
    return { label: "Continue Shadow Mode", rationale };
  }
  rationale.push("No numeric blockers or errors in the sampled shadow buffer.");
  rationale.push("Semantic/wording differences remain acceptable; product cutover still requires explicit approval.");
  rationale.push("Recommendation stays short of full cutover — controlled cutover readiness only.");
  return { label: "Ready for controlled cutover", rationale };
}

function findField(
  comparison: HermesShadowComparison,
  field: string,
): ShadowFieldComparison | undefined {
  return comparison.comparisons.find((c) => c.field === field);
}

function formatFieldParity(field: ShadowFieldComparison | undefined): string {
  if (!field) return "n/a";
  if (field.passed === null) return "n/c";
  if (field.passed) return "pass";
  return `fail Δ=${String(field.difference)}`;
}

function isNumericBlockerField(field: string): boolean {
  return (
    field === "confidence" ||
    field === "confidenceBreakdown.finalScore" ||
    field === "readiness" ||
    field === "tradeQualityScore" ||
    field === "hermesScore"
  );
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function dedupeClassified(
  items: ShadowValidationReport["classifiedDifferences"],
): ShadowValidationReport["classifiedDifferences"] {
  const seen = new Set<string>();
  const out: ShadowValidationReport["classifiedDifferences"] = [];
  for (const item of items) {
    const key = `${item.class}|${item.field}|${item.symbol ?? ""}|${item.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
