/**
 * Live Market Data Foundation — Step C data quality awareness tests.
 * Does not change scoring formulas or paper authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildWorkspaceDataQuality,
  createMarketDataService,
  createPendingWorkspaceDataQuality,
  dataQualityTone,
  loadWorkspaceMarketSeries,
  providerDisplayName,
} from "../lib/market-data/index";

test("fixture awareness flags teaching data honestly", () => {
  const q = buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "1H",
    quoteQuality: "Fixture",
    candleQuality: "Fixture",
    provider: "fixture",
    limitations: ["Fixture data — not a live market feed."],
    liveMarketDataEnabled: false,
  });

  assert.equal(q.quality, "Fixture");
  assert.equal(q.statusLabel, "Fixture");
  assert.equal(q.sourceLabel, "Fixture");
  assert.equal(q.isFixture, true);
  assert.equal(q.isLive, false);
  assert.equal(q.isDelayed, false);
  assert.equal(q.isUnavailable, false);
  assert.equal(q.timeframeUnsupported, false);
  assert.match(q.summary, /fixture|teaching|not a live/i);
  assert.equal(q.tone, "muted");
});

test("delayed provider data awareness", () => {
  const q = buildWorkspaceDataQuality({
    symbol: "ETH",
    timeframe: "1D",
    quoteQuality: "Delayed",
    candleQuality: "Delayed",
    provider: "coingecko",
    limitations: ["CoinGecko is a public market-data aggregator."],
    liveMarketDataEnabled: true,
  });

  assert.equal(q.quality, "Delayed");
  assert.equal(q.sourceLabel, "CoinGecko");
  assert.equal(q.isDelayed, true);
  assert.equal(q.isLive, false);
  assert.equal(q.isFixture, false);
  assert.match(q.summary, /delayed|not exchange/i);
  assert.equal(q.tone, "gold");
});

test("live quality awareness", () => {
  const q = buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "1H",
    quoteQuality: "Live",
    candleQuality: "Live",
    provider: "coingecko",
    liveMarketDataEnabled: true,
  });
  assert.equal(q.quality, "Live");
  assert.equal(q.isLive, true);
  assert.equal(q.tone, "mint");
});

test("unavailable data awareness", () => {
  const q = buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "1H",
    quoteQuality: "Unavailable",
    candleQuality: "Unavailable",
    provider: "coingecko",
    error: {
      code: "UNAVAILABLE",
      message: "Provider failed",
      retryable: true,
      provider: "coingecko",
    },
    liveMarketDataEnabled: true,
  });

  assert.equal(q.quality, "Unavailable");
  assert.equal(q.isUnavailable, true);
  assert.equal(q.errorCode, "UNAVAILABLE");
  assert.equal(q.tone, "danger");
  assert.match(q.summary, /unavailable/i);
});

test("unsupported timeframe awareness for live crypto", () => {
  const q = buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "5m",
    quoteQuality: "Delayed",
    candleQuality: "Unavailable",
    provider: "coingecko",
    error: {
      code: "UNSUPPORTED",
      message: "Phase 1 live crypto does not support 1m–30m.",
      retryable: false,
      provider: "coingecko",
    },
    liveMarketDataEnabled: true,
  });

  assert.equal(q.timeframeUnsupported, true);
  assert.equal(q.statusLabel, "Unsupported");
  assert.equal(q.quality, "Unavailable");
  assert.equal(q.isUnavailable, true);
  assert.equal(q.tone, "danger");
  assert.match(q.summary, /timeframe|not supported|unavailable/i);
});

test("stale and partial quality map to caution tone", () => {
  assert.equal(dataQualityTone("Stale"), "gold");
  assert.equal(dataQualityTone("Partial"), "gold");
  const stale = buildWorkspaceDataQuality({
    symbol: "SOL",
    timeframe: "4H",
    quoteQuality: "Stale",
    candleQuality: "Stale",
    provider: "coingecko",
    liveMarketDataEnabled: true,
  });
  assert.equal(stale.isStale, true);
  assert.equal(stale.quality, "Stale");
});

test("providerDisplayName maps known ids", () => {
  assert.equal(providerDisplayName("fixture"), "Fixture");
  assert.equal(providerDisplayName("coingecko"), "CoinGecko");
  assert.equal(providerDisplayName("unknown"), "Unknown");
});

test("pending bootstrap is fixture-labeled", () => {
  const pending = createPendingWorkspaceDataQuality("BTC", "1H");
  assert.equal(pending.isFixture, true);
  assert.equal(pending.provider, "fixture");
});

test("workspace series includes dataQuality awareness object", async () => {
  const service = createMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const series = await loadWorkspaceMarketSeries({
    symbol: "BTC",
    timeframe: "1H",
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });

  assert.ok(series.dataQuality);
  assert.equal(series.dataQuality.quality, "Fixture");
  assert.equal(series.dataQuality.sourceLabel, "Fixture");
  assert.equal(series.dataQuality.candleQuality, series.candleQuality);
  assert.equal(series.dataQuality.quoteQuality, series.quoteQuality);
  // Legacy engine contracts remain free of quality fields.
  assert.equal("dataQuality" in series.quote, false);
  assert.equal("dataQuality" in (series.candles[0] ?? {}), false);
});

test("live unsupported TF series propagates Unsupported awareness", async () => {
  const service = createMarketDataService({
    env: {
      liveMarketDataEnabled: true,
      nodeEnv: "production",
      allowFixtures: false,
    },
  });
  const series = await loadWorkspaceMarketSeries({
    symbol: "BTC",
    timeframe: "5m",
    service,
    env: { liveMarketDataEnabled: true },
    options: { now: 1_700_000_000_000, bypassCache: true },
  });

  assert.equal(series.dataQuality.timeframeUnsupported, true);
  assert.equal(series.dataQuality.statusLabel, "Unsupported");
  assert.notEqual(series.dataQuality.quality, "Live");
  assert.notEqual(series.dataQuality.quality, "Delayed");
});

test("awareness module does not import score or paper engines", async () => {
  const src = await fs.promises.readFile(
    path.join(process.cwd(), "lib", "market-data", "data-quality-awareness.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /reasoning-engine|trade-quality-engine|confidence-engine/);
  assert.doesNotMatch(src, /paper-trading|learning-engine|intelligence-v2/);
});

test("dashboard propagates dataQuality into chart path", async () => {
  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  assert.match(dash, /workspaceDataQuality|setWorkspaceDataQuality/);
  assert.match(dash, /dataQuality=\{workspaceDataQuality\}/);
  assert.match(dash, /createPendingWorkspaceDataQuality/);
});

test("chart hosts minimal data quality indicator", async () => {
  const chart = await fs.promises.readFile(
    path.join(process.cwd(), "components", "workspace", "professional-chart.tsx"),
    "utf8",
  );
  assert.match(chart, /DataQualityIndicator/);
  assert.match(chart, /dataQuality/);
  const indicator = await fs.promises.readFile(
    path.join(process.cwd(), "components", "workspace", "data-quality-indicator.tsx"),
    "utf8",
  );
  assert.match(indicator, /statusLabel|sourceLabel|summary/);
});
