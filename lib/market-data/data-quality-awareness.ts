/**
 * Data Quality Awareness (Step C).
 *
 * Lightweight, read-only metadata so Hermes UI and future intelligence layers
 * can understand market-data limitations without changing scores or trading logic.
 */

import type { Timeframe } from "@/lib/market-data/legacy";
import type {
  DataQuality,
  MarketDataError,
  MarketDataErrorCode,
} from "@/lib/market-data/types";
import { COINGECKO_UNSUPPORTED_INTRADAY } from "@/lib/market-data/timeframe-map";
import { marketUniverse } from "@/lib/market-universe";

/** UI / coaching tone hint — presentation only, not a score. */
export type DataQualityToneHint = "mint" | "gold" | "danger" | "muted" | "neutral";

/**
 * Workspace-facing quality snapshot for the series under analysis.
 * Does not alter Confidence, Trade Readiness, Trade Quality, or paper authority.
 */
export type WorkspaceDataQuality = {
  symbol: string;
  timeframe: Timeframe;
  /** Dominant quality for the analysis series (candles preferred, then quote). */
  quality: DataQuality;
  /** Short status label for pills (e.g. "Fixture", "Delayed", "Unsupported"). */
  statusLabel: string;
  /** Human data-source label (e.g. "Fixture", "CoinGecko"). */
  sourceLabel: string;
  provider: string;
  quoteQuality: DataQuality;
  candleQuality: DataQuality;
  liveMarketDataEnabled: boolean;
  isFixture: boolean;
  isDelayed: boolean;
  isLive: boolean;
  isStale: boolean;
  isPartial: boolean;
  isUnavailable: boolean;
  /** Live crypto TF not supported in Phase 1 (1m–30m). */
  timeframeUnsupported: boolean;
  limitations: string[];
  /** One-line coaching summary for UI / future mentor copy. */
  summary: string;
  errorCode?: MarketDataErrorCode;
  errorMessage?: string;
  tone: DataQualityToneHint;
};

export type BuildWorkspaceDataQualityInput = {
  symbol: string;
  timeframe: Timeframe;
  quoteQuality: DataQuality;
  candleQuality: DataQuality;
  provider: string;
  limitations?: string[];
  error?: MarketDataError;
  liveMarketDataEnabled?: boolean;
};

/**
 * Build a stable awareness object from service / workspace series metadata.
 * Pure and deterministic for identical inputs.
 */
export function buildWorkspaceDataQuality(
  input: BuildWorkspaceDataQualityInput,
): WorkspaceDataQuality {
  const symbol = String(input.symbol).toUpperCase();
  const timeframe = input.timeframe;
  const quoteQuality = input.quoteQuality;
  const candleQuality = input.candleQuality;
  const provider = input.provider || "unknown";
  const liveMarketDataEnabled = Boolean(input.liveMarketDataEnabled);
  const errorCode = input.error?.code;
  const errorMessage = input.error?.message;

  const timeframeUnsupported = resolveTimeframeUnsupported({
    symbol,
    timeframe,
    liveMarketDataEnabled,
    candleQuality,
    errorCode,
  });

  const quality = resolveDominantQuality({
    candleQuality,
    quoteQuality,
    timeframeUnsupported,
    errorCode,
  });

  const limitations = uniqueStrings([
    ...(input.limitations ?? []),
    ...(timeframeUnsupported
      ? [
          `Live crypto does not support ${timeframe} in Phase 1 — not exchange-grade fine OHLC.`,
        ]
      : []),
  ]);

  const statusLabel = timeframeUnsupported
    ? "Unsupported"
    : qualityStatusLabel(quality);

  return {
    symbol,
    timeframe,
    quality,
    statusLabel,
    sourceLabel: providerDisplayName(provider),
    provider,
    quoteQuality,
    candleQuality,
    liveMarketDataEnabled,
    isFixture: quality === "Fixture",
    isDelayed: quality === "Delayed",
    isLive: quality === "Live",
    isStale: quality === "Stale",
    isPartial: quality === "Partial",
    isUnavailable: quality === "Unavailable" || timeframeUnsupported,
    timeframeUnsupported,
    limitations,
    summary: buildQualitySummary({
      quality,
      statusLabel,
      sourceLabel: providerDisplayName(provider),
      timeframeUnsupported,
      limitations,
    }),
    errorCode,
    errorMessage,
    tone: dataQualityTone(quality, timeframeUnsupported),
  };
}

/** Bootstrap awareness before the first async series load completes. */
export function createPendingWorkspaceDataQuality(
  symbol: string,
  timeframe: Timeframe,
): WorkspaceDataQuality {
  return buildWorkspaceDataQuality({
    symbol,
    timeframe,
    quoteQuality: "Fixture",
    candleQuality: "Fixture",
    provider: "fixture",
    limitations: ["Loading market data…"],
    liveMarketDataEnabled: false,
  });
}

export function providerDisplayName(provider: string): string {
  const id = provider.toLowerCase();
  if (id === "fixture") return "Fixture";
  if (id === "coingecko") return "CoinGecko";
  if (id === "unknown" || !id) return "Unknown";
  return provider;
}

export function qualityStatusLabel(quality: DataQuality): string {
  return quality;
}

export function dataQualityTone(
  quality: DataQuality,
  timeframeUnsupported = false,
): DataQualityToneHint {
  if (timeframeUnsupported) return "danger";
  switch (quality) {
    case "Live":
      return "mint";
    case "Delayed":
    case "Stale":
    case "Partial":
      return "gold";
    case "Unavailable":
      return "danger";
    case "Fixture":
      return "muted";
    default:
      return "neutral";
  }
}

function resolveDominantQuality(args: {
  candleQuality: DataQuality;
  quoteQuality: DataQuality;
  timeframeUnsupported: boolean;
  errorCode?: MarketDataErrorCode;
}): DataQuality {
  if (args.timeframeUnsupported || args.errorCode === "UNSUPPORTED") {
    return "Unavailable";
  }
  // Prefer candle series quality for chart-first analysis.
  if (args.candleQuality === "Unavailable") return "Unavailable";
  if (args.candleQuality === "Stale") return "Stale";
  if (args.candleQuality === "Partial") return "Partial";
  if (args.candleQuality === "Fixture") return "Fixture";
  if (args.candleQuality === "Delayed") return "Delayed";
  if (args.candleQuality === "Live") {
    // Downgrade if quote is weaker
    if (args.quoteQuality === "Unavailable") return "Unavailable";
    if (args.quoteQuality === "Stale") return "Stale";
    if (args.quoteQuality === "Delayed") return "Delayed";
    return "Live";
  }
  return args.candleQuality || args.quoteQuality || "Unavailable";
}

function resolveTimeframeUnsupported(args: {
  symbol: string;
  timeframe: Timeframe;
  liveMarketDataEnabled: boolean;
  candleQuality: DataQuality;
  errorCode?: MarketDataErrorCode;
}): boolean {
  if (args.errorCode === "UNSUPPORTED") return true;
  if (!args.liveMarketDataEnabled) return false;
  const asset = marketUniverse.find((a) => a.symbol === args.symbol);
  const isCrypto = (asset?.assetType ?? "Crypto") === "Crypto";
  if (!isCrypto) return false;
  if (!COINGECKO_UNSUPPORTED_INTRADAY.includes(args.timeframe)) return false;
  // Honest path: live requested + fine TF → unsupported even if empty series.
  return args.candleQuality === "Unavailable" || args.candleQuality === "Fixture";
}

function buildQualitySummary(args: {
  quality: DataQuality;
  statusLabel: string;
  sourceLabel: string;
  timeframeUnsupported: boolean;
  limitations: string[];
}): string {
  if (args.timeframeUnsupported) {
    return "Timeframe not supported for live crypto — analysis series is unavailable.";
  }
  switch (args.quality) {
    case "Fixture":
      return "Teaching fixtures — not a live market feed.";
    case "Delayed":
      return `${args.sourceLabel} delayed public data — not exchange real-time.`;
    case "Live":
      return `${args.sourceLabel} live-quality data (rare for public aggregators).`;
    case "Stale":
      return "Cached or aged market data — treat freshness with caution.";
    case "Partial":
      return "Partial market data — some fields missing.";
    case "Unavailable":
      return "Market data unavailable for this selection.";
    default:
      return args.limitations[0] ?? `Data quality: ${args.statusLabel}`;
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
