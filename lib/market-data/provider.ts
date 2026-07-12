/**
 * MarketDataProvider contract — provider-neutral surface.
 */

import type {
  MarketCandleSeries,
  MarketDataRange,
  MarketDataRequestOptions,
  MarketQuote,
  ProviderCapabilities,
  ProviderStatus,
  SymbolMetadata,
  Timeframe,
} from "@/lib/market-data/types";

export interface MarketDataProvider {
  readonly id: string;
  getCapabilities(): ProviderCapabilities;
  getProviderStatus(): ProviderStatus | Promise<ProviderStatus>;
  getQuote(
    symbol: string,
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote>;
  getQuotes(
    symbols: string[],
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote[]>;
  getCandles(
    symbol: string,
    timeframe: Timeframe,
    range?: MarketDataRange,
    options?: MarketDataRequestOptions,
  ): Promise<MarketCandleSeries>;
  getSymbolMetadata(
    symbol: string,
    options?: MarketDataRequestOptions,
  ): Promise<SymbolMetadata>;
}
