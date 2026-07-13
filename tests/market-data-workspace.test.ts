/**
 * Live Market Data Foundation — Step B workspace integration tests.
 * Workspace loads through MarketDataService; engines receive legacy contracts.
 * No network required (fixture / injected providers).
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  createDefaultRegistry,
  createMarketDataService,
  createWorkspaceMarketDataService,
  isLiveCryptoTimeframeSupported,
  loadWorkspaceMarketSeries,
  loadWorkspaceQuotes,
  marketCandleSeriesToLegacyCandles,
  marketQuoteToAssetQuote,
  notifyWorkspaceSelectionChanged,
  type AssetQuote,
  type Candle,
} from "../lib/market-data/index";
import { marketUniverse } from "../lib/market-universe";
import { analyzeMarket } from "../lib/market-data/legacy";

test("workspace series loads through MarketDataService in fixture mode", async () => {
  const service = createWorkspaceMarketDataService({
    env: { liveMarketDataEnabled: false, nodeEnv: "test", allowFixtures: true },
  });
  const series = await loadWorkspaceMarketSeries({
    symbol: "BTC",
    timeframe: "1H",
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });

  assert.equal(series.liveMarketDataEnabled, false);
  assert.equal(series.quoteQuality, "Fixture");
  assert.equal(series.candleQuality, "Fixture");
  assert.equal(series.provider, "fixture");
  assert.ok(series.candles.length > 0);
  assert.equal(series.quote.symbol, "BTC");
  assert.ok(Number.isFinite(series.quote.price));
  assert.ok(series.quote.price > 0);
});

test("fixture mode quote prices match marketUniverse catalog", async () => {
  const service = createMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const result = await loadWorkspaceQuotes({
    symbols: ["BTC", "ETH", "AAPL", "SPY"],
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });

  for (const quote of result.quotes) {
    const catalog = marketUniverse.find((a) => a.symbol === quote.symbol);
    assert.ok(catalog, `missing catalog ${quote.symbol}`);
    assert.equal(quote.price, catalog.price);
    assert.equal(quote.change24h, catalog.change24h);
    assert.equal(result.qualities[quote.symbol], "Fixture");
  }
});

test("intelligence engines receive legacy AssetQuote and Candle contracts", async () => {
  const service = createMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const series = await loadWorkspaceMarketSeries({
    symbol: "ETH",
    timeframe: "4H",
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });

  assertLegacyQuote(series.quote);
  assertLegacyCandles(series.candles);

  const analysis = analyzeMarket(series.quote, series.candles);
  assert.ok(["Bullish", "Bearish", "Neutral"].includes(analysis.bias));
  assert.ok(Number.isFinite(analysis.confidence));
});

test("compat adapters preserve engine-facing shapes from service payloads", async () => {
  const service = createMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const rawQuote = await service.getQuote("SOL", { now: 1_700_000_000_000 });
  const rawSeries = await service.getCandles("SOL", "1D", undefined, {
    now: 1_700_000_000_000,
  });

  const quote = marketQuoteToAssetQuote(rawQuote);
  const candles = marketCandleSeriesToLegacyCandles(rawSeries);
  assertLegacyQuote(quote);
  assertLegacyCandles(candles);
  // No dataQuality field on legacy contracts — engines stay unchanged.
  assert.equal("dataQuality" in quote, false);
  assert.equal("dataQuality" in (candles[0] ?? {}), false);
});

test("live-enabled unsupported crypto timeframe stays honest (not silent fixture live)", async () => {
  const registry = createDefaultRegistry({
    env: { liveMarketDataEnabled: true, nodeEnv: "production", allowFixtures: false },
  });
  const service = createMarketDataService({
    registry,
    env: { liveMarketDataEnabled: true, nodeEnv: "production", allowFixtures: false },
  });

  assert.equal(isLiveCryptoTimeframeSupported("5m"), false);

  const series = await loadWorkspaceMarketSeries({
    symbol: "BTC",
    timeframe: "5m",
    service,
    env: { liveMarketDataEnabled: true },
    options: { now: 1_700_000_000_000, bypassCache: true },
  });

  assert.equal(series.liveMarketDataEnabled, true);
  assert.notEqual(series.candleQuality, "Live");
  assert.notEqual(series.candleQuality, "Delayed");
  // Honest empty/unavailable path — do not invent live fine bars.
  assert.equal(series.candles.length, 0);
  assert.equal(series.candleQuality, "Unavailable");
  assert.ok(
    series.limitations.some((n) => /does not support|unsupported|Phase 1/i.test(n)) ||
      series.error?.code === "UNSUPPORTED",
  );
});

test("stocks remain fixture even when live flag is on", async () => {
  const service = createMarketDataService({
    env: { liveMarketDataEnabled: true, allowFixtures: true },
  });
  const series = await loadWorkspaceMarketSeries({
    symbol: "AAPL",
    timeframe: "1H",
    service,
    env: { liveMarketDataEnabled: true },
    options: { now: 1_700_000_000_000 },
  });
  assert.equal(series.provider, "fixture");
  assert.equal(series.candleQuality, "Fixture");
  assert.ok(series.candles.length > 0);
});

test("notifyWorkspaceSelectionChanged bumps generation", () => {
  const service = createMarketDataService();
  const a = notifyWorkspaceSelectionChanged(service);
  const b = notifyWorkspaceSelectionChanged(service);
  assert.ok(b > a);
});

test("dashboard wires through workspace helper, not providers or CoinGecko", async () => {
  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  assert.match(dash, /loadWorkspaceMarketSeries/);
  assert.match(dash, /loadWorkspaceQuotes/);
  assert.doesNotMatch(dash, /CryptoMarketDataProvider|api\.coingecko|coingecko\.com/i);
  assert.doesNotMatch(dash, /createCryptoMarketDataProvider|FixtureMarketDataProvider/);
  // Direct mock builder no longer owns the workspace candle path.
  assert.doesNotMatch(dash, /buildMockWorkspaceCandles/);
});

test("React workspace components do not call providers directly", async () => {
  const workspaceDir = path.join(process.cwd(), "components", "workspace");
  const files = await fs.promises.readdir(workspaceDir);
  for (const file of files) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
    const src = await fs.promises.readFile(path.join(workspaceDir, file), "utf8");
    assert.doesNotMatch(src, /CryptoMarketDataProvider|api\.coingecko|coingecko\.com/i);
    assert.doesNotMatch(src, /createCryptoMarketDataProvider/);
  }
});

function assertLegacyQuote(quote: AssetQuote) {
  assert.equal(typeof quote.symbol, "string");
  assert.equal(typeof quote.name, "string");
  assert.equal(typeof quote.price, "number");
  assert.equal(typeof quote.change24h, "number");
  assert.ok(quote.pair.endsWith("/USD"));
}

function assertLegacyCandles(candles: Candle[]) {
  for (const c of candles) {
    assert.equal(typeof c.time, "number");
    assert.equal(typeof c.open, "number");
    assert.equal(typeof c.high, "number");
    assert.equal(typeof c.low, "number");
    assert.equal(typeof c.close, "number");
    // Legacy chart candle: seconds or ms numeric time only — no quality on bar.
    assert.equal("dataQuality" in c, false);
    assert.equal("provider" in c, false);
  }
}
