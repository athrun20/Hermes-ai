/**
 * Hermes Live Market Data Foundation — contracts (Step A).
 * Provider-neutral. Not exchange-grade by default.
 */

import type { CoinSymbol, Timeframe } from "@/lib/market-data/legacy";

export type { CoinSymbol, Timeframe };

export type AssetClass = "Crypto" | "Stock" | "ETF";

export type DataQuality =
  | "Live"
  | "Delayed"
  | "Stale"
  | "Fixture"
  | "Partial"
  | "Unavailable";

export type ProviderStatus =
  | "Available"
  | "Degraded"
  | "Rate Limited"
  | "Offline"
  | "Unsupported";

export type MarketDataProviderId = "fixture" | "coingecko" | "unknown";

export type MarketDataErrorCode =
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "UNSUPPORTED"
  | "INVALID_RESPONSE"
  | "VALIDATION_FAILED"
  | "ABORTED"
  | "NETWORK";

export type MarketDataError = {
  code: MarketDataErrorCode;
  message: string;
  retryable: boolean;
  provider?: MarketDataProviderId | string;
};

export type MarketQuote = {
  symbol: CoinSymbol | string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  marketCap: number | null;
  provider: MarketDataProviderId | string;
  sourceTimestamp: number;
  receivedTimestamp: number;
  dataQuality: DataQuality;
  delayMs: number;
  currency: string;
  error?: MarketDataError;
  /** Non-exchange-grade caveat for public aggregators like CoinGecko. */
  limitations?: string[];
};

export type MarketCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Explicit null when volume is missing — never fabricate. */
  volume: number | null;
  provider: MarketDataProviderId | string;
  dataQuality: DataQuality;
};

export type MarketCandleSeries = {
  symbol: CoinSymbol | string;
  timeframe: Timeframe;
  candles: MarketCandle[];
  provider: MarketDataProviderId | string;
  dataQuality: DataQuality;
  sourceTimestamp: number | null;
  receivedTimestamp: number;
  limitations?: string[];
  error?: MarketDataError;
};

export type SymbolMetadata = {
  symbol: CoinSymbol | string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  coingeckoId?: string;
  provider: MarketDataProviderId | string;
  dataQuality: DataQuality;
};

export type MarketDataRange = {
  /** Inclusive start timestamp (ms). */
  from?: number;
  /** Inclusive end timestamp (ms). */
  to?: number;
  /** Preferred bar count when range bounds omitted. */
  limit?: number;
};

export type ProviderCapabilities = {
  providerId: MarketDataProviderId | string;
  supportedAssetClasses: AssetClass[];
  supportedTimeframes: Timeframe[];
  supportsQuotes: boolean;
  supportsCandles: boolean;
  volumeAvailable: boolean;
  providerGeneratedTimestamps: boolean;
  mayBeDelayed: boolean;
  /** Max lookback in ms the provider is willing to serve. */
  maxRangeMs: number;
  /** Notes that must not be overstated as exchange real-time. */
  caveats: string[];
};

export type MarketDataRequestOptions = {
  now?: number;
  signal?: AbortSignal;
  /** Bumps when user switches symbol/TF — ignore stale responses. */
  generation?: number;
  /** Force skip cache. */
  bypassCache?: boolean;
};

/** Environment / policy for routing and fallbacks. */
export type MarketDataRuntimeEnv = {
  /** When true, live crypto path is eligible (workspace opt-in via env flags). */
  liveMarketDataEnabled?: boolean;
  /** production | development | test */
  nodeEnv?: string;
  /** Allow fixture provider for tests/dev. */
  allowFixtures?: boolean;
};
