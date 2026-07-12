/**
 * Hermes market-data package.
 *
 * Step A: provider-neutral foundation + legacy re-exports.
 * Dashboard remains fixture-driven until Steps B–E are approved.
 */

// ── New Live Market Data Foundation ───────────────────────────────────────
export type {
  AssetClass,
  CoinSymbol,
  DataQuality,
  MarketCandle,
  MarketCandleSeries,
  MarketDataError,
  MarketDataErrorCode,
  MarketDataProviderId,
  MarketDataRange,
  MarketDataRequestOptions,
  MarketDataRuntimeEnv,
  MarketQuote,
  ProviderCapabilities,
  ProviderStatus,
  SymbolMetadata,
  Timeframe,
} from "@/lib/market-data/types";

export type { MarketDataProvider } from "@/lib/market-data/provider";

export {
  mapCoinGeckoTimeframe,
  mapFixtureTimeframe,
  aggregateCandlesToCoarser,
  timeframeIntervalMs,
  COINGECKO_LIVE_TIMEFRAMES,
  COINGECKO_UNSUPPORTED_INTRADAY,
  coinGeckoDaysForTimeframe,
} from "@/lib/market-data/timeframe-map";

export { classifyFreshness, computeDelayMs } from "@/lib/market-data/freshness";
export { normalizeQuote, isValidMarkPrice } from "@/lib/market-data/normalize-quote";
export {
  validateCandle,
  normalizeCandleSeries,
} from "@/lib/market-data/normalize-candles";

export {
  MarketDataCache,
  defaultMarketDataCache,
  QUOTE_CACHE_TTL_MS,
  candleCacheTtl,
  quoteCacheKey,
  candlesCacheKey,
} from "@/lib/market-data/cache";

export {
  RequestDedupe,
  defaultRequestDedupe,
  isStaleGeneration,
} from "@/lib/market-data/request-dedupe";

export {
  LIVE_MARKET_DATA_ENV_FLAG,
  isLiveMarketDataEnabled,
  isProductionEnv,
  allowFixtureProvider,
  mayUseFixtureOnLiveFailure,
  REQUEST_POLICY,
} from "@/lib/market-data/policy";

export {
  FixtureMarketDataProvider,
  fixtureMarketDataProvider,
} from "@/lib/market-data/fixture-provider";

export {
  CryptoMarketDataProvider,
  createCryptoMarketDataProvider,
  COINGECKO_ID_BY_SYMBOL,
} from "@/lib/market-data/crypto-provider";

export {
  MarketDataProviderRegistry,
  createDefaultRegistry,
} from "@/lib/market-data/provider-registry";

export {
  MarketDataService,
  createMarketDataService,
  getMarketDataService,
  marketDataService,
} from "@/lib/market-data/service";

export {
  marketQuoteToAssetQuote,
  marketCandleToLegacyCandle,
  marketCandleSeriesToLegacyCandles,
  legacyCandleToMarketCandle,
} from "@/lib/market-data/adapters-compat";

// ── Legacy surface (workspace still uses these directly) ──────────────────
export type {
  AssetQuote,
  Bias,
  Candle,
  HermesAnalysis,
  SuggestedAction,
} from "@/lib/market-data/legacy";

export {
  supportedAssets,
  fallbackQuotes,
  journal,
  fetchLiveQuotes,
  fetchMarketCandles,
  pricesToCandles,
  buildFallbackCandles,
  analyzeMarket,
  formatCurrency,
  formatPercent,
} from "@/lib/market-data/legacy";
