/**
 * Intelligence v3 Shadow Mode (Phase 1).
 *
 * Runs buildIntelligenceV3 silently beside the product pipeline.
 * Current dashboard pipeline remains the sole product authority.
 *
 * - Never affects UI, scores, coach messages, or paper trading
 * - Never throws into the dashboard (errors are recorded)
 * - Reuses already-computed outputs (does not re-run engines)
 * - Stores slim debug records in memory only (no trades/positions/user PII)
 */

import { buildIntelligenceV3 } from "@/lib/intelligence-v3/build-intelligence-v3";
import type {
  IntelligenceV3Input,
  IntelligenceV3Package,
  IntelligenceV3Severity,
} from "@/lib/intelligence-v3/types";
import type { WorkspaceDataQuality } from "@/lib/market-data";

/** Ring buffer capacity for recent v3 shadow records (dev/test memory only). */
export const V3_SHADOW_RING_BUFFER_CAPACITY = 25;

export const V3_SHADOW_ENV_FLAG = "HERMES_INTELLIGENCE_V3_SHADOW";
export const V3_SHADOW_PUBLIC_ENV_FLAG = "NEXT_PUBLIC_HERMES_INTELLIGENCE_V3_SHADOW";

/** Slim capture for validation/debug — not a product surface. */
export type IntelligenceV3ShadowRecord = {
  kind: "hermes-intelligence-v3-shadow-v1";
  /** Explicit: shadow never becomes product authority. */
  authority: "current-pipeline";
  symbol: string;
  timeframe: string;
  timestamp: number;
  durationMs: number;
  ok: boolean;
  error?: string;
  /** Mirrored product scores for parity checks only. */
  mirrored?: IntelligenceV3Package["mirrored"];
  deterministicKey?: string;
  severity?: IntelligenceV3Severity;
  headlineCaveat?: string;
  flags?: IntelligenceV3Package["flags"];
  caveatIds?: string[];
  warnings: string[];
  missingInputs: string[];
  degraded: boolean;
};

export type RunIntelligenceV3ShadowInput = {
  symbol: string;
  timeframe: string;
  confidence: { score: number; thesisSummary?: string };
  tradeReadiness: {
    score: number;
    state?: string;
    blockers?: string[];
  };
  tradeQuality?: {
    score: number;
    grade?: string;
    notes?: string[];
  };
  dataQuality?: WorkspaceDataQuality | null;
  multiTimeframe?: IntelligenceV3Input["multiTimeframe"];
  intelligenceV2Shadow?: IntelligenceV3Input["intelligenceV2Shadow"];
  analysisContext?: IntelligenceV3Input["analysisContext"];
  /** Optional fixed timestamp for deterministic tests */
  timestamp?: number;
  /** When true, skip recording into the in-memory ring buffer */
  skipRecord?: boolean;
  /** When true, skip developer console summary */
  silent?: boolean;
};

let recentRecords: IntelligenceV3ShadowRecord[] = [];

/**
 * Shadow Mode is enabled in development and test by default.
 * Production requires explicit env flag.
 */
export function isIntelligenceV3ShadowEnabled(
  env: {
    NODE_ENV?: string;
    HERMES_INTELLIGENCE_V3_SHADOW?: string;
    NEXT_PUBLIC_HERMES_INTELLIGENCE_V3_SHADOW?: string;
  } = {
    NODE_ENV: typeof process !== "undefined" ? process.env?.NODE_ENV : undefined,
    HERMES_INTELLIGENCE_V3_SHADOW:
      typeof process !== "undefined"
        ? process.env?.[V3_SHADOW_ENV_FLAG]
        : undefined,
    NEXT_PUBLIC_HERMES_INTELLIGENCE_V3_SHADOW:
      typeof process !== "undefined"
        ? process.env?.[V3_SHADOW_PUBLIC_ENV_FLAG]
        : undefined,
  },
): boolean {
  const flag =
    env.HERMES_INTELLIGENCE_V3_SHADOW ??
    env.NEXT_PUBLIC_HERMES_INTELLIGENCE_V3_SHADOW;
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

/**
 * Safe entry point for Intelligence v3 Shadow Mode.
 * Isolates all v3 failures from the current pipeline.
 */
export function runIntelligenceV3Shadow(
  input: RunIntelligenceV3ShadowInput,
): IntelligenceV3ShadowRecord {
  const started = nowMs();
  const timestamp = input.timestamp ?? started;
  const missingInputs = detectMissingInputs(input);

  try {
    const v3Input = toV3Input(input);
    const pkg = buildIntelligenceV3(v3Input);
    const record = packageToShadowRecord({
      pkg,
      symbol: String(input.symbol),
      timeframe: String(input.timeframe),
      timestamp,
      durationMs: Math.max(0, nowMs() - started),
      missingInputs,
      ok: true,
    });
    if (!input.skipRecord) recordV3Shadow(record);
    if (!input.silent) logV3ShadowSummary(record);
    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed: IntelligenceV3ShadowRecord = {
      kind: "hermes-intelligence-v3-shadow-v1",
      authority: "current-pipeline",
      symbol: String(input.symbol),
      timeframe: String(input.timeframe),
      timestamp,
      durationMs: Math.max(0, nowMs() - started),
      ok: false,
      error: message,
      warnings: [
        "Intelligence v3 shadow run failed; current pipeline remains authoritative.",
        message,
      ],
      missingInputs,
      degraded: true,
    };
    if (!input.skipRecord) recordV3Shadow(failed);
    if (!input.silent) logV3ShadowSummary(failed);
    return failed;
  }
}

/** Build pure v3 input from already-computed product outputs. */
export function toV3Input(input: RunIntelligenceV3ShadowInput): IntelligenceV3Input {
  return {
    symbol: String(input.symbol),
    timeframe: String(input.timeframe),
    confidence: {
      score: input.confidence.score,
      thesisSummary: input.confidence.thesisSummary,
    },
    tradeReadiness: {
      score: input.tradeReadiness.score,
      state: input.tradeReadiness.state,
      blockers: input.tradeReadiness.blockers
        ? [...input.tradeReadiness.blockers]
        : undefined,
    },
    tradeQuality: input.tradeQuality
      ? {
          score: input.tradeQuality.score,
          grade: input.tradeQuality.grade,
          notes: input.tradeQuality.notes
            ? [...input.tradeQuality.notes]
            : undefined,
        }
      : undefined,
    dataQuality: input.dataQuality ?? undefined,
    multiTimeframe: input.multiTimeframe,
    intelligenceV2Shadow: input.intelligenceV2Shadow,
    analysisContext: input.analysisContext ?? {
      surface: "workspace",
      mode: "practice",
    },
  };
}

export function packageToShadowRecord(args: {
  pkg: IntelligenceV3Package;
  symbol: string;
  timeframe: string;
  timestamp: number;
  durationMs: number;
  missingInputs: string[];
  ok: boolean;
  error?: string;
}): IntelligenceV3ShadowRecord {
  const { pkg } = args;
  return {
    kind: "hermes-intelligence-v3-shadow-v1",
    authority: "current-pipeline",
    symbol: args.symbol,
    timeframe: args.timeframe,
    timestamp: args.timestamp,
    durationMs: args.durationMs,
    ok: args.ok,
    error: args.error,
    mirrored: { ...pkg.mirrored },
    deterministicKey: pkg.deterministicKey,
    severity: pkg.severity,
    headlineCaveat: pkg.headlineCaveat,
    flags: { ...pkg.flags },
    caveatIds: pkg.caveats.map((c) => c.id),
    warnings: [...pkg.warnings, ...args.missingInputs.map((m) => `missing:${m}`)],
    missingInputs: [...args.missingInputs],
    degraded: args.missingInputs.length > 0 || pkg.warnings.length > 0,
  };
}

export function getRecentIntelligenceV3Shadows(): readonly IntelligenceV3ShadowRecord[] {
  return recentRecords;
}

export function clearIntelligenceV3Shadows(): void {
  recentRecords = [];
}

export function recordV3Shadow(record: IntelligenceV3ShadowRecord): void {
  recentRecords = [record, ...recentRecords].slice(0, V3_SHADOW_RING_BUFFER_CAPACITY);
}

/**
 * Test helper: force builder failure without touching product engines.
 */
export function runIntelligenceV3ShadowWithBuilder(
  input: RunIntelligenceV3ShadowInput,
  builder: (v3: IntelligenceV3Input) => IntelligenceV3Package,
): IntelligenceV3ShadowRecord {
  const started = nowMs();
  const timestamp = input.timestamp ?? started;
  const missingInputs = detectMissingInputs(input);
  try {
    const pkg = builder(toV3Input(input));
    const record = packageToShadowRecord({
      pkg,
      symbol: String(input.symbol),
      timeframe: String(input.timeframe),
      timestamp,
      durationMs: Math.max(0, nowMs() - started),
      missingInputs,
      ok: true,
    });
    if (!input.skipRecord) recordV3Shadow(record);
    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed: IntelligenceV3ShadowRecord = {
      kind: "hermes-intelligence-v3-shadow-v1",
      authority: "current-pipeline",
      symbol: String(input.symbol),
      timeframe: String(input.timeframe),
      timestamp,
      durationMs: Math.max(0, nowMs() - started),
      ok: false,
      error: message,
      warnings: [
        "Intelligence v3 shadow run failed; current pipeline remains authoritative.",
        message,
      ],
      missingInputs,
      degraded: true,
    };
    if (!input.skipRecord) recordV3Shadow(failed);
    return failed;
  }
}

function detectMissingInputs(input: RunIntelligenceV3ShadowInput): string[] {
  const missing: string[] = [];
  if (input.dataQuality == null) missing.push("dataQuality");
  if (input.tradeQuality == null) missing.push("tradeQuality");
  if (input.multiTimeframe == null) missing.push("multiTimeframe");
  return missing;
}

function logV3ShadowSummary(record: IntelligenceV3ShadowRecord): void {
  if (typeof console === "undefined" || typeof console.debug !== "function") return;
  try {
    console.debug("[Hermes Intelligence v3 Shadow]", {
      authority: record.authority,
      ok: record.ok,
      symbol: record.symbol,
      severity: record.severity,
      deterministicKey: record.deterministicKey,
      caveatIds: record.caveatIds,
      mirrored: record.mirrored,
      degraded: record.degraded,
      error: record.error,
    });
  } catch {
    // Never throw from logging
  }
}

function nowMs(): number {
  return Date.now();
}
