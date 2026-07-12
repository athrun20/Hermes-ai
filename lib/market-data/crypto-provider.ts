/**
 * CoinGecko crypto provider abstraction (Step A).
 *
 * Not exchange-grade real-time. Public aggregator limitations apply.
 * Prefer calling via Next.js Route Handlers so React never hits CoinGecko directly.
 *
 * Inject `fetchImpl` for tests — never requires network in unit tests.
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
import {
  aggregateCandlesToCoarser,
  coinGeckoDaysForTimeframe,
  mapCoinGeckoTimeframe,
  timeframeIntervalMs,
} from "@/lib/market-data/timeframe-map";
import { REQUEST_POLICY } from "@/lib/market-data/policy";

export const COINGECKO_ID_BY_SYMBOL: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  LINK: "chainlink",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOGE: "dogecoin",
  XRP: "ripple",
};

export type CryptoProviderDeps = {
  /** Absolute base for API proxy, e.g. "" for relative /api/market or full origin. */
  apiBase?: string;
  /** Direct CoinGecko base (server-side only). Default public API. */
  coingeckoBase?: string;
  /** When true, fetch via /api/market proxy paths. When false, call CoinGecko URL (server). */
  useProxy?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export class CryptoMarketDataProvider implements MarketDataProvider {
  readonly id = "coingecko" as const;
  private status: ProviderStatus = "Available";
  private rateLimitedUntil = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly apiBase: string;
  private readonly coingeckoBase: string;
  private readonly useProxy: boolean;
  private readonly nowFn: () => number;

  constructor(deps: CryptoProviderDeps = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch.bind(globalThis);
    this.apiBase = deps.apiBase ?? "";
    this.coingeckoBase = deps.coingeckoBase ?? "https://api.coingecko.com/api/v3";
    this.useProxy = deps.useProxy ?? true;
    this.nowFn = deps.now ?? (() => Date.now());
  }

  getCapabilities(): ProviderCapabilities {
    return {
      providerId: "coingecko",
      supportedAssetClasses: ["Crypto"],
      supportedTimeframes: ["1H", "4H", "1D", "1W"],
      supportsQuotes: true,
      supportsCandles: true,
      volumeAvailable: true,
      providerGeneratedTimestamps: true,
      mayBeDelayed: true,
      maxRangeMs: 90 * 24 * 60 * 60_000,
      caveats: [
        "CoinGecko is a public market-data aggregator, not exchange-grade real-time.",
        "Fine intraday (1m–30m) live OHLC is unsupported in Phase 1.",
        "Do not treat Delayed data as Live.",
      ],
    };
  }

  getProviderStatus(): ProviderStatus {
    const now = this.nowFn();
    if (this.rateLimitedUntil > now) return "Rate Limited";
    return this.status;
  }

  /** Test helper */
  setStatus(status: ProviderStatus): void {
    this.status = status;
  }

  async getQuote(
    symbol: string,
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote> {
    const upper = symbol.toUpperCase();
    const id = COINGECKO_ID_BY_SYMBOL[upper];
    if (!id) {
      return unavailableQuote(upper, "Unsupported crypto symbol for CoinGecko mapping.");
    }
    if (this.getProviderStatus() === "Rate Limited") {
      return unavailableQuote(upper, "Rate limited", "RATE_LIMITED", true);
    }

    try {
      const received = this.nowFn();
      const data = await this.fetchJson(
        this.quoteUrl(id),
        REQUEST_POLICY.quoteTimeoutMs,
        options?.signal,
      );
      const row = data[id] as
        | {
            usd?: number;
            usd_24h_change?: number;
            usd_24h_vol?: number;
            usd_market_cap?: number;
            last_updated_at?: number;
          }
        | undefined;

      if (!row || !Number.isFinite(row.usd)) {
        this.status = "Degraded";
        return unavailableQuote(upper, "Invalid quote payload", "INVALID_RESPONSE");
      }

      const sourceTimestamp =
        (row.last_updated_at ?? Math.floor(received / 1000)) * 1000;

      this.status = "Available";
      return normalizeQuote({
        symbol: upper,
        price: row.usd as number,
        change24h: row.usd_24h_change ?? 0,
        volume: row.usd_24h_vol ?? null,
        marketCap: row.usd_market_cap ?? null,
        provider: "coingecko",
        sourceTimestamp,
        receivedTimestamp: received,
        mayBeDelayed: true,
        limitations: this.getCapabilities().caveats,
      });
    } catch (error) {
      return this.mapFetchError(upper, error);
    }
  }

  async getQuotes(
    symbols: string[],
    options?: MarketDataRequestOptions,
  ): Promise<MarketQuote[]> {
    const ids = symbols
      .map((s) => COINGECKO_ID_BY_SYMBOL[s.toUpperCase()])
      .filter(Boolean) as string[];
    if (ids.length === 0) {
      return symbols.map((s) =>
        unavailableQuote(s.toUpperCase(), "Unsupported crypto symbol"),
      );
    }
    if (this.getProviderStatus() === "Rate Limited") {
      return symbols.map((s) =>
        unavailableQuote(s.toUpperCase(), "Rate limited", "RATE_LIMITED", true),
      );
    }

    try {
      const received = this.nowFn();
      const data = await this.fetchJson(
        this.quotesUrl(ids),
        REQUEST_POLICY.quoteTimeoutMs,
        options?.signal,
      );
      return symbols.map((symbol) => {
        const upper = symbol.toUpperCase();
        const id = COINGECKO_ID_BY_SYMBOL[upper];
        if (!id) return unavailableQuote(upper, "Unsupported crypto symbol");
        const row = data[id] as
          | {
              usd?: number;
              usd_24h_change?: number;
              usd_24h_vol?: number;
              usd_market_cap?: number;
              last_updated_at?: number;
            }
          | undefined;
        if (!row || !Number.isFinite(row.usd)) {
          return unavailableQuote(upper, "Invalid quote payload", "INVALID_RESPONSE");
        }
        const sourceTimestamp =
          (row.last_updated_at ?? Math.floor(received / 1000)) * 1000;
        return normalizeQuote({
          symbol: upper,
          price: row.usd as number,
          change24h: row.usd_24h_change ?? 0,
          volume: row.usd_24h_vol ?? null,
          marketCap: row.usd_market_cap ?? null,
          provider: "coingecko",
          sourceTimestamp,
          receivedTimestamp: received,
          mayBeDelayed: true,
          limitations: this.getCapabilities().caveats,
        });
      });
    } catch (error) {
      return symbols.map((s) => this.mapFetchError(s.toUpperCase(), error));
    }
  }

  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    _range?: MarketDataRange,
    options?: MarketDataRequestOptions,
  ): Promise<MarketCandleSeries> {
    const upper = symbol.toUpperCase();
    const id = COINGECKO_ID_BY_SYMBOL[upper];
    const received = this.nowFn();
    const mapping = mapCoinGeckoTimeframe(timeframe);

    if (!id) {
      return emptySeries(upper, timeframe, "Unsupported crypto symbol");
    }
    if (mapping.status === "unsupported") {
      return emptySeries(upper, timeframe, mapping.reason, "UNSUPPORTED");
    }
    if (this.getProviderStatus() === "Rate Limited") {
      return emptySeries(upper, timeframe, "Rate limited", "RATE_LIMITED");
    }

    try {
      const days =
        mapping.status === "aggregate-from"
          ? coinGeckoDaysForTimeframe(mapping.sourceTimeframe)
          : coinGeckoDaysForTimeframe(timeframe);

      const data = await this.fetchJson(
        this.candlesUrl(id, days),
        REQUEST_POLICY.candleTimeoutMs,
        options?.signal,
      );

      const prices = (data.prices ?? []) as [number, number][];
      const volumes = (data.total_volumes ?? []) as [number, number][];
      const volumeByTs = new Map(volumes.map(([ts, v]) => [ts, v]));

      const intervalMs =
        mapping.status === "aggregate-from"
          ? mapping.sourceIntervalMs
          : timeframeIntervalMs(timeframe);

      const raw = prices.map(([ts, price]) => {
        const vol = volumeByTs.get(ts);
        return {
          timestamp: ts,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: vol == null || !Number.isFinite(vol) ? null : vol,
          provider: "coingecko" as const,
        };
      });

      // Bucket into interval OHLC from price points (same granularity as source interval)
      const bucketed = bucketPricePoints(raw, intervalMs, "coingecko");

      let seriesResult = normalizeCandleSeries({
        symbol: upper,
        timeframe:
          mapping.status === "aggregate-from" ? mapping.sourceTimeframe : timeframe,
        candles: bucketed,
        provider: "coingecko",
        receivedTimestamp: received,
        mayBeDelayed: true,
        limitations: this.getCapabilities().caveats,
        repair: true,
      });

      if (!seriesResult.ok) return seriesResult.series;

      if (mapping.status === "aggregate-from") {
        const aggregated = aggregateCandlesToCoarser(
          seriesResult.series.candles,
          mapping.sourceIntervalMs,
          mapping.targetIntervalMs,
        );
        seriesResult = normalizeCandleSeries({
          symbol: upper,
          timeframe,
          candles: aggregated,
          provider: "coingecko",
          receivedTimestamp: received,
          mayBeDelayed: true,
          limitations: this.getCapabilities().caveats,
          repair: true,
        });
      }

      this.status = "Available";
      return seriesResult.series;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/429|rate/i.test(msg)) {
        this.rateLimitedUntil = this.nowFn() + REQUEST_POLICY.rateLimitCooldownMs;
        this.status = "Rate Limited";
        return emptySeries(upper, timeframe, msg, "RATE_LIMITED");
      }
      if (/abort/i.test(msg)) {
        return emptySeries(upper, timeframe, msg, "ABORTED");
      }
      if (/timeout/i.test(msg)) {
        this.status = "Degraded";
        return emptySeries(upper, timeframe, msg, "TIMEOUT");
      }
      this.status = "Offline";
      return emptySeries(upper, timeframe, msg, "NETWORK");
    }
  }

  async getSymbolMetadata(symbol: string): Promise<SymbolMetadata> {
    const upper = symbol.toUpperCase();
    const id = COINGECKO_ID_BY_SYMBOL[upper];
    return {
      symbol: upper,
      name: upper,
      assetClass: "Crypto",
      currency: "USD",
      coingeckoId: id,
      provider: "coingecko",
      dataQuality: id ? "Delayed" : "Unavailable",
    };
  }

  // ── internal ────────────────────────────────────────────────────────────

  private quoteUrl(id: string): string {
    if (this.useProxy) {
      return `${this.apiBase}/api/market/quote?symbol=${encodeURIComponent(
        reverseId(id) ?? id,
      )}&raw=1&id=${encodeURIComponent(id)}`;
    }
    return `${this.coingeckoBase}/simple/price?ids=${encodeURIComponent(
      id,
    )}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;
  }

  private quotesUrl(ids: string[]): string {
    if (this.useProxy) {
      return `${this.apiBase}/api/market/quotes?ids=${encodeURIComponent(ids.join(","))}&raw=1`;
    }
    return `${this.coingeckoBase}/simple/price?ids=${encodeURIComponent(
      ids.join(","),
    )}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;
  }

  private candlesUrl(id: string, days: string): string {
    if (this.useProxy) {
      return `${this.apiBase}/api/market/candles?id=${encodeURIComponent(
        id,
      )}&days=${encodeURIComponent(days)}&raw=1`;
    }
    return `${this.coingeckoBase}/coins/${encodeURIComponent(
      id,
    )}/market_chart?vs_currency=usd&days=${encodeURIComponent(days)}`;
  }

  private async fetchJson(
    url: string,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    let lastError: unknown;
    const attempts = REQUEST_POLICY.maxRetries + 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const onAbort = () => controller.abort();
        signal?.addEventListener("abort", onAbort);
        try {
          const response = await this.fetchImpl(url, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (response.status === 429) {
            this.rateLimitedUntil = this.nowFn() + REQUEST_POLICY.rateLimitCooldownMs;
            this.status = "Rate Limited";
            throw new Error("429 rate limited");
          }
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return (await response.json()) as Record<string, unknown>;
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        }
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        if (/429/.test(msg)) break;
        if (/abort/i.test(msg)) break;
        if (attempt < attempts - 1) {
          await sleep(REQUEST_POLICY.retryBackoffMs * (attempt + 1));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private mapFetchError(symbol: string, error: unknown): MarketQuote {
    const msg = error instanceof Error ? error.message : String(error);
    if (/429|rate/i.test(msg)) {
      this.rateLimitedUntil = this.nowFn() + REQUEST_POLICY.rateLimitCooldownMs;
      this.status = "Rate Limited";
      return unavailableQuote(symbol, msg, "RATE_LIMITED", true);
    }
    if (/abort/i.test(msg)) {
      return unavailableQuote(symbol, msg, "ABORTED");
    }
    if (/timeout/i.test(msg)) {
      this.status = "Degraded";
      return unavailableQuote(symbol, msg, "TIMEOUT", true);
    }
    this.status = "Offline";
    return unavailableQuote(symbol, msg, "NETWORK", true);
  }
}

function unavailableQuote(
  symbol: string,
  message: string,
  code: MarketQuote["error"] extends infer E
    ? E extends { code: infer C }
      ? C
      : "UNAVAILABLE"
    : "UNAVAILABLE" = "UNAVAILABLE",
  retryable = false,
): MarketQuote {
  const now = Date.now();
  return normalizeQuote({
    symbol,
    price: NaN,
    change24h: 0,
    volume: null,
    marketCap: null,
    provider: "coingecko",
    sourceTimestamp: now,
    receivedTimestamp: now,
    forcedQuality: "Unavailable",
    error: {
      code: code as "UNAVAILABLE",
      message,
      retryable,
      provider: "coingecko",
    },
  });
}

function emptySeries(
  symbol: string,
  timeframe: Timeframe,
  message: string,
  code: "UNAVAILABLE" | "UNSUPPORTED" | "RATE_LIMITED" | "TIMEOUT" | "NETWORK" | "ABORTED" = "UNAVAILABLE",
): MarketCandleSeries {
  const now = Date.now();
  return {
    symbol,
    timeframe,
    candles: [],
    provider: "coingecko",
    dataQuality: code === "UNSUPPORTED" ? "Unavailable" : "Unavailable",
    sourceTimestamp: null,
    receivedTimestamp: now,
    limitations: ["CoinGecko public aggregator — not exchange real-time."],
    error: { code, message, retryable: code === "RATE_LIMITED" || code === "TIMEOUT", provider: "coingecko" },
  };
}

function bucketPricePoints(
  points: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
    provider: "coingecko";
  }>,
  intervalMs: number,
  provider: "coingecko",
) {
  const buckets = new Map<number, typeof points>();
  for (const p of points) {
    const bucket = Math.floor(p.timestamp / intervalMs) * intervalMs;
    const list = buckets.get(bucket) ?? [];
    list.push(p);
    buckets.set(bucket, list);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucket, list]) => {
      const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
      const prices = sorted.map((x) => x.close);
      const vols = sorted.map((x) => x.volume);
      return {
        timestamp: bucket,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: vols.every((v) => v != null) ? vols.reduce((s, v) => (s ?? 0) + (v as number), 0) : null,
        provider,
      };
    });
}

function reverseId(id: string): string | undefined {
  return Object.entries(COINGECKO_ID_BY_SYMBOL).find(([, v]) => v === id)?.[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createCryptoMarketDataProvider(
  deps?: CryptoProviderDeps,
): CryptoMarketDataProvider {
  return new CryptoMarketDataProvider(deps);
}
