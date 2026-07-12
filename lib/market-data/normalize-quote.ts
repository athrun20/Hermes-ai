/**
 * Quote normalization for provider-neutral MarketQuote.
 */

import type {
  DataQuality,
  MarketDataError,
  MarketDataProviderId,
  MarketQuote,
} from "@/lib/market-data/types";
import { classifyFreshness, computeDelayMs } from "@/lib/market-data/freshness";
import type { Timeframe } from "@/lib/market-data/types";

export type RawQuoteInput = {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  /** Alias used by legacy AssetQuote */
  change24h?: number;
  volume?: number | null;
  marketCap?: number | null;
  provider: MarketDataProviderId | string;
  sourceTimestamp: number;
  receivedTimestamp?: number;
  currency?: string;
  mayBeDelayed?: boolean;
  forcedQuality?: DataQuality;
  limitations?: string[];
  error?: MarketDataError;
  timeframeHint?: Timeframe;
};

export function normalizeQuote(raw: RawQuoteInput): MarketQuote {
  const receivedTimestamp = raw.receivedTimestamp ?? Date.now();
  const changePercent =
    raw.changePercent ?? raw.change24h ?? raw.change ?? 0;
  const change =
    raw.change ??
    (Number.isFinite(raw.price) && Number.isFinite(changePercent)
      ? (raw.price * changePercent) / 100
      : 0);

  const priceOk = Number.isFinite(raw.price) && raw.price > 0;
  const missingCritical = !priceOk;

  let dataQuality = classifyFreshness({
    sourceTimestamp: raw.sourceTimestamp,
    receivedTimestamp,
    mayBeDelayed: raw.mayBeDelayed,
    forcedQuality: raw.forcedQuality,
    missingCriticalFields: missingCritical,
    timeframe: raw.timeframeHint,
  });

  if (raw.forcedQuality === "Fixture") dataQuality = "Fixture";
  if (raw.error && dataQuality !== "Fixture") {
    dataQuality = raw.forcedQuality === "Stale" ? "Stale" : "Unavailable";
  }
  if (missingCritical && dataQuality !== "Fixture") {
    dataQuality = "Unavailable";
  }

  return {
    symbol: raw.symbol,
    price: priceOk ? raw.price : NaN,
    change: Number.isFinite(change) ? change : 0,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    volume: raw.volume == null || !Number.isFinite(raw.volume) ? null : raw.volume,
    marketCap:
      raw.marketCap == null || !Number.isFinite(raw.marketCap) ? null : raw.marketCap,
    provider: raw.provider,
    sourceTimestamp: raw.sourceTimestamp,
    receivedTimestamp,
    dataQuality,
    delayMs: computeDelayMs(raw.sourceTimestamp, receivedTimestamp),
    currency: raw.currency ?? "USD",
    error: raw.error,
    limitations: raw.limitations,
  };
}

export function isValidMarkPrice(quote: MarketQuote | null | undefined): boolean {
  if (!quote) return false;
  if (quote.dataQuality === "Unavailable") return false;
  return Number.isFinite(quote.price) && quote.price > 0;
}
