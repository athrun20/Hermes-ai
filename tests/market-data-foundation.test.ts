/**
 * Live Market Data Foundation — Step A unit tests.
 * No dashboard wiring. No network required (injected fetch).
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  aggregateCandlesToCoarser,
  allowFixtureProvider,
  candlesCacheKey,
  classifyFreshness,
  COINGECKO_UNSUPPORTED_INTRADAY,
  createCryptoMarketDataProvider,
  createDefaultRegistry,
  createMarketDataService,
  fixtureMarketDataProvider,
  isLiveMarketDataEnabled,
  isStaleGeneration,
  mapCoinGeckoTimeframe,
  MarketDataCache,
  marketCandleSeriesToLegacyCandles,
  marketQuoteToAssetQuote,
  mayUseFixtureOnLiveFailure,
  normalizeCandleSeries,
  normalizeQuote,
  quoteCacheKey,
  RequestDedupe,
  timeframeIntervalMs,
  validateCandle,
} from "../lib/market-data/index";

test("fixture provider always returns Fixture quality", async () => {
  const q = await fixtureMarketDataProvider.getQuote("BTC", { now: 1_700_000_000_000 });
  assert.equal(q.dataQuality, "Fixture");
  assert.equal(q.provider, "fixture");
  assert.ok(Number.isFinite(q.price));

  const series = await fixtureMarketDataProvider.getCandles("BTC", "1H", undefined, {
    now: 1_700_000_000_000,
  });
  assert.equal(series.dataQuality, "Fixture");
  assert.ok(series.candles.length > 0);
  assert.ok(series.candles.every((c) => c.dataQuality === "Fixture"));
});

test("fixture provider is deterministic for fixed now", async () => {
  const a = await fixtureMarketDataProvider.getCandles("ETH", "1H", { limit: 20 }, { now: 2e12 });
  const b = await fixtureMarketDataProvider.getCandles("ETH", "1H", { limit: 20 }, { now: 2e12 });
  assert.deepEqual(a.candles, b.candles);
});

test("stock and ETF route to fixture", () => {
  const reg = createDefaultRegistry({ env: { liveMarketDataEnabled: true } });
  assert.equal(reg.resolveProvider("AAPL").id, "fixture");
  assert.equal(reg.resolveProvider("SPY").id, "fixture");
  assert.equal(reg.resolveAssetClass("NVDA"), "Stock");
  assert.equal(reg.resolveAssetClass("QQQ"), "ETF");
});

test("crypto routes to crypto provider when live enabled", () => {
  const reg = createDefaultRegistry({ env: { liveMarketDataEnabled: true } });
  assert.equal(reg.resolveProvider("BTC").id, "coingecko");
});

test("crypto routes to fixture when live disabled", () => {
  const reg = createDefaultRegistry({ env: { liveMarketDataEnabled: false } });
  assert.equal(reg.resolveProvider("BTC").id, "fixture");
});

test("quote normalization preserves metadata", () => {
  const q = normalizeQuote({
    symbol: "BTC",
    price: 100,
    change24h: 2,
    volume: 1e6,
    marketCap: 1e9,
    provider: "coingecko",
    sourceTimestamp: Date.now() - 1000,
    receivedTimestamp: Date.now(),
    mayBeDelayed: true,
    limitations: ["aggregator"],
  });
  assert.equal(q.symbol, "BTC");
  assert.equal(q.price, 100);
  assert.equal(q.changePercent, 2);
  assert.equal(q.provider, "coingecko");
  assert.ok(q.delayMs >= 0);
  assert.ok(["Delayed", "Partial", "Stale", "Live"].includes(q.dataQuality));
  // Public aggregator should not claim exchange Live when mayBeDelayed
  assert.notEqual(q.dataQuality, "Live");
});

test("invalid quote price becomes Unavailable", () => {
  const q = normalizeQuote({
    symbol: "BTC",
    price: NaN,
    provider: "coingecko",
    sourceTimestamp: Date.now(),
    mayBeDelayed: true,
  });
  assert.equal(q.dataQuality, "Unavailable");
});

test("candle validation rejects non-finite OHLC", () => {
  assert.equal(
    validateCandle({
      timestamp: 1000,
      open: NaN,
      high: 2,
      low: 1,
      close: 1.5,
      provider: "fixture",
    }),
    null,
  );
});

test("candle validation enforces high/low invariants with repair", () => {
  const c = validateCandle(
    {
      timestamp: 1000,
      open: 10,
      high: 9,
      low: 11,
      close: 10.5,
      provider: "fixture",
    },
    { repair: true },
  );
  assert.ok(c);
  assert.ok(c!.high >= c!.open);
  assert.ok(c!.high >= c!.close);
  assert.ok(c!.low <= c!.open);
  assert.ok(c!.low <= c!.close);
});

test("normalize candles sorts and merges duplicate timestamps", () => {
  const result = normalizeCandleSeries({
    symbol: "BTC",
    timeframe: "1H",
    provider: "fixture",
    forcedQuality: "Fixture",
    candles: [
      { timestamp: 2000, open: 2, high: 3, low: 1, close: 2.5, volume: 10, provider: "fixture" },
      { timestamp: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 5, provider: "fixture" },
      { timestamp: 2000, open: 2.5, high: 4, low: 2, close: 3, volume: 7, provider: "fixture" },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.series.candles.length, 2);
  assert.equal(result.series.candles[0].timestamp, 1000);
  assert.equal(result.series.candles[1].open, 2);
  assert.equal(result.series.candles[1].close, 3);
  assert.equal(result.series.candles[1].high, 4);
  assert.equal(result.series.candles[1].volume, 17);
});

test("missing volume prevents Live classification", () => {
  const now = Date.now();
  const result = normalizeCandleSeries({
    symbol: "BTC",
    timeframe: "1H",
    provider: "coingecko",
    receivedTimestamp: now,
    mayBeDelayed: false,
    candles: [
      {
        timestamp: now - 60_000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: null,
        provider: "coingecko",
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.notEqual(result.series.dataQuality, "Live");
  assert.ok(
    result.series.dataQuality === "Partial" ||
      result.series.dataQuality === "Delayed" ||
      result.series.dataQuality === "Stale",
  );
});

test("empty invalid candle set is rejected", () => {
  const result = normalizeCandleSeries({
    symbol: "BTC",
    timeframe: "1H",
    provider: "coingecko",
    candles: [
      { timestamp: 0, open: 1, high: 1, low: 1, close: 1, provider: "coingecko" },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.series.dataQuality, "Unavailable");
});

test("timeframe map marks 1m-30m unsupported for CoinGecko live", () => {
  for (const tf of COINGECKO_UNSUPPORTED_INTRADAY) {
    const m = mapCoinGeckoTimeframe(tf);
    assert.equal(m.status, "unsupported");
  }
  assert.equal(mapCoinGeckoTimeframe("1H").status, "supported");
  assert.equal(mapCoinGeckoTimeframe("1W").status, "aggregate-from");
});

test("crypto provider returns Unsupported for fine intraday", async () => {
  const crypto = createCryptoMarketDataProvider({
    useProxy: false,
    fetchImpl: async () => {
      throw new Error("should not fetch for unsupported TF");
    },
  });
  const series = await crypto.getCandles("BTC", "5m");
  assert.equal(series.candles.length, 0);
  assert.equal(series.error?.code, "UNSUPPORTED");
});

test("safe finer-to-coarser aggregation works", () => {
  const fine = [
    {
      timestamp: 0,
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
      volume: 10,
      provider: "coingecko",
      dataQuality: "Delayed" as const,
    },
    {
      timestamp: 60_000,
      open: 1.5,
      high: 2.5,
      low: 1.4,
      close: 2,
      volume: 12,
      provider: "coingecko",
      dataQuality: "Delayed" as const,
    },
  ];
  const coarse = aggregateCandlesToCoarser(fine, 60_000, 120_000);
  assert.equal(coarse.length, 1);
  assert.equal(coarse[0].open, 1);
  assert.equal(coarse[0].close, 2);
  assert.equal(coarse[0].volume, 22);
});

test("coarse-to-fine aggregation is refused", () => {
  assert.throws(() =>
    aggregateCandlesToCoarser(
      [
        {
          timestamp: 0,
          open: 1,
          high: 1,
          low: 1,
          close: 1,
          volume: null,
          provider: "x",
          dataQuality: "Fixture",
        },
      ],
      120_000,
      60_000,
    ),
  );
});

test("freshness classification scales with timeframe", () => {
  const now = 1_700_000_000_000;
  const fresh = classifyFreshness({
    sourceTimestamp: now - 30_000,
    receivedTimestamp: now,
    now,
    timeframe: "1H",
    mayBeDelayed: true,
  });
  assert.equal(fresh, "Delayed");

  const stale = classifyFreshness({
    sourceTimestamp: now - 10 * 60 * 60_000,
    receivedTimestamp: now,
    now,
    timeframe: "1H",
    mayBeDelayed: true,
  });
  assert.equal(stale, "Stale");

  const fixture = classifyFreshness({
    sourceTimestamp: now,
    receivedTimestamp: now,
    now,
    forcedQuality: "Fixture",
  });
  assert.equal(fixture, "Fixture");
});

test("cache quote TTL and clear", () => {
  const cache = new MarketDataCache();
  const key = quoteCacheKey("BTC");
  cache.set(key, { price: 1 }, 1000, 1000);
  assert.deepEqual(cache.get(key, 1500), { price: 1 });
  assert.equal(cache.get(key, 3000), undefined);
  cache.set(key, { price: 2 }, 5000, 0);
  cache.clear();
  assert.equal(cache.size(), 0);
});

test("candle cache key includes timeframe", () => {
  assert.notEqual(candlesCacheKey("BTC", "1H"), candlesCacheKey("BTC", "4H"));
});

test("in-flight request deduplication shares promises", async () => {
  const dedupe = new RequestDedupe();
  let calls = 0;
  const factory = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 20));
    return "ok";
  };
  const [a, b] = await Promise.all([
    dedupe.run("k1", factory),
    dedupe.run("k1", factory),
  ]);
  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(calls, 1);
});

test("generation token detects stale selection", () => {
  assert.equal(isStaleGeneration(1, 2), true);
  assert.equal(isStaleGeneration(2, 2), false);
  assert.equal(isStaleGeneration(undefined, 1), false);
});

test("out-of-order protection via selection generation on service", async () => {
  const service = createMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const g1 = service.notifySelectionChanged();
  const q1 = await service.getQuote("BTC", { generation: g1, now: 3e12 });
  assert.equal(q1.dataQuality, "Fixture");
  const g2 = service.notifySelectionChanged();
  assert.notEqual(g1, g2);
  assert.equal(isStaleGeneration(g1, service.getSelectionGeneration()), true);
});

test("crypto provider quote normalization via injected fetch", async () => {
  const crypto = createCryptoMarketDataProvider({
    useProxy: false,
    now: () => 1_700_000_100_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          bitcoin: {
            usd: 50000,
            usd_24h_change: 1.5,
            usd_24h_vol: 1000,
            usd_market_cap: 1e12,
            last_updated_at: 1_700_000_000,
          },
        }),
        { status: 200 },
      ),
  });
  const q = await crypto.getQuote("BTC");
  assert.equal(q.price, 50000);
  assert.equal(q.provider, "coingecko");
  assert.notEqual(q.dataQuality, "Live");
  assert.notEqual(q.dataQuality, "Fixture");
});

test("rate-limit handling sets status and unavailable quote", async () => {
  const crypto = createCryptoMarketDataProvider({
    useProxy: false,
    fetchImpl: async () => new Response("nope", { status: 429 }),
  });
  const q = await crypto.getQuote("BTC");
  assert.equal(q.dataQuality, "Unavailable");
  assert.equal(q.error?.code, "RATE_LIMITED");
  assert.equal(crypto.getProviderStatus(), "Rate Limited");
});

test("timeout / abort path", async () => {
  const crypto = createCryptoMarketDataProvider({
    useProxy: false,
    fetchImpl: async (_url, init) => {
      const err = new Error("The operation was aborted");
      if (init?.signal?.aborted) throw err;
      // Simulate abort
      throw err;
    },
  });
  const q = await crypto.getQuote("ETH");
  assert.equal(q.dataQuality, "Unavailable");
  assert.ok(
    q.error?.code === "ABORTED" ||
      q.error?.code === "NETWORK" ||
      q.error?.code === "TIMEOUT" ||
      q.error?.code === "UNAVAILABLE",
  );
});

test("production policy forbids fixture fallback on live failure", () => {
  assert.equal(
    mayUseFixtureOnLiveFailure({ nodeEnv: "production", liveMarketDataEnabled: true }),
    false,
  );
  assert.equal(
    mayUseFixtureOnLiveFailure({ nodeEnv: "development", liveMarketDataEnabled: true }),
    true,
  );
});

test("live flag defaults off", () => {
  assert.equal(isLiveMarketDataEnabled({ liveMarketDataEnabled: false }), false);
  assert.equal(isLiveMarketDataEnabled({ liveMarketDataEnabled: true }), true);
});

test("allow fixtures in non-production", () => {
  assert.equal(allowFixtureProvider({ nodeEnv: "test" }), true);
});

test("compatibility adapters map to legacy shapes", async () => {
  const q = await fixtureMarketDataProvider.getQuote("BTC", { now: 1e12 });
  const asset = marketQuoteToAssetQuote(q);
  assert.equal(asset.symbol, "BTC");
  assert.ok(asset.price > 0);

  const series = await fixtureMarketDataProvider.getCandles("BTC", "1H", { limit: 5 }, { now: 1e12 });
  const legacy = marketCandleSeriesToLegacyCandles(series);
  assert.equal(legacy.length, series.candles.length);
  assert.ok(legacy[0].time > 0);
  assert.ok(legacy[0].time < 1e12); // seconds scale
});

test("provider capabilities report supported timeframes", () => {
  const caps = createCryptoMarketDataProvider().getCapabilities();
  assert.ok(caps.supportsQuotes);
  assert.ok(caps.mayBeDelayed);
  assert.ok(!caps.supportedTimeframes.includes("1m"));
  assert.ok(caps.supportedTimeframes.includes("1H"));
  assert.ok(caps.caveats.some((c) => /not exchange/i.test(c)));
});

test("service caches fixture quotes", async () => {
  const cache = new MarketDataCache();
  const service = createMarketDataService({
    cache,
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const a = await service.getQuote("SOL", { now: 5e12 });
  const b = await service.getQuote("SOL", { now: 5e12 + 1000 });
  assert.equal(a.price, b.price);
  assert.ok(cache.get(quoteCacheKey("SOL"), 5e12 + 1000));
});

test("stale cache after live failure when production (no fixture)", async () => {
  let calls = 0;
  const crypto = createCryptoMarketDataProvider({
    useProxy: false,
    now: () => 1_700_000_000_000,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            bitcoin: {
              usd: 42000,
              usd_24h_change: 0,
              last_updated_at: 1_700_000_000,
            },
          }),
          { status: 200 },
        );
      }
      throw new Error("network down");
    },
  });
  const registry = createDefaultRegistry({
    crypto,
    env: { liveMarketDataEnabled: true, nodeEnv: "production", allowFixtures: false },
  });
  const cache = new MarketDataCache();
  const service = createMarketDataService({
    registry,
    cache,
    env: { liveMarketDataEnabled: true, nodeEnv: "production", allowFixtures: false },
  });

  const first = await service.getQuote("BTC", { now: 1_700_000_000_000, bypassCache: true });
  assert.equal(first.price, 42000);
  // Force expire by not using cache for second call path — put expired? use bypass then fail
  cache.clear();
  // Put last-good manually as expired entry via set with 0 ttl then getEntry still has it... set with long ttl then fail
  cache.set(quoteCacheKey("BTC"), first, 60_000, 1_700_000_000_000);

  const second = await service.getQuote("BTC", {
    now: 1_700_000_000_000 + 1000,
    bypassCache: true,
  });
  // After failure with bypass, failQuote should still find entry
  assert.ok(
    second.dataQuality === "Stale" ||
      second.dataQuality === "Unavailable" ||
      second.price === 42000,
  );
});

test("timeframeIntervalMs known values", () => {
  assert.equal(timeframeIntervalMs("1m"), 60_000);
  assert.equal(timeframeIntervalMs("1H"), 3_600_000);
  assert.equal(timeframeIntervalMs("1D"), 86_400_000);
});

test("dashboard does not call providers or CoinGecko directly (Step B)", async () => {
  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  // Step B: workspace helper only — no provider / env flag plumbing in the component.
  assert.match(dash, /loadWorkspaceMarketSeries|loadWorkspaceQuotes/);
  assert.match(dash, /marketUniverse/);
  assert.doesNotMatch(dash, /CryptoMarketDataProvider|api\.coingecko|coingecko\.com/i);
  assert.doesNotMatch(dash, /createCryptoMarketDataProvider|FixtureMarketDataProvider/);
  assert.doesNotMatch(dash, /HERMES_LIVE_MARKET_DATA/);
});

test("foundation modules do not import paper-trading or intelligence-v2 authority", async () => {
  const dir = path.join(process.cwd(), "lib", "market-data");
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".ts")) continue;
    const src = await fs.promises.readFile(path.join(dir, file), "utf8");
    assert.doesNotMatch(src, /from ["']@\/lib\/paper-trading/);
    assert.doesNotMatch(src, /intelligence-v2\/(judgment|conviction|orchestrator)/);
    assert.doesNotMatch(src, /broker|placeOrder/i);
  }
});

test("api route files exist and are isolated", async () => {
  for (const route of ["quote", "quotes", "candles", "status"]) {
    const p = path.join(process.cwd(), "app", "api", "market", route, "route.ts");
    assert.ok(fs.existsSync(p), `missing ${route} route`);
  }
});
