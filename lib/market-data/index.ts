/**
 * Hermes market-data package.
 *
 * Step A: provider-neutral foundation + legacy re-exports.
 * Step B: workspace read-path helper (MarketDataService → compat adapters).
 * Step C: data-quality awareness metadata for UI / future mentor layers.
 * Default remains fixtures unless HERMES_LIVE_MARKET_DATA / NEXT_PUBLIC_… = 1.
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
  LIVE_MARKET_DATA_PUBLIC_ENV_FLAG,
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

export type {
  WorkspaceMarketSeries,
  WorkspaceQuotesResult,
  LoadWorkspaceMarketSeriesArgs,
  LoadWorkspaceQuotesArgs,
} from "@/lib/market-data/workspace";

export {
  loadWorkspaceMarketSeries,
  loadWorkspaceQuotes,
  notifyWorkspaceSelectionChanged,
  createWorkspaceMarketDataService,
  isLiveCryptoTimeframeSupported,
} from "@/lib/market-data/workspace";

export type {
  WorkspaceDataQuality,
  DataQualityToneHint,
  BuildWorkspaceDataQualityInput,
} from "@/lib/market-data/data-quality-awareness";

export {
  buildWorkspaceDataQuality,
  createPendingWorkspaceDataQuality,
  providerDisplayName,
  qualityStatusLabel,
  dataQualityTone,
} from "@/lib/market-data/data-quality-awareness";

// ── Legacy surface (engines still use AssetQuote / Candle contracts) ──────
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
