/**
 * Step D — Paper trading market data authority tests.
 * Does not change Confidence / Readiness / Score / Learning Engine formulas.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildWorkspaceDataQuality,
  createPendingWorkspaceDataQuality,
} from "../lib/market-data/index";
import {
  evaluatePaperMarketDataAuthority,
  formatPaperAuthorityMessage,
  isPaperExecutableQuality,
  PAPER_EXECUTABLE_QUALITIES,
} from "../lib/paper-trading-market-authority";

const fixtureQuality = buildWorkspaceDataQuality({
  symbol: "BTC",
  timeframe: "1H",
  quoteQuality: "Fixture",
  candleQuality: "Fixture",
  provider: "fixture",
  limitations: ["Fixture data — not a live market feed."],
  liveMarketDataEnabled: false,
});

const delayedQuality = buildWorkspaceDataQuality({
  symbol: "ETH",
  timeframe: "1H",
  quoteQuality: "Delayed",
  candleQuality: "Delayed",
  provider: "coingecko",
  limitations: ["CoinGecko public aggregator."],
  liveMarketDataEnabled: true,
});

const liveQuality = buildWorkspaceDataQuality({
  symbol: "BTC",
  timeframe: "1D",
  quoteQuality: "Live",
  candleQuality: "Live",
  provider: "coingecko",
  liveMarketDataEnabled: true,
});

const unavailableQuality = buildWorkspaceDataQuality({
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

const unsupportedQuality = buildWorkspaceDataQuality({
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

test("normal fixture execution is allowed", () => {
  const result = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 68420.3,
    dataQuality: fixtureQuality,
    purpose: "open",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.code, "OK");
  assert.equal(result.fillPrice, 68420.3);
  assert.equal(result.qualityLabel, "Fixture");
  assert.equal(result.sourceLabel, "Fixture");
  assert.match(result.message, /authorized|Fixture/i);
});

test("pending fixture bootstrap remains executable (default practice path)", () => {
  const pending = createPendingWorkspaceDataQuality("BTC", "1H");
  const result = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 68420.3,
    dataQuality: pending,
  });
  assert.equal(result.allowed, true);
  assert.equal(result.code, "OK");
});

test("live and delayed execution are allowed with valid price", () => {
  const delayed = evaluatePaperMarketDataAuthority({
    symbol: "ETH",
    price: 3700,
    dataQuality: delayedQuality,
  });
  assert.equal(delayed.allowed, true);
  assert.equal(delayed.code, "OK");
  assert.equal(delayed.fillPrice, 3700);
  assert.equal(delayed.sourceLabel, "CoinGecko");

  const live = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 70000,
    dataQuality: liveQuality,
  });
  assert.equal(live.allowed, true);
  assert.equal(live.code, "OK");
  assert.equal(live.fillPrice, 70000);
});

test("unavailable data rejects paper execution with Hermes explanation", () => {
  const result = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 68420,
    dataQuality: unavailableQuality,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, "UNAVAILABLE");
  assert.equal(result.fillPrice, undefined);
  assert.match(result.message, /cannot execute this paper trade/i);
  assert.match(result.whatFailed, /unavailable/i);
  assert.ok(result.whyBlocked.length > 0);
  assert.match(result.whatIsNeeded, /fixture|live|delayed|valid/i);
});

test("unsupported timeframe rejects even if a numeric price is present", () => {
  const result = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 68420,
    dataQuality: unsupportedQuality,
    purpose: "open",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, "UNSUPPORTED_TIMEFRAME");
  assert.match(result.whatFailed, /not supported|5m|timeframe/i);
  assert.match(result.whatIsNeeded, /1H|fixture|supported/i);
  assert.match(result.message, /What failed:.*Why:.*What is needed:/s);
});

test("missing quality snapshot is blocked", () => {
  const result = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 100,
    dataQuality: null,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "MISSING_MARKET_DATA");
});

test("invalid price is blocked even on fixture quality", () => {
  for (const price of [0, -1, NaN, Number.POSITIVE_INFINITY]) {
    const result = evaluatePaperMarketDataAuthority({
      symbol: "BTC",
      price,
      dataQuality: fixtureQuality,
    });
    assert.equal(result.allowed, false, `price ${price} should block`);
    assert.equal(result.code, "INVALID_PRICE");
  }
});

test("stale quality is not executable for paper fills", () => {
  const stale = buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "1H",
    quoteQuality: "Stale",
    candleQuality: "Stale",
    provider: "coingecko",
    liveMarketDataEnabled: true,
  });
  const result = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price: 68000,
    dataQuality: stale,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "QUALITY_NOT_EXECUTABLE");
});

test("executable quality set is Fixture | Live | Delayed only", () => {
  assert.deepEqual([...PAPER_EXECUTABLE_QUALITIES], ["Fixture", "Live", "Delayed"]);
  assert.equal(isPaperExecutableQuality("Fixture"), true);
  assert.equal(isPaperExecutableQuality("Delayed"), true);
  assert.equal(isPaperExecutableQuality("Live"), true);
  assert.equal(isPaperExecutableQuality("Unavailable"), false);
  assert.equal(isPaperExecutableQuality("Stale"), false);
});

test("formatPaperAuthorityMessage is empty on OK and structured when blocked", () => {
  assert.equal(
    formatPaperAuthorityMessage({
      code: "OK",
      whatFailed: "",
      whyBlocked: "",
      whatIsNeeded: "",
    }),
    "",
  );
  const msg = formatPaperAuthorityMessage({
    code: "UNAVAILABLE",
    whatFailed: "A",
    whyBlocked: "B",
    whatIsNeeded: "C",
  });
  assert.match(msg, /cannot execute/i);
  assert.match(msg, /What failed: A/);
  assert.match(msg, /Why: B/);
  assert.match(msg, /What is needed: C/);
});

test("authority module does not import score or learning engines", async () => {
  const src = await fs.promises.readFile(
    path.join(process.cwd(), "lib", "paper-trading-market-authority.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /reasoning-engine|trade-quality-engine|confidence-engine|hermes-score/);
  assert.doesNotMatch(src, /learning-engine|intelligence-v2|smart-chart/);
});

test("dashboard wires market authority into paper execution path", async () => {
  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  assert.match(dash, /evaluatePaperMarketDataAuthority/);
  assert.match(dash, /workspaceDataQuality/);
  assert.match(dash, /fillPrice/);
});
