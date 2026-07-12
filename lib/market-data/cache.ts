/**
 * Short-lived quote cache + longer candle cache. Deterministic and testable.
 */

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  storedAt: number;
};

export class MarketDataCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, now = Date.now()): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Return entry even if expired (for stale last-good). */
  getEntry<T>(key: string): CacheEntry<T> | undefined {
    return this.store.get(key) as CacheEntry<T> | undefined;
  }

  set<T>(key: string, value: T, ttlMs: number, now = Date.now()): void {
    this.store.set(key, {
      value,
      storedAt: now,
      expiresAt: now + Math.max(0, ttlMs),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const QUOTE_CACHE_TTL_MS = 20_000;
export const CANDLE_CACHE_TTL_MS_BY_TF: Record<string, number> = {
  "1m": 30_000,
  "5m": 45_000,
  "15m": 60_000,
  "30m": 90_000,
  "1H": 120_000,
  "4H": 180_000,
  "1D": 300_000,
  "1W": 600_000,
};

export function candleCacheTtl(timeframe: string): number {
  return CANDLE_CACHE_TTL_MS_BY_TF[timeframe] ?? 120_000;
}

export function quoteCacheKey(symbol: string): string {
  return `quote:${symbol.toUpperCase()}`;
}

export function candlesCacheKey(
  symbol: string,
  timeframe: string,
  rangeKey = "default",
): string {
  return `candles:${symbol.toUpperCase()}:${timeframe}:${rangeKey}`;
}

/** Shared default cache instances for service (tests may construct own). */
export const defaultMarketDataCache = new MarketDataCache();
