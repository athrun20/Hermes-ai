/**
 * Deterministic fixture provider — always DataQuality: Fixture.
 * Stocks/ETFs Phase 1 + dev/test crypto.
 */

import type { MarketDataProvider } from "@/lib/market-data/provider";
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
import { normalizeQuote } from "@/lib/market-data/normalize-quote";
import { normalizeCandleSeries } from "@/lib/market-data/normalize-candles";
import { timeframeIntervalMs } from "@/lib/market-data/timeframe-map";
import {
  fallbackQuotes,
  type AssetQuote,
  type CoinSymbol,
} from "@/lib/market-data/legacy";
import { marketUniverse } from "@/lib/market-universe";

const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  LINK: "chainlink",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOGE: "dogecoin",
  XRP: "ripple",
};

export class FixtureMarketDataProvider implements MarketDataProvider {
  readonly id = "fixture" as const;

  getCapabilities(): ProviderCapabilities {
    return {
      providerId: "fixture",
      supportedAssetClasses: ["Crypto", "Stock", "ETF"],
      supportedTimeframes: ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"],
      supportsQuotes: true,
      supportsCandles: true,
      volumeAvailable: false,
      providerGeneratedTimestamps: false,
      mayBeDelayed: false,
      maxRangeMs: 365 * 24 * 60 * 60_000,
      caveats: ["Deterministic fixture data only — never Live."],
    };
  }

  getProviderStatus(): ProviderStatus {
    return "Available";
  }

  async getQuote(
    symbol: string,
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote> {
    const now = options?.now ?? Date.now();
    const asset = resolveAsset(symbol);
    return normalizeQuote({
      symbol: asset.symbol,
      price: asset.price,
      change24h: asset.change24h,
      volume: null,
      marketCap: null,
      provider: "fixture",
      sourceTimestamp: now,
      receivedTimestamp: now,
      forcedQuality: "Fixture",
      limitations: ["Fixture data — not a live market feed."],
    });
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
    const now = options?.now ?? Date.now();
    const asset = resolveAsset(symbol);
    const count = range?.limit ?? defaultBarCount(timeframe);
    const step = timeframeIntervalMs(timeframe);
    const end = range?.to ?? now;
    const start = range?.from ?? end - count * step;

    const raw = buildFixtureCandles({
      symbol: asset.symbol,
      price: asset.price,
      change24h: asset.change24h,
      timeframe,
      start,
      end,
      step,
      now,
    });

    const result = normalizeCandleSeries({
      symbol: asset.symbol,
      timeframe,
      candles: raw,
      provider: "fixture",
      receivedTimestamp: now,
      forcedQuality: "Fixture",
      limitations: ["Fixture candles — not live market data."],
      repair: true,
    });

    return result.series;
  }

  async getSymbolMetadata(symbol: string): Promise<SymbolMetadata> {
    const asset = resolveAsset(symbol);
    const universe = marketUniverse.find(
      (a) => a.symbol.toUpperCase() === symbol.toUpperCase(),
    );
    return {
      symbol: asset.symbol,
      name: asset.name,
      assetClass: universe?.assetType ?? inferAssetClass(asset.symbol),
      currency: "USD",
      coingeckoId: CRYPTO_IDS[asset.symbol] || asset.coingeckoId || undefined,
      provider: "fixture",
      dataQuality: "Fixture",
    };
  }
}

export const fixtureMarketDataProvider = new FixtureMarketDataProvider();

function resolveAsset(symbol: string): AssetQuote {
  const upper = symbol.toUpperCase();
  const fromUniverse = marketUniverse.find((a) => a.symbol === upper);
  if (fromUniverse) {
    return {
      symbol: fromUniverse.symbol as CoinSymbol,
      name: fromUniverse.name,
      coingeckoId: CRYPTO_IDS[upper] ?? "",
      pair: `${fromUniverse.symbol}/USD` as AssetQuote["pair"],
      price: fromUniverse.price,
      change24h: fromUniverse.change24h,
    };
  }
  const fromFallback = fallbackQuotes.find((a) => a.symbol === upper);
  if (fromFallback) return fromFallback;
  return {
    symbol: upper as CoinSymbol,
    name: upper,
    coingeckoId: CRYPTO_IDS[upper] ?? "",
    pair: `${upper}/USD` as AssetQuote["pair"],
    price: 100,
    change24h: 0,
  };
}

function inferAssetClass(symbol: string): SymbolMetadata["assetClass"] {
  if (["SPY", "QQQ"].includes(symbol)) return "ETF";
  if (CRYPTO_IDS[symbol]) return "Crypto";
  if (
    ["AAPL", "MSFT", "NVDA", "TSLA", "AMD", "META", "GOOGL", "AMZN", "JPM", "COST"].includes(
      symbol,
    )
  ) {
    return "Stock";
  }
  return "Crypto";
}

function defaultBarCount(tf: Timeframe): number {
  if (tf === "1W") return 42;
  if (tf === "1D") return 60;
  if (tf === "4H") return 48;
  return 64;
}

function buildFixtureCandles(args: {
  symbol: string;
  price: number;
  change24h: number;
  timeframe: Timeframe;
  start: number;
  end: number;
  step: number;
  now: number;
}) {
  const bars: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: null;
    provider: "fixture";
    dataQuality: "Fixture";
  }> = [];
  const direction = args.change24h >= 0 ? 1 : -1;
  let previous = args.price * (1 - args.change24h / 100 / 2);
  let t = Math.floor(args.start / args.step) * args.step;
  let index = 0;
  while (t <= args.end && bars.length < 500) {
    const wave = Math.sin(index * 0.55) * args.price * 0.0016;
    const drift = direction * args.price * 0.00042;
    const open = previous;
    const close = Math.max(0.01, open + wave + drift);
    previous = close;
    bars.push({
      timestamp: t,
      open,
      high: Math.max(open, close) + args.price * 0.001,
      low: Math.min(open, close) - args.price * 0.001,
      close,
      volume: null,
      provider: "fixture",
      dataQuality: "Fixture",
    });
    t += args.step;
    index += 1;
  }
  return bars;
}
