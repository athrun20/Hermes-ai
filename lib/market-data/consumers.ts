/**
 * Market Data Consistency Layer (Step E).
 *
 * Shared loaders so Hermes surfaces consume the same MarketDataService authority
 * and quality awareness. Does not change score formulas or learning behavior.
 */

import {
  buildWorkspaceDataQuality,
  type WorkspaceDataQuality,
} from "@/lib/market-data/data-quality-awareness";
import type {
  AssetQuote,
  Candle,
  CoinSymbol,
  Timeframe,
} from "@/lib/market-data/legacy";
import type {
  DataQuality,
  MarketDataRequestOptions,
  MarketDataRuntimeEnv,
} from "@/lib/market-data/types";
import {
  createMarketDataService,
  getMarketDataService,
  type MarketDataService,
} from "@/lib/market-data/service";
import {
  loadWorkspaceMarketSeries,
  loadWorkspaceQuotes,
} from "@/lib/market-data/workspace";
import { marketUniverse, type WorkspaceTimeframe } from "@/lib/market-universe";

/** Aligns with multi-timeframe engine rows (lib/timeframe-context-builder). */
export const HERMES_MULTI_TIMEFRAMES: WorkspaceTimeframe[] = [
  "5m",
  "15m",
  "1H",
  "4H",
  "1D",
];

export type HermesMarketQuotesSnapshot = {
  quotes: AssetQuote[];
  priceMap: Partial<Record<CoinSymbol, number>>;
  qualities: Partial<Record<string, DataQuality>>;
  bySymbol: Record<
    string,
    {
      quote: AssetQuote;
      quality: DataQuality;
    }
  >;
  liveMarketDataEnabled: boolean;
  loadedAt: number;
  source: "market-data-service";
};

export type HermesTimeframeCandleEntry = {
  timeframe: WorkspaceTimeframe;
  candles: Candle[];
  dataQuality: WorkspaceDataQuality;
};

export type HermesTimeframeCandleMap = Partial<
  Record<WorkspaceTimeframe, HermesTimeframeCandleEntry>
>;

/** Per-ticker join of Hermes market-data service vs satellite surfaces. */
export type HermesTickerMarketRef = {
  symbol: string;
  price: number | null;
  change24h: number | null;
  quality: DataQuality | null;
  sourceLabel: string | null;
  inHermesUniverse: boolean;
  priceSource: "market-data-service" | "none";
};

export type HermesMarketConsistencyReport = {
  source: "market-data-service";
  liveMarketDataEnabled: boolean;
  loadedAt: number;
  byTicker: Record<string, HermesTickerMarketRef>;
  /** Tickers present in the Hermes universe catalog. */
  hermesUniverseTickers: string[];
};

export type LoadHermesMarketQuotesArgs = {
  symbols?: string[];
  service?: MarketDataService;
  options?: MarketDataRequestOptions;
  env?: MarketDataRuntimeEnv;
};

export type LoadHermesTimeframeCandlesArgs = {
  symbol: string;
  timeframes?: WorkspaceTimeframe[];
  service?: MarketDataService;
  options?: MarketDataRequestOptions;
  env?: MarketDataRuntimeEnv;
};

/**
 * Canonical quote catalog for all Hermes surfaces (fixture default).
 */
export async function loadHermesMarketQuotesSnapshot(
  args: LoadHermesMarketQuotesArgs = {},
): Promise<HermesMarketQuotesSnapshot> {
  const symbols =
    args.symbols ?? marketUniverse.map((asset) => asset.symbol);
  const result = await loadWorkspaceQuotes({
    symbols,
    service: args.service,
    options: args.options,
    env: args.env,
  });

  const bySymbol: HermesMarketQuotesSnapshot["bySymbol"] = {};
  const priceMap: Partial<Record<CoinSymbol, number>> = {};

  for (const quote of result.quotes) {
    const symbol = String(quote.symbol).toUpperCase();
    const quality = result.qualities[symbol] ?? "Fixture";
    bySymbol[symbol] = { quote, quality };
    if (Number.isFinite(quote.price) && quote.price > 0) {
      priceMap[symbol as CoinSymbol] = quote.price;
    }
  }

  return {
    quotes: result.quotes,
    priceMap,
    qualities: result.qualities,
    bySymbol,
    liveMarketDataEnabled: result.liveMarketDataEnabled,
    loadedAt: args.options?.now ?? Date.now(),
    source: "market-data-service",
  };
}

/**
 * Multi-timeframe candle bundle via MarketDataService (same authority as workspace).
 */
export async function loadHermesTimeframeCandleMap(
  args: LoadHermesTimeframeCandlesArgs,
): Promise<HermesTimeframeCandleMap> {
  const service = args.service ?? getMarketDataService();
  const timeframes = args.timeframes ?? HERMES_MULTI_TIMEFRAMES;
  const symbol = String(args.symbol).toUpperCase();
  const map: HermesTimeframeCandleMap = {};

  await Promise.all(
    timeframes.map(async (timeframe) => {
      const series = await loadWorkspaceMarketSeries({
        symbol,
        timeframe: timeframe as Timeframe,
        service,
        options: args.options,
        env: args.env,
      });
      map[timeframe] = {
        timeframe,
        candles: series.candles,
        dataQuality: series.dataQuality,
      };
    }),
  );

  return map;
}

/** Extract legacy candle map for multi-timeframe engine. */
export function timeframeCandlesFromMap(
  map: HermesTimeframeCandleMap,
): Partial<Record<WorkspaceTimeframe, Candle[]>> {
  const out: Partial<Record<WorkspaceTimeframe, Candle[]>> = {};
  for (const [tf, entry] of Object.entries(map) as Array<
    [WorkspaceTimeframe, HermesTimeframeCandleEntry]
  >) {
    if (entry) out[tf] = entry.candles;
  }
  return out;
}

export function buildPriceMapFromQuotes(
  quotes: AssetQuote[],
): Partial<Record<CoinSymbol, number>> {
  return quotes.reduce<Partial<Record<CoinSymbol, number>>>((prices, quote) => {
    if (Number.isFinite(quote.price) && quote.price > 0) {
      prices[quote.symbol] = quote.price;
    }
    return prices;
  }, {});
}

export function resolveQuoteFromSnapshot(
  snapshot: HermesMarketQuotesSnapshot | null | undefined,
  symbol: string,
): AssetQuote | undefined {
  if (!snapshot) return undefined;
  return snapshot.bySymbol[String(symbol).toUpperCase()]?.quote;
}

/**
 * Join satellite tickers (scanner/briefing) to the shared market-data snapshot.
 * Does not invent prices for symbols outside the Hermes universe.
 */
export function buildMarketConsistencyReport(
  tickers: string[],
  snapshot: HermesMarketQuotesSnapshot | null | undefined,
): HermesMarketConsistencyReport {
  const hermesUniverseTickers = marketUniverse.map((a) => a.symbol);
  const byTicker: Record<string, HermesTickerMarketRef> = {};

  for (const raw of tickers) {
    const symbol = String(raw).toUpperCase();
    const row = snapshot?.bySymbol[symbol];
    const inHermesUniverse = hermesUniverseTickers.includes(symbol);
    if (row) {
      byTicker[symbol] = {
        symbol,
        price: Number.isFinite(row.quote.price) ? row.quote.price : null,
        change24h: Number.isFinite(row.quote.change24h) ? row.quote.change24h : null,
        quality: row.quality,
        sourceLabel:
          row.quality === "Fixture"
            ? "Fixture"
            : row.quality === "Delayed" || row.quality === "Live"
              ? "CoinGecko"
              : row.quality,
        inHermesUniverse,
        priceSource: "market-data-service",
      };
    } else {
      byTicker[symbol] = {
        symbol,
        price: null,
        change24h: null,
        quality: null,
        sourceLabel: null,
        inHermesUniverse,
        priceSource: "none",
      };
    }
  }

  return {
    source: "market-data-service",
    liveMarketDataEnabled: snapshot?.liveMarketDataEnabled ?? false,
    loadedAt: snapshot?.loadedAt ?? 0,
    byTicker,
    hermesUniverseTickers,
  };
}

/**
 * Assert two surfaces resolve the same mark for a symbol when both use the snapshot.
 */
export function marksAreConsistent(
  snapshot: HermesMarketQuotesSnapshot,
  symbol: string,
  price: number,
  epsilon = 1e-9,
): boolean {
  const mark = snapshot.priceMap[String(symbol).toUpperCase() as CoinSymbol];
  if (mark == null || !Number.isFinite(price)) return false;
  return Math.abs(mark - price) <= epsilon;
}

/** DI helper for tests. */
export function createHermesMarketDataService(
  ...args: Parameters<typeof createMarketDataService>
): MarketDataService {
  return createMarketDataService(...args);
}

/** Quality snapshot helper for a single mark without full series load. */
export function qualityFromSnapshot(
  snapshot: HermesMarketQuotesSnapshot | null | undefined,
  symbol: string,
  timeframe: Timeframe = "1H",
): WorkspaceDataQuality | null {
  const row = snapshot?.bySymbol[String(symbol).toUpperCase()];
  if (!row) return null;
  return buildWorkspaceDataQuality({
    symbol: row.quote.symbol,
    timeframe,
    quoteQuality: row.quality,
    candleQuality: row.quality,
    provider: row.quality === "Fixture" ? "fixture" : "coingecko",
    liveMarketDataEnabled: snapshot?.liveMarketDataEnabled,
  });
}
