/**
 * Market data service — sole application entry for quotes/candles.
 * Cache, dedupe, policy. Workspace read path uses this via workspace.ts (Step B).
 */

import type { MarketDataProvider } from "@/lib/market-data/provider";
import {
  createDefaultRegistry,
  type MarketDataProviderRegistry,
} from "@/lib/market-data/provider-registry";
import {
  candleCacheTtl,
  candlesCacheKey,
  defaultMarketDataCache,
  MarketDataCache,
  QUOTE_CACHE_TTL_MS,
  quoteCacheKey,
} from "@/lib/market-data/cache";
import {
  defaultRequestDedupe,
  isStaleGeneration,
  RequestDedupe,
} from "@/lib/market-data/request-dedupe";
import { isLiveMarketDataEnabled } from "@/lib/market-data/policy";
import type {
  MarketCandleSeries,
  MarketDataRange,
  MarketDataRequestOptions,
  MarketDataRuntimeEnv,
  MarketQuote,
  ProviderStatus,
  SymbolMetadata,
  Timeframe,
} from "@/lib/market-data/types";
import { normalizeQuote } from "@/lib/market-data/normalize-quote";

export type MarketDataServiceDeps = {
  registry?: MarketDataProviderRegistry;
  cache?: MarketDataCache;
  dedupe?: RequestDedupe;
  env?: MarketDataRuntimeEnv;
};

export class MarketDataService {
  private readonly registry: MarketDataProviderRegistry;
  private readonly cache: MarketDataCache;
  private readonly dedupe: RequestDedupe;
  private readonly env: MarketDataRuntimeEnv;
  private selectionGeneration = 0;

  constructor(deps: MarketDataServiceDeps = {}) {
    this.registry = deps.registry ?? createDefaultRegistry({ env: deps.env });
    this.cache = deps.cache ?? defaultMarketDataCache;
    this.dedupe = deps.dedupe ?? defaultRequestDedupe;
    this.env = deps.env ?? {};
  }

  /** Call when user switches symbol/timeframe (authoritative selection). */
  notifySelectionChanged(): number {
    this.selectionGeneration = this.dedupe.bumpGeneration();
    return this.selectionGeneration;
  }

  getSelectionGeneration(): number {
    return this.selectionGeneration;
  }

  async getQuote(
    symbol: string,
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote> {
    const generation = options?.generation ?? this.selectionGeneration;
    const key = quoteCacheKey(symbol);
    const now = options?.now ?? Date.now();

    if (!options?.bypassCache) {
      const cached = this.cache.get<MarketQuote>(key, now);
      if (cached) return cached;
    }

    return this.dedupe.run(
      key,
      async (signal) => {
        const provider = this.registry.resolveProvider(symbol);
        try {
          const quote = await provider.getQuote(symbol, {
            ...options,
            signal: options?.signal ?? signal,
            now,
          });

          if (isStaleGeneration(options?.generation, this.selectionGeneration)) {
            // Selection moved on; still return but caller should drop if needed
          }

          if (quote.dataQuality !== "Unavailable" && Number.isFinite(quote.price)) {
            this.cache.set(key, quote, QUOTE_CACHE_TTL_MS, now);
          }
          return quote;
        } catch {
          return this.failQuote(symbol, provider, now);
        }
      },
      { generation, abortPrevious: true },
    );
  }

  async getQuotes(
    symbols: string[],
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s, options)));
  }

  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    range?: MarketDataRange,
    options?: MarketDataRequestOptions,
  ): Promise<MarketCandleSeries> {
    const generation = options?.generation ?? this.selectionGeneration;
    const rangeKey = range
      ? `${range.from ?? ""}-${range.to ?? ""}-${range.limit ?? ""}`
      : "default";
    const key = candlesCacheKey(symbol, timeframe, rangeKey);
    const now = options?.now ?? Date.now();

    if (!options?.bypassCache) {
      const cached = this.cache.get<MarketCandleSeries>(key, now);
      if (cached) return cached;
    }

    return this.dedupe.run(
      key,
      async (signal) => {
        const provider = this.registry.resolveProvider(symbol);
        try {
          const series = await provider.getCandles(symbol, timeframe, range, {
            ...options,
            signal: options?.signal ?? signal,
            now,
          });

          if (
            series.dataQuality !== "Unavailable" &&
            series.candles.length > 0
          ) {
            this.cache.set(key, series, candleCacheTtl(timeframe), now);
          } else if (
            series.dataQuality === "Unavailable" &&
            isLiveMarketDataEnabled(this.env)
          ) {
            // Last-good stale cache if present
            const entry = this.cache.getEntry<MarketCandleSeries>(key);
            if (entry?.value?.candles?.length) {
              return {
                ...entry.value,
                dataQuality: "Stale",
                receivedTimestamp: now,
                limitations: [
                  ...(entry.value.limitations ?? []),
                  "Serving cached last-good series after provider failure.",
                ],
                error: series.error,
              };
            }
            // Never silent fixture fallback on live failure.
            return series;
          }

          return series;
        } catch {
          return this.failCandles(symbol, timeframe, provider, now);
        }
      },
      { generation, abortPrevious: true },
    );
  }

  async getSymbolMetadata(
    symbol: string,
    options?: MarketDataRequestOptions,
  ): Promise<SymbolMetadata> {
    return this.registry.resolveProvider(symbol).getSymbolMetadata(symbol, options);
  }

  async getProviderStatus(symbol = "BTC"): Promise<ProviderStatus> {
    return this.registry.resolveProvider(symbol).getProviderStatus();
  }

  clearCaches(): void {
    this.cache.clear();
  }

  /** Test helper */
  getCache(): MarketDataCache {
    return this.cache;
  }

  getDedupe(): RequestDedupe {
    return this.dedupe;
  }

  private failQuote(
    symbol: string,
    provider: MarketDataProvider,
    now: number,
  ): MarketQuote {
    const key = quoteCacheKey(symbol);
    const entry = this.cache.getEntry<MarketQuote>(key);
    if (entry?.value && Number.isFinite(entry.value.price)) {
      return {
        ...entry.value,
        dataQuality: "Stale",
        receivedTimestamp: now,
        limitations: [
          ...(entry.value.limitations ?? []),
          "Cached last-good quote after provider failure.",
        ],
      };
    }
    // Never silent fixture fallback — especially production live failures.
    return normalizeQuote({
      symbol: symbol.toUpperCase(),
      price: NaN,
      provider: provider.id,
      sourceTimestamp: now,
      receivedTimestamp: now,
      forcedQuality: "Unavailable",
      error: {
        code: "UNAVAILABLE",
        message: "Provider failed and no valid cache exists.",
        retryable: true,
        provider: provider.id,
      },
    });
  }

  private async failCandles(
    symbol: string,
    timeframe: Timeframe,
    provider: MarketDataProvider,
    now: number,
  ): Promise<MarketCandleSeries> {
    const key = candlesCacheKey(symbol, timeframe);
    const entry = this.cache.getEntry<MarketCandleSeries>(key);
    if (entry?.value?.candles?.length) {
      return {
        ...entry.value,
        dataQuality: "Stale",
        receivedTimestamp: now,
        error: {
          code: "UNAVAILABLE",
          message: "Provider failed; returning stale cache.",
          retryable: true,
          provider: provider.id,
        },
      };
    }
    return {
      symbol: symbol.toUpperCase(),
      timeframe,
      candles: [],
      provider: provider.id,
      dataQuality: "Unavailable",
      sourceTimestamp: null,
      receivedTimestamp: now,
      error: {
        code: "UNAVAILABLE",
        message: "Provider failed and no valid cache exists.",
        retryable: true,
        provider: provider.id,
      },
    };
  }
}

export function createMarketDataService(
  deps?: MarketDataServiceDeps,
): MarketDataService {
  return new MarketDataService(deps);
}

/** Lazy singleton for workspace / app read paths. */
let _marketDataService: MarketDataService | null = null;
export function getMarketDataService(): MarketDataService {
  if (!_marketDataService) _marketDataService = createMarketDataService();
  return _marketDataService;
}
/** @deprecated Prefer getMarketDataService() to avoid eager circular init. */
export const marketDataService = {
  get instance() {
    return getMarketDataService();
  },
};
