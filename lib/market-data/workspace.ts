/**
 * Workspace market-data integration (Steps B–C).
 *
 * Thin read-path helper: Dashboard → MarketDataService → compat adapters → engines.
 * Step C attaches data-quality awareness metadata (no score / paper authority changes).
 */

import {
  marketCandleSeriesToLegacyCandles,
  marketQuoteToAssetQuote,
} from "@/lib/market-data/adapters-compat";
import {
  buildWorkspaceDataQuality,
  type WorkspaceDataQuality,
} from "@/lib/market-data/data-quality-awareness";
import {
  createMarketDataService,
  getMarketDataService,
  type MarketDataService,
} from "@/lib/market-data/service";
import type {
  AssetQuote,
  Candle,
  CoinSymbol,
  Timeframe,
} from "@/lib/market-data/legacy";
import type {
  DataQuality,
  MarketDataError,
  MarketDataRequestOptions,
  MarketDataRuntimeEnv,
} from "@/lib/market-data/types";
import { isLiveMarketDataEnabled } from "@/lib/market-data/policy";
import { COINGECKO_UNSUPPORTED_INTRADAY } from "@/lib/market-data/timeframe-map";
import { getMarketAsset, marketUniverse } from "@/lib/market-universe";

export type WorkspaceMarketSeries = {
  symbol: string;
  timeframe: Timeframe;
  /** Legacy quote contract for existing engines. */
  quote: AssetQuote;
  /** Legacy candle contract for existing engines. */
  candles: Candle[];
  quoteQuality: DataQuality;
  candleQuality: DataQuality;
  provider: string;
  limitations: string[];
  error?: MarketDataError;
  generation?: number;
  liveMarketDataEnabled: boolean;
  /** Step C: quality awareness for UI and future mentor layers. */
  dataQuality: WorkspaceDataQuality;
};

export type WorkspaceQuotesResult = {
  quotes: AssetQuote[];
  qualities: Partial<Record<string, DataQuality>>;
  liveMarketDataEnabled: boolean;
};

export type LoadWorkspaceMarketSeriesArgs = {
  symbol: string;
  timeframe: Timeframe;
  service?: MarketDataService;
  options?: MarketDataRequestOptions;
  env?: MarketDataRuntimeEnv;
};

export type LoadWorkspaceQuotesArgs = {
  symbols?: string[];
  service?: MarketDataService;
  options?: MarketDataRequestOptions;
  env?: MarketDataRuntimeEnv;
};

/**
 * Load selected-symbol quote + candles through MarketDataService,
 * then adapt to legacy AssetQuote / Candle for engines.
 */
export async function loadWorkspaceMarketSeries(
  args: LoadWorkspaceMarketSeriesArgs,
): Promise<WorkspaceMarketSeries> {
  const service = args.service ?? getMarketDataService();
  const liveEnabled = isLiveMarketDataEnabled(args.env ?? {});
  const symbol = String(args.symbol).toUpperCase();
  const timeframe = args.timeframe;
  const generation =
    args.options?.generation ?? service.getSelectionGeneration();

  const [marketQuote, series] = await Promise.all([
    service.getQuote(symbol, { ...args.options, generation }),
    service.getCandles(symbol, timeframe, undefined, {
      ...args.options,
      generation,
    }),
  ]);

  const limitations = uniqueStrings([
    ...(marketQuote.limitations ?? []),
    ...(series.limitations ?? []),
    ...unsupportedLiveNotes(symbol, timeframe, liveEnabled, series.dataQuality),
  ]);

  const quote = ensureLegacyQuote(marketQuoteToAssetQuote(marketQuote), symbol);
  const candles = marketCandleSeriesToLegacyCandles(series);
  const provider = String(series.provider || marketQuote.provider || "unknown");
  const error = series.error ?? marketQuote.error;
  const dataQuality = buildWorkspaceDataQuality({
    symbol,
    timeframe,
    quoteQuality: marketQuote.dataQuality,
    candleQuality: series.dataQuality,
    provider,
    limitations,
    error,
    liveMarketDataEnabled: liveEnabled,
  });

  return {
    symbol,
    timeframe,
    quote,
    candles,
    quoteQuality: marketQuote.dataQuality,
    candleQuality: series.dataQuality,
    provider,
    limitations: dataQuality.limitations,
    error,
    generation,
    liveMarketDataEnabled: liveEnabled,
    dataQuality,
  };
}

/**
 * Load workspace quote list through MarketDataService (legacy AssetQuote[]).
 * Defaults to full marketUniverse symbol set.
 */
export async function loadWorkspaceQuotes(
  args: LoadWorkspaceQuotesArgs = {},
): Promise<WorkspaceQuotesResult> {
  const service = args.service ?? getMarketDataService();
  const liveEnabled = isLiveMarketDataEnabled(args.env ?? {});
  const symbols =
    args.symbols ?? marketUniverse.map((asset) => asset.symbol);

  const marketQuotes = await service.getQuotes(symbols, args.options);
  const qualities: Partial<Record<string, DataQuality>> = {};
  const quotes = marketQuotes.map((q) => {
    const symbol = String(q.symbol).toUpperCase();
    qualities[symbol] = q.dataQuality;
    return ensureLegacyQuote(marketQuoteToAssetQuote(q), symbol);
  });

  return {
    quotes,
    qualities,
    liveMarketDataEnabled: liveEnabled,
  };
}

/**
 * Notify the shared service that the user changed symbol/timeframe.
 * Returns the generation token callers should pass into loads.
 */
export function notifyWorkspaceSelectionChanged(
  service: MarketDataService = getMarketDataService(),
): number {
  return service.notifySelectionChanged();
}

/** Test / DI helper — same factory as the service package. */
export function createWorkspaceMarketDataService(
  ...args: Parameters<typeof createMarketDataService>
): MarketDataService {
  return createMarketDataService(...args);
}

/**
 * Whether live crypto OHLC is supported for this TF (Phase 1).
 * Stocks/ETFs never use live OHLC in Phase 1.
 */
export function isLiveCryptoTimeframeSupported(timeframe: Timeframe): boolean {
  return !COINGECKO_UNSUPPORTED_INTRADAY.includes(timeframe);
}

function ensureLegacyQuote(quote: AssetQuote, symbol: string): AssetQuote {
  if (quote.symbol && Number.isFinite(quote.price) && quote.price > 0) {
    return quote;
  }
  // Keep engines on a valid catalog shape if service returned Unavailable/zero.
  // Does not relabel quality — caller still sees quoteQuality from service.
  const fallback = getMarketAsset(symbol as CoinSymbol);
  return {
    ...fallback,
    price: Number.isFinite(quote.price) && quote.price > 0 ? quote.price : fallback.price,
    change24h: Number.isFinite(quote.change24h) ? quote.change24h : fallback.change24h,
    lastUpdated: quote.lastUpdated,
  };
}

function unsupportedLiveNotes(
  symbol: string,
  timeframe: Timeframe,
  liveEnabled: boolean,
  candleQuality: DataQuality,
): string[] {
  if (!liveEnabled) return [];
  const asset = marketUniverse.find((a) => a.symbol === symbol);
  const isCrypto = (asset?.assetType ?? "Crypto") === "Crypto";
  if (!isCrypto) return [];
  if (!COINGECKO_UNSUPPORTED_INTRADAY.includes(timeframe)) return [];
  if (candleQuality === "Fixture") {
    // Honesty guard: never allow silent fixture while live flag is on for unsupported TF.
    return [
      `Live crypto does not support ${timeframe} in Phase 1 — series is not live market data.`,
    ];
  }
  return [
    `Live crypto does not support ${timeframe} in Phase 1 (no fine intraday OHLC from public aggregator).`,
  ];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
