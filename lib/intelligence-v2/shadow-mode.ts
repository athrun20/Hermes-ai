/**
 * Intelligence v2 Shadow Mode.
 *
 * Runs runHermesIntelligence silently beside the current dashboard pipeline.
 * Current pipeline remains the sole product authority.
 *
 * - Never affects UI, scores, coach messages, or paper trading
 * - Never throws into the dashboard (errors are recorded)
 * - Reuses already-computed inputs (does not re-run engines)
 * - Stores recent comparisons in memory only (dev/test)
 */

import {
  runHermesIntelligence,
  type HermesIntelligenceInput,
} from "@/lib/intelligence-v2/orchestrator";
import type { HermesIntelligenceBundle } from "@/lib/intelligence-v2/types";
import type {
  HermesShadowComparison,
  HermesShadowCurrentSnapshot,
  HermesShadowV2Snapshot,
  ShadowFieldComparison,
  ShadowParityStatus,
  ShadowScalar,
} from "@/lib/intelligence-v2/shadow-mode-types";

const MAX_RECENT_COMPARISONS = 25;

let recentComparisons: HermesShadowComparison[] = [];

export type RunHermesShadowComparisonInput = {
  current: HermesShadowCurrentSnapshot;
  v2Input: HermesIntelligenceInput;
  /** Optional fixed timestamp for deterministic tests */
  timestamp?: number;
  /** When true, skip recording into the in-memory ring buffer */
  skipRecord?: boolean;
  /** When true, skip developer console summary */
  silent?: boolean;
};

/**
 * Shadow Mode is enabled in development and test environments only.
 * Production builds never run v2 comparisons.
 */
export function isShadowModeEnabled(
  env: { NODE_ENV?: string; HERMES_SHADOW_MODE?: string } = {
    NODE_ENV: process.env.NODE_ENV,
    HERMES_SHADOW_MODE: process.env.HERMES_SHADOW_MODE,
  },
): boolean {
  if (env.HERMES_SHADOW_MODE === "0" || env.HERMES_SHADOW_MODE === "false") return false;
  if (env.HERMES_SHADOW_MODE === "1" || env.HERMES_SHADOW_MODE === "true") return true;
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

/**
 * Safe entry point for Shadow Mode.
 * Isolates all v2 failures from the current pipeline.
 */
export function runHermesShadowComparison(
  input: RunHermesShadowComparisonInput,
): HermesShadowComparison {
  const started = nowMs();
  const timestamp = input.timestamp ?? started;
  const missingInputs = detectMissingInputs(input.v2Input);

  try {
    const bundle = runHermesIntelligence(input.v2Input);
    const comparison = compareCurrentToV2({
      current: input.current,
      bundle,
      missingInputs,
      timestamp,
      durationMs: Math.max(0, nowMs() - started),
    });
    if (!input.skipRecord) recordShadowComparison(comparison);
    if (!input.silent) logShadowComparisonSummary(comparison);
    return comparison;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed: HermesShadowComparison = {
      kind: "hermes-shadow-comparison-v1",
      authority: "current-pipeline",
      symbol: String(input.current.symbol),
      timeframe: input.current.timeframe,
      timestamp,
      currentSnapshot: input.current,
      v2Snapshot: {},
      comparisons: [],
      parityStatus: "Error",
      warnings: [
        "Intelligence v2 shadow run failed; current pipeline remains authoritative.",
        message,
      ],
      missingInputs,
      degraded: true,
      error: message,
      durationMs: Math.max(0, nowMs() - started),
    };
    if (!input.skipRecord) recordShadowComparison(failed);
    if (!input.silent) logShadowComparisonSummary(failed);
    return failed;
  }
}

/**
 * Pure comparison once a v2 bundle (or failure) is available.
 * Exported for unit tests without re-running the full orchestrator path.
 */
export function compareCurrentToV2(args: {
  current: HermesShadowCurrentSnapshot;
  bundle: HermesIntelligenceBundle;
  missingInputs?: string[];
  timestamp?: number;
  durationMs?: number;
}): HermesShadowComparison {
  const { current, bundle } = args;
  const timestamp = args.timestamp ?? nowMs();
  const v2Snapshot = extractV2Snapshot(bundle);
  const comparisons = buildComparisons(current, v2Snapshot, bundle);
  const parityStatus = summarizeParity(comparisons, bundle.degraded);
  const warnings = uniqueStrings([
    ...bundle.warnings,
    ...(bundle.degraded ? ["v2 bundle is degraded."] : []),
    ...comparisons
      .filter((c) => c.passed === false)
      .map((c) => `Parity miss on ${c.field}: ${c.explanation}`),
  ]);

  return {
    kind: "hermes-shadow-comparison-v1",
    authority: "current-pipeline",
    symbol: String(current.symbol),
    timeframe: current.timeframe,
    timestamp,
    currentSnapshot: current,
    v2Snapshot,
    comparisons,
    parityStatus,
    warnings,
    missingInputs: args.missingInputs ?? [],
    degraded: bundle.degraded,
    provenance: bundle.provenance,
    durationMs: args.durationMs ?? 0,
  };
}

export function extractV2Snapshot(bundle: HermesIntelligenceBundle): HermesShadowV2Snapshot {
  const managementPath =
    bundle.judgment.stance === "Manage Existing Position" ||
    Boolean(
      bundle.conviction.reducingDrivers.some((d) => /open position|management/i.test(d)),
    );

  return {
    confidence: bundle.reasoning.confidence,
    readiness: bundle.reasoning.readiness,
    tradeQualityScore: bundle.decision.tradeQualityScore,
    hermesScore: bundle.decision.hermesScore,
    opinionSummary: bundle.opinion?.summary ?? bundle.opinion?.opinion,
    opinionStance: bundle.opinion?.stance ?? bundle.judgment.stance,
    judgmentStance: bundle.judgment.stance,
    convictionLevel: bundle.conviction.level,
    convictionSizingBias: bundle.conviction.sizingBias,
    coachHeadline: bundle.coach.headline,
    coachExplanation: bundle.coach.explanation,
    dataQuality: bundle.dataQuality,
    degraded: bundle.degraded,
    managementPath,
    bundleVersion: bundle.version,
  };
}

function buildComparisons(
  current: HermesShadowCurrentSnapshot,
  v2: HermesShadowV2Snapshot,
  bundle: HermesIntelligenceBundle,
): ShadowFieldComparison[] {
  const rows: ShadowFieldComparison[] = [];

  // Exact numerical parity — Confidence
  rows.push(
    exactNumberComparison({
      field: "confidence",
      currentValue: current.confidence,
      v2Value: v2.confidence ?? null,
      tolerance: 0,
      explanationMatch: "Current Reasoning Confidence matches v2 mirrored Confidence.",
      explanationMismatch: "Confidence mismatch — v2 must mirror supplied Reasoning, not recompute.",
    }),
  );

  // Also compare breakdown finalScore when present
  if (bundle.confidenceBreakdown) {
    rows.push(
      exactNumberComparison({
        field: "confidenceBreakdown.finalScore",
        currentValue: current.confidence,
        v2Value: bundle.confidenceBreakdown.finalScore,
        tolerance: 0,
        explanationMatch: "Confidence Breakdown finalScore equals current Confidence.",
        explanationMismatch: "Breakdown finalScore diverged from current Confidence.",
      }),
    );
  }

  // Exact numerical parity — Readiness
  rows.push(
    exactNumberComparison({
      field: "readiness",
      currentValue: current.readiness,
      v2Value: v2.readiness ?? null,
      tolerance: 0,
      explanationMatch: "Current Trade Readiness matches v2 mirrored Readiness.",
      explanationMismatch: "Readiness mismatch — v2 must mirror supplied Reasoning.",
    }),
  );

  // Exact — Trade Quality reference
  if (current.tradeQualityScore !== undefined || v2.tradeQualityScore !== undefined) {
    rows.push(
      exactNumberComparison({
        field: "tradeQualityScore",
        currentValue: current.tradeQualityScore ?? null,
        v2Value: v2.tradeQualityScore ?? null,
        tolerance: 0,
        explanationMatch: "Trade Quality reference matches supplied TQ score.",
        explanationMismatch: "Trade Quality reference mismatch (should be package-only).",
      }),
    );
  } else {
    rows.push({
      field: "tradeQualityScore",
      currentValue: null,
      v2Value: null,
      comparableStatus: "Not Comparable",
      difference: null,
      tolerance: null,
      passed: null,
      explanation: "Trade Quality not supplied on either side for this run.",
    });
  }

  // Exact — Hermes Score reference
  if (current.hermesScore !== undefined || v2.hermesScore !== undefined) {
    rows.push(
      exactNumberComparison({
        field: "hermesScore",
        currentValue: current.hermesScore ?? null,
        v2Value: v2.hermesScore ?? null,
        tolerance: 0,
        explanationMatch: "Hermes Score reference matches supplied score.",
        explanationMismatch: "Hermes Score reference mismatch (should be package-only).",
      }),
    );
  } else {
    rows.push({
      field: "hermesScore",
      currentValue: null,
      v2Value: null,
      comparableStatus: "Not Comparable",
      difference: null,
      tolerance: null,
      passed: null,
      explanation: "Hermes Score not supplied on either side for this run.",
    });
  }

  // Partial — thesis / market context vs opinion
  rows.push(
    semanticComparison({
      field: "thesisVsOpinion",
      currentValue: current.thesis ?? current.marketContext ?? null,
      v2Value: v2.opinionSummary ?? null,
      comparableStatus: "Partially Comparable",
      explanation:
        "Thesis wording vs v2 Opinion summary — semantic overlap only; different phrasing is allowed.",
    }),
  );

  // Partial — coach wording
  rows.push(
    semanticComparison({
      field: "coachConclusion",
      currentValue: current.coachMessage ?? null,
      v2Value: v2.coachExplanation ?? v2.coachHeadline ?? null,
      comparableStatus: "Partially Comparable",
      explanation:
        "Current coach message vs v2 coach-ready output — meaning overlap only; not product copy.",
    }),
  );

  // Partial — data quality / data state
  rows.push(compareDataQuality(current.dataState, v2.dataQuality));

  // Partial — open position / management path
  rows.push(compareOpenPositionPath(current.hasOpenPosition, v2));

  // Not comparable — Judgment / Conviction are internal v2 concepts
  rows.push({
    field: "judgmentStance",
    currentValue: null,
    v2Value: v2.judgmentStance ?? null,
    comparableStatus: "Not Comparable",
    difference: null,
    tolerance: null,
    passed: null,
    explanation:
      "Judgment is an internal v2 stage with no current primary UI metric equivalent.",
  });
  rows.push({
    field: "convictionLevel",
    currentValue: null,
    v2Value: v2.convictionLevel ?? null,
    comparableStatus: "Not Comparable",
    difference: null,
    tolerance: null,
    passed: null,
    explanation:
      "Conviction is an internal v2 stage and must not be treated as a fourth primary score.",
  });

  return rows;
}

function exactNumberComparison(args: {
  field: string;
  currentValue: number | null;
  v2Value: number | null;
  tolerance: number;
  explanationMatch: string;
  explanationMismatch: string;
}): ShadowFieldComparison {
  const { field, currentValue, v2Value, tolerance } = args;
  if (currentValue === null || v2Value === null) {
    return {
      field,
      currentValue,
      v2Value,
      comparableStatus: "Comparable",
      difference: null,
      tolerance,
      passed: false,
      explanation: "Missing numeric value on one side — exact parity cannot be confirmed.",
    };
  }
  const difference = Math.abs(currentValue - v2Value);
  const passed = difference <= tolerance;
  return {
    field,
    currentValue,
    v2Value,
    comparableStatus: "Comparable",
    difference,
    tolerance,
    passed,
    explanation: passed ? args.explanationMatch : args.explanationMismatch,
  };
}

function semanticComparison(args: {
  field: string;
  currentValue: string | null;
  v2Value: string | null;
  comparableStatus: "Partially Comparable";
  explanation: string;
}): ShadowFieldComparison {
  const { field, currentValue, v2Value } = args;
  if (!currentValue || !v2Value) {
    return {
      field,
      currentValue,
      v2Value,
      comparableStatus: args.comparableStatus,
      difference: null,
      tolerance: null,
      passed: null,
      explanation: `${args.explanation} Skipped — one side missing text.`,
    };
  }
  const similar = textsAreSemanticallySimilar(currentValue, v2Value);
  return {
    field,
    currentValue: truncate(currentValue, 160),
    v2Value: truncate(v2Value, 160),
    comparableStatus: args.comparableStatus,
    difference: similar ? "semantic-overlap" : "semantic-divergence",
    tolerance: null,
    passed: similar,
    explanation: similar
      ? `${args.explanation} Overlap detected.`
      : `${args.explanation} Limited overlap (not treated as hard failure for overall Pass if numerics match).`,
  };
}

function compareDataQuality(
  dataState: string | undefined,
  dataQuality: string | undefined,
): ShadowFieldComparison {
  if (!dataState && !dataQuality) {
    return {
      field: "dataQuality",
      currentValue: null,
      v2Value: null,
      comparableStatus: "Not Comparable",
      difference: null,
      tolerance: null,
      passed: null,
      explanation: "No data quality signals on either side.",
    };
  }

  const mapped = mapDataStateToQualityBand(dataState);
  const v2 = dataQuality ?? null;
  const aligned =
    mapped !== null && v2 !== null
      ? mapped === v2 || compatibleQuality(mapped, v2)
      : null;

  return {
    field: "dataQuality",
    currentValue: dataState ?? null,
    v2Value: v2,
    comparableStatus: "Partially Comparable",
    difference: aligned === null ? null : aligned ? "aligned" : "divergent",
    tolerance: null,
    passed: aligned,
    explanation:
      "Current Reasoning dataState vs v2 dataQuality — different enums; mapped for soft parity only.",
  };
}

function compareOpenPositionPath(
  hasOpenPosition: boolean,
  v2: HermesShadowV2Snapshot,
): ShadowFieldComparison {
  if (!hasOpenPosition) {
    return {
      field: "openPositionManagement",
      currentValue: false,
      v2Value: v2.managementPath ?? false,
      comparableStatus: "Partially Comparable",
      difference: null,
      tolerance: null,
      passed: v2.managementPath ? false : true,
      explanation: hasOpenPosition
        ? "Open position expected management path."
        : "No open position — v2 should not force Manage Existing Position.",
    };
  }

  const management =
    v2.judgmentStance === "Manage Existing Position" || Boolean(v2.managementPath);
  return {
    field: "openPositionManagement",
    currentValue: true,
    v2Value: management,
    comparableStatus: "Partially Comparable",
    difference: management ? "aligned" : "missing-management-path",
    tolerance: null,
    passed: management,
    explanation: management
      ? "Open position maps to v2 management-oriented Judgment/Conviction path."
      : "Open position present but v2 did not take Manage Existing Position path.",
  };
}

function summarizeParity(
  comparisons: ShadowFieldComparison[],
  degraded: boolean,
): ShadowParityStatus {
  const exact = comparisons.filter((c) => c.comparableStatus === "Comparable" && c.passed !== null);
  const exactFailed = exact.some((c) => c.passed === false);
  if (exactFailed) return "Fail";

  const partial = comparisons.filter(
    (c) => c.comparableStatus === "Partially Comparable" && c.passed === false,
  );
  if (partial.length > 0 || degraded) return "Partial";
  if (exact.length === 0) return "Partial";
  return "Pass";
}

function detectMissingInputs(input: HermesIntelligenceInput): string[] {
  const missing: string[] = [];
  if (!input.vision) missing.push("vision");
  if (!input.multiTimeframe) missing.push("multiTimeframe");
  if (!input.footprint) missing.push("footprint");
  if (!input.news) missing.push("news");
  if (!input.smartChart) missing.push("smartChart");
  if (!input.memory) missing.push("memory");
  if (!input.reasoning) missing.push("reasoning");
  if (!input.tradeQuality) missing.push("tradeQuality");
  if (!input.hermesScore) missing.push("hermesScore");
  if (!input.decision) missing.push("decision");
  if (!input.plan) missing.push("plan");
  if (input.candles.length === 0) missing.push("candles");
  return missing;
}

/** Token/stance semantic overlap — not a generative model. */
export function textsAreSemanticallySimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const stanceA = detectStanceTokens(na);
  const stanceB = detectStanceTokens(nb);
  if (stanceA.size > 0 && stanceB.size > 0) {
    for (const token of stanceA) {
      if (stanceB.has(token)) return true;
    }
    // Opposite stances → not similar
    if (opposes(stanceA, stanceB)) return false;
  }

  const tokensA = new Set(na.split(" ").filter((t) => t.length > 3));
  const tokensB = new Set(nb.split(" ").filter((t) => t.length > 3));
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap += 1;
  }
  const ratio = overlap / Math.min(tokensA.size, tokensB.size);
  return ratio >= 0.2 || overlap >= 3;
}

function detectStanceTokens(text: string): Set<string> {
  const set = new Set<string>();
  const rules: Array<[RegExp, string]> = [
    [/\bwait\b/, "wait"],
    [/\bavoid\b/, "avoid"],
    [/\btake with caution\b/, "caution"],
    [/\bcaution\b/, "caution"],
    [/\bmanage\b/, "manage"],
    [/\binsufficient\b/, "insufficient"],
    [/\bnot ready\b/, "wait"],
    [/\bpatient\b/, "wait"],
    [/\bconfirm/, "confirm"],
    [/\breadiness\b/, "readiness"],
    [/\bconfidence\b/, "confidence"],
    [/\btake\b/, "take"],
  ];
  for (const [re, token] of rules) {
    if (re.test(text)) set.add(token);
  }
  return set;
}

function opposes(a: Set<string>, b: Set<string>): boolean {
  const pairs: Array<[string, string]> = [
    ["take", "avoid"],
    ["take", "wait"],
    ["avoid", "take"],
  ];
  for (const [x, y] of pairs) {
    if (a.has(x) && b.has(y)) return true;
  }
  return false;
}

function mapDataStateToQualityBand(dataState?: string): string | null {
  if (!dataState) return null;
  if (dataState === "Ready") return "Good";
  if (dataState === "Stale") return "Limited";
  if (dataState === "Insufficient Data") return "Poor";
  return null;
}

function compatibleQuality(mapped: string, v2: string): boolean {
  if (mapped === v2) return true;
  if (mapped === "Good" && (v2 === "Good" || v2 === "Adequate")) return true;
  if (mapped === "Limited" && (v2 === "Limited" || v2 === "Adequate" || v2 === "Poor")) return true;
  if (mapped === "Poor" && (v2 === "Poor" || v2 === "Limited")) return true;
  return false;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

function nowMs(): number {
  return Date.now();
}

// --- In-memory store (dev/test only; not user-facing) ---

export function recordShadowComparison(result: HermesShadowComparison): void {
  recentComparisons = [result, ...recentComparisons].slice(0, MAX_RECENT_COMPARISONS);
}

export function getRecentShadowComparisons(): readonly HermesShadowComparison[] {
  return recentComparisons;
}

export function clearShadowComparisons(): void {
  recentComparisons = [];
}

export function getLatestShadowComparison(): HermesShadowComparison | null {
  return recentComparisons[0] ?? null;
}

/**
 * Developer-only console summary. Never surfaces in UI.
 * No-ops when console is unavailable.
 */
export function logShadowComparisonSummary(result: HermesShadowComparison): void {
  if (typeof console === "undefined" || typeof console.info !== "function") return;
  if (!isShadowModeEnabled()) return;

  const exact = result.comparisons.filter((c) => c.comparableStatus === "Comparable");
  const exactPass = exact.filter((c) => c.passed).length;
  // eslint-disable-next-line no-console
  console.info(
    `[Hermes Shadow] ${result.symbol} ${result.timeframe ?? ""} · ${result.parityStatus} · exact ${exactPass}/${exact.length} · ${result.durationMs}ms · authority=${result.authority}`,
    result.error ? { error: result.error } : undefined,
  );
}

/**
 * Build a stable memo key from shadow inputs so callers can skip redundant work.
 * Does not deep-clone large objects — uses identity-ish scalar fingerprints.
 */
export function buildShadowMemoKey(args: {
  symbol: string;
  timeframe?: string;
  confidence: number;
  readiness: number;
  tradeQualityScore?: number;
  hermesScore?: number;
  hasOpenPosition: boolean;
  reasoningTimestamp?: number;
  candleCount: number;
  lastCandleTime?: number;
}): string {
  return [
    args.symbol,
    args.timeframe ?? "",
    args.confidence,
    args.readiness,
    args.tradeQualityScore ?? "",
    args.hermesScore ?? "",
    args.hasOpenPosition ? 1 : 0,
    args.reasoningTimestamp ?? "",
    args.candleCount,
    args.lastCandleTime ?? "",
  ].join("|");
}

/** Test helper — force-disable side effects when asserting purity. */
export function withShadowStoreReset<T>(fn: () => T): T {
  clearShadowComparisons();
  try {
    return fn();
  } finally {
    clearShadowComparisons();
  }
}

export type { ShadowScalar, ShadowFieldComparison, ShadowParityStatus };
