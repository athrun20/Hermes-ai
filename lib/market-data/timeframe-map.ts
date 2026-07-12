/**
 * Hermes timeframe ↔ provider interval mapping and safe aggregation.
 * Never aggregate coarse → fine. Never fabricate Live precision for 1m–30m crypto.
 */

import type { MarketCandle, Timeframe } from "@/lib/market-data/types";

export type TimeframeSupport =
  | { status: "supported"; intervalMs: number; notes?: string }
  | { status: "unsupported"; reason: string }
  | {
      status: "aggregate-from";
      sourceTimeframe: Timeframe;
      sourceIntervalMs: number;
      targetIntervalMs: number;
      notes?: string;
    };

/** Live CoinGecko Phase 1: only coarser TFs are eligible for live series. */
export const COINGECKO_LIVE_TIMEFRAMES: Timeframe[] = ["1H", "4H", "1D", "1W"];

/** Intraday fine TFs unsupported for live crypto in Phase 1. */
export const COINGECKO_UNSUPPORTED_INTRADAY: Timeframe[] = [
  "1m",
  "5m",
  "15m",
  "30m",
];

export function timeframeIntervalMs(tf: Timeframe): number {
  switch (tf) {
    case "1m":
      return 60_000;
    case "5m":
      return 5 * 60_000;
    case "15m":
      return 15 * 60_000;
    case "30m":
      return 30 * 60_000;
    case "1H":
      return 60 * 60_000;
    case "4H":
      return 4 * 60 * 60_000;
    case "1D":
      return 24 * 60 * 60_000;
    case "1W":
      return 7 * 24 * 60 * 60_000;
    default:
      return 60 * 60_000;
  }
}

/**
 * Map Hermes timeframe for CoinGecko live path.
 * 1m–30m → unsupported (do not fabricate).
 * 1W may be served by aggregating 1D when needed.
 */
export function mapCoinGeckoTimeframe(tf: Timeframe): TimeframeSupport {
  if (COINGECKO_UNSUPPORTED_INTRADAY.includes(tf)) {
    return {
      status: "unsupported",
      reason:
        "Phase 1 live crypto does not support 1m–30m. CoinGecko is not treated as exchange-grade fine OHLC.",
    };
  }
  if (tf === "1W") {
    return {
      status: "aggregate-from",
      sourceTimeframe: "1D",
      sourceIntervalMs: timeframeIntervalMs("1D"),
      targetIntervalMs: timeframeIntervalMs("1W"),
      notes: "1W may be built by aggregating complete daily bars only.",
    };
  }
  if (tf === "1H" || tf === "4H" || tf === "1D") {
    return {
      status: "supported",
      intervalMs: timeframeIntervalMs(tf),
      notes: "Public aggregator data — not exchange real-time.",
    };
  }
  return { status: "unsupported", reason: `Timeframe ${tf} is not mapped for CoinGecko.` };
}

export function mapFixtureTimeframe(tf: Timeframe): TimeframeSupport {
  return {
    status: "supported",
    intervalMs: timeframeIntervalMs(tf),
    notes: "Fixture candles only.",
  };
}

/**
 * Aggregate complete finer bars into a coarser timeframe.
 * Refuses if source interval is not strictly finer than target.
 */
export function aggregateCandlesToCoarser(
  candles: MarketCandle[],
  sourceIntervalMs: number,
  targetIntervalMs: number,
): MarketCandle[] {
  if (!(targetIntervalMs > sourceIntervalMs)) {
    throw new Error(
      "aggregateCandlesToCoarser: refuse coarse-to-fine or equal-interval fabrication.",
    );
  }
  if (candles.length === 0) return [];

  const buckets = new Map<number, MarketCandle[]>();
  for (const c of candles) {
    const bucket = Math.floor(c.timestamp / targetIntervalMs) * targetIntervalMs;
    const list = buckets.get(bucket) ?? [];
    list.push(c);
    buckets.set(bucket, list);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucket, list]) => {
      const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
      const open = sorted[0].open;
      const close = sorted[sorted.length - 1].close;
      const high = Math.max(...sorted.map((x) => x.high));
      const low = Math.min(...sorted.map((x) => x.low));
      const volumes = sorted.map((x) => x.volume);
      const volume =
        volumes.every((v) => v != null && Number.isFinite(v))
          ? volumes.reduce((s, v) => (s ?? 0) + (v as number), 0)
          : null;
      const provider = sorted[0].provider;
      // Aggregation inherits worst quality among members for honesty
      const dataQuality = sorted.some((x) => x.dataQuality === "Fixture")
        ? sorted[0].dataQuality
        : sorted.some((x) => x.dataQuality === "Partial" || x.volume == null)
          ? "Partial"
          : sorted[0].dataQuality;
      return {
        timestamp: bucket,
        open,
        high,
        low,
        close,
        volume,
        provider,
        dataQuality,
      };
    });
}

/** CoinGecko market_chart days parameter for supported TFs. */
export function coinGeckoDaysForTimeframe(tf: Timeframe): string {
  if (tf === "1W") return "90";
  if (tf === "1D") return "30";
  if (tf === "4H") return "14";
  if (tf === "1H") return "7";
  return "1";
}
