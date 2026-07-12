/**
 * Compatibility adapters between MarketQuote/MarketCandle and legacy AssetQuote/Candle.
 */

import type { AssetQuote, Candle, CoinSymbol } from "@/lib/market-data/legacy";
import type { MarketCandle, MarketCandleSeries, MarketQuote } from "@/lib/market-data/types";
import { COINGECKO_ID_BY_SYMBOL } from "@/lib/market-data/crypto-provider";
import { marketUniverse } from "@/lib/market-universe";

/**
 * Convert normalized MarketQuote → legacy AssetQuote for existing engines.
 * Preserves price/change; does not invent live labels on AssetQuote.
 */
export function marketQuoteToAssetQuote(quote: MarketQuote): AssetQuote {
  const symbol = String(quote.symbol).toUpperCase() as CoinSymbol;
  const meta = marketUniverse.find((a) => a.symbol === symbol);
  return {
    symbol,
    name: meta?.name ?? symbol,
    coingeckoId: COINGECKO_ID_BY_SYMBOL[symbol] ?? "",
    pair: `${symbol}/USD`,
    price: Number.isFinite(quote.price) ? quote.price : 0,
    change24h: quote.changePercent,
    lastUpdated:
      quote.sourceTimestamp > 0
        ? new Date(quote.sourceTimestamp).toISOString()
        : undefined,
  };
}

/** Legacy chart candle: time is unix seconds. */
export function marketCandleToLegacyCandle(candle: MarketCandle): Candle {
  const ts = candle.timestamp;
  const time = ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
  return {
    time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

export function marketCandleSeriesToLegacyCandles(
  series: MarketCandleSeries,
): Candle[] {
  return series.candles.map(marketCandleToLegacyCandle);
}

export function legacyCandleToMarketCandle(
  candle: Candle,
  provider: string,
  dataQuality: MarketCandle["dataQuality"],
): MarketCandle {
  const time = candle.time;
  const timestamp = time < 1e12 ? time * 1000 : time;
  return {
    timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: null,
    provider,
    dataQuality,
  };
}
