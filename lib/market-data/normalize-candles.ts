/**
 * Candle normalization, validation, sorting, and series quality.
 */

import type {
  DataQuality,
  MarketCandle,
  MarketCandleSeries,
  MarketDataError,
  MarketDataProviderId,
  Timeframe,
} from "@/lib/market-data/types";
import { classifyFreshness } from "@/lib/market-data/freshness";

export type RawCandleInput = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  provider: MarketDataProviderId | string;
  dataQuality?: DataQuality;
};

export type NormalizeCandlesResult =
  | { ok: true; series: MarketCandleSeries }
  | { ok: false; error: MarketDataError; series: MarketCandleSeries };

/**
 * Validate a single candle. Returns null if unusable.
 * Optionally repairs high/low if they are only slightly inverted (swap).
 */
export function validateCandle(
  raw: RawCandleInput,
  options?: { repair?: boolean },
): MarketCandle | null {
  const { timestamp, open, high, low, close, provider } = raw;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  if (![open, high, low, close].every((v) => Number.isFinite(v))) return null;

  let h = high;
  let l = low;
  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);

  if (h < bodyHigh || l > bodyLow || h < l) {
    if (!options?.repair) return null;
    // Deterministic repair: expand high/low to enclose body
    h = Math.max(h, bodyHigh, l);
    l = Math.min(l, bodyLow, h);
    if (h < l) return null;
  }

  const volume =
    raw.volume == null || !Number.isFinite(raw.volume) ? null : (raw.volume as number);

  return {
    timestamp,
    open,
    high: h,
    low: l,
    close,
    volume,
    provider,
    dataQuality: raw.dataQuality ?? "Partial",
  };
}

/**
 * Sort, merge duplicate timestamps, validate, and assign series quality.
 */
export function normalizeCandleSeries(args: {
  symbol: string;
  timeframe: Timeframe;
  candles: RawCandleInput[];
  provider: MarketDataProviderId | string;
  receivedTimestamp?: number;
  mayBeDelayed?: boolean;
  forcedQuality?: DataQuality;
  limitations?: string[];
  repair?: boolean;
}): NormalizeCandlesResult {
  const receivedTimestamp = args.receivedTimestamp ?? Date.now();
  const validated: MarketCandle[] = [];

  for (const raw of args.candles) {
    const candle = validateCandle(
      { ...raw, provider: args.provider, dataQuality: raw.dataQuality },
      { repair: args.repair ?? true },
    );
    if (candle) validated.push(candle);
  }

  // Sort ascending
  validated.sort((a, b) => a.timestamp - b.timestamp);

  // Deterministic duplicate merge: first open, last close, max high, min low, sum volume if all present
  const merged: MarketCandle[] = [];
  for (const candle of validated) {
    const prev = merged[merged.length - 1];
    if (prev && prev.timestamp === candle.timestamp) {
      const volume =
        prev.volume != null && candle.volume != null
          ? prev.volume + candle.volume
          : null;
      merged[merged.length - 1] = {
        timestamp: prev.timestamp,
        open: prev.open,
        high: Math.max(prev.high, candle.high),
        low: Math.min(prev.low, candle.low),
        close: candle.close,
        volume,
        provider: prev.provider,
        dataQuality: prev.dataQuality,
      };
    } else {
      merged.push(candle);
    }
  }

  if (merged.length === 0) {
    const error: MarketDataError = {
      code: "VALIDATION_FAILED",
      message: "No usable candles after validation.",
      retryable: false,
      provider: args.provider,
    };
    return {
      ok: false,
      error,
      series: emptySeries(args, receivedTimestamp, error),
    };
  }

  const anyMissingVolume = merged.some((c) => c.volume == null);
  const lastTs = merged[merged.length - 1].timestamp;

  let dataQuality: DataQuality =
    args.forcedQuality ??
    classifyFreshness({
      sourceTimestamp: lastTs,
      receivedTimestamp,
      timeframe: args.timeframe,
      mayBeDelayed: args.mayBeDelayed,
    });

  if (args.forcedQuality === "Fixture") dataQuality = "Fixture";
  // Missing volume prevents fully Live labeling
  if (anyMissingVolume && dataQuality === "Live") dataQuality = "Partial";
  if (anyMissingVolume && dataQuality === "Delayed" && !args.forcedQuality) {
    dataQuality = "Partial";
  }

  const series: MarketCandleSeries = {
    symbol: args.symbol,
    timeframe: args.timeframe,
    candles: merged.map((c) => ({ ...c, dataQuality })),
    provider: args.provider,
    dataQuality,
    sourceTimestamp: lastTs,
    receivedTimestamp,
    limitations: args.limitations,
  };

  return { ok: true, series };
}

function emptySeries(
  args: {
    symbol: string;
    timeframe: Timeframe;
    provider: MarketDataProviderId | string;
    limitations?: string[];
  },
  receivedTimestamp: number,
  error: MarketDataError,
): MarketCandleSeries {
  return {
    symbol: args.symbol,
    timeframe: args.timeframe,
    candles: [],
    provider: args.provider,
    dataQuality: "Unavailable",
    sourceTimestamp: null,
    receivedTimestamp,
    limitations: args.limitations,
    error,
  };
}
