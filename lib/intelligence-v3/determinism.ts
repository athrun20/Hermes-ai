/**
 * Deterministic key for Intelligence v3 packages.
 */

import type { IntelligenceV3Input } from "@/lib/intelligence-v3/types";

/** Stable JSON stringify with sorted object keys. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortKeys(obj[key]);
  }
  return out;
}

/**
 * FNV-1a 32-bit hex — deterministic, dependency-free.
 */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildDeterministicKey(input: IntelligenceV3Input): string {
  // Only fields that affect interpretation — exclude non-deterministic noise.
  const payload = {
    symbol: input.symbol,
    timeframe: input.timeframe,
    confidence: input.confidence,
    tradeReadiness: input.tradeReadiness,
    tradeQuality: input.tradeQuality ?? null,
    dataQuality: input.dataQuality
      ? {
          quality: input.dataQuality.quality,
          statusLabel: input.dataQuality.statusLabel,
          isFixture: input.dataQuality.isFixture,
          isDelayed: input.dataQuality.isDelayed,
          isLive: input.dataQuality.isLive,
          isUnavailable: input.dataQuality.isUnavailable,
          timeframeUnsupported: input.dataQuality.timeframeUnsupported,
          provider: input.dataQuality.provider,
        }
      : null,
    multiTimeframe: input.multiTimeframe ?? null,
    intelligenceV2Shadow: input.intelligenceV2Shadow
      ? {
          degraded: input.intelligenceV2Shadow.degraded ?? false,
          warnings: input.intelligenceV2Shadow.warnings ?? [],
          regime: input.intelligenceV2Shadow.regime ?? null,
        }
      : null,
    analysisContext: input.analysisContext ?? null,
  };
  return `v3-${hashString(stableStringify(payload))}`;
}
