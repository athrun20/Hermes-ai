/**
 * Step E — Market data consistency across Hermes surfaces.
 * Score formulas and Learning Engine remain untouched.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildMarketConsistencyReport,
  createHermesMarketDataService,
  loadHermesMarketQuotesSnapshot,
  loadHermesTimeframeCandleMap,
  marksAreConsistent,
  qualityFromSnapshot,
  timeframeCandlesFromMap,
} from "../lib/market-data/index";
import { buildOpportunityScanner } from "../lib/opportunity-scanner";
import { buildMorningBriefing } from "../lib/morning-briefing";
import { evaluatePaperMarketDataAuthority } from "../lib/paper-trading-market-authority";
import { analyzeMultiTimeframeIntelligence } from "../lib/multi-timeframe-engine";
import { marketUniverse } from "../lib/market-universe";
import type { HermesMemorySnapshot } from "../lib/hermes-memory";

const emptyMemory = undefined as HermesMemorySnapshot | undefined;

test("workspace quotes snapshot uses MarketDataService and fixture default", async () => {
  const service = createHermesMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const snapshot = await loadHermesMarketQuotesSnapshot({
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });

  assert.equal(snapshot.source, "market-data-service");
  assert.equal(snapshot.liveMarketDataEnabled, false);
  assert.ok(snapshot.quotes.length >= marketUniverse.length);
  const btc = snapshot.bySymbol.BTC;
  assert.ok(btc);
  assert.equal(btc.quality, "Fixture");
  assert.equal(btc.quote.price, marketUniverse.find((a) => a.symbol === "BTC")?.price);
  assert.equal(snapshot.priceMap.BTC, btc.quote.price);
});

test("workspace multi-timeframe candles load through the same service", async () => {
  const service = createHermesMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const map = await loadHermesTimeframeCandleMap({
    symbol: "ETH",
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });
  const candlesByTimeframe = timeframeCandlesFromMap(map);
  assert.ok((candlesByTimeframe["1H"]?.length ?? 0) > 0);
  assert.ok((candlesByTimeframe["4H"]?.length ?? 0) > 0);
  assert.equal(map["1H"]?.dataQuality.quality, "Fixture");

  const asset = marketUniverse.find((a) => a.symbol === "ETH")!;
  const mtf = analyzeMultiTimeframeIntelligence({
    quote: asset,
    activeTimeframe: "1H",
    drawings: [],
    tradeLevels: {},
    traderMemory: {
      kind: "hermes-memory-snapshot",
      updatedAt: Date.now(),
      trades: [],
      performance: {
        totalTrades: 0,
        winRate: 0,
        averageProfitLoss: 0,
        averageRMultiple: null,
        averageHoldMinutes: 0,
        bestPerformingAsset: "N/A",
        worstPerformingAsset: "N/A",
      },
      behavior: {
        earlyExitsFrequency: 0,
        revengeTradingDetected: false,
        overtradingDetected: false,
        holdingWinnersTooShort: false,
        cuttingLossesTooLate: false,
        emotionalPatterns: [],
      },
      strategyPreference: {
        breakoutTrader: 0,
        reversalTrader: 0,
        scalper: 0,
        swingTrader: 0,
        dominantStyle: "unknown",
      },
      strengths: [],
      weaknesses: [],
      personality: "Developing",
      scores: {
        discipline: 50,
        patience: 50,
        riskManagement: 50,
        emotionalControl: 50,
        overall: 50,
      },
    } as HermesMemorySnapshot,
    traderDna: "Day Trader",
    dailyGoal: "Follow the plan",
    candlesByTimeframe,
  });
  assert.equal(mtf.symbol, "ETH");
  assert.ok(mtf.rows.length >= 5);
});

test("scanner consistency attaches shared market-data refs without changing scores", async () => {
  const service = createHermesMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const snapshot = await loadHermesMarketQuotesSnapshot({
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });

  const without = buildOpportunityScanner({ memory: emptyMemory });
  const withSnap = buildOpportunityScanner({
    memory: emptyMemory,
    marketSnapshot: snapshot,
  });

  assert.equal(without.opportunities.length, withSnap.opportunities.length);
  for (let i = 0; i < without.opportunities.length; i += 1) {
    assert.equal(without.opportunities[i].confidence, withSnap.opportunities[i].confidence);
    assert.equal(without.opportunities[i].strategyScore, withSnap.opportunities[i].strategyScore);
    assert.equal(without.opportunities[i].ticker, withSnap.opportunities[i].ticker);
  }

  assert.equal(withSnap.marketConsistency.source, "market-data-service");
  // NVDA exists in Hermes universe — should resolve a service price
  const nvda = withSnap.marketConsistency.byTicker.NVDA;
  assert.ok(nvda);
  assert.equal(nvda.inHermesUniverse, true);
  assert.equal(nvda.priceSource, "market-data-service");
  assert.equal(nvda.price, snapshot.priceMap.NVDA);
  assert.equal(nvda.quality, "Fixture");
});

test("briefing consistency reuses the same market snapshot join", async () => {
  const service = createHermesMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const snapshot = await loadHermesMarketQuotesSnapshot({
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });
  const briefing = buildMorningBriefing({ marketSnapshot: snapshot });
  assert.equal(briefing.marketConsistency.source, "market-data-service");
  for (const opp of briefing.opportunities) {
    const ref = briefing.marketConsistency.byTicker[opp.ticker];
    assert.ok(ref, `missing consistency for ${opp.ticker}`);
    if (ref.inHermesUniverse) {
      assert.equal(ref.priceSource, "market-data-service");
      assert.ok(ref.price == null || marksAreConsistent(snapshot, opp.ticker, ref.price));
    }
  }
});

test("paper trading mark comes from the shared snapshot and authority", async () => {
  const service = createHermesMarketDataService({
    env: { liveMarketDataEnabled: false, allowFixtures: true },
  });
  const snapshot = await loadHermesMarketQuotesSnapshot({
    service,
    env: { liveMarketDataEnabled: false },
    options: { now: 1_700_000_000_000 },
  });
  const price = snapshot.priceMap.BTC!;
  const quality = qualityFromSnapshot(snapshot, "BTC", "1H");
  assert.ok(quality);
  const authority = evaluatePaperMarketDataAuthority({
    symbol: "BTC",
    price,
    dataQuality: quality,
    purpose: "close",
  });
  assert.equal(authority.allowed, true);
  assert.equal(authority.fillPrice, price);
  assert.ok(marksAreConsistent(snapshot, "BTC", authority.fillPrice!));
});

test("buildMarketConsistencyReport marks unknown tickers honestly", () => {
  const report = buildMarketConsistencyReport(["FAKECOIN"], null);
  assert.equal(report.byTicker.FAKECOIN.priceSource, "none");
  assert.equal(report.byTicker.FAKECOIN.price, null);
  assert.equal(report.byTicker.FAKECOIN.inHermesUniverse, false);
});

test("timeframe-context-builder no longer imports buildMockWorkspaceCandles", async () => {
  const src = await fs.promises.readFile(
    path.join(process.cwd(), "lib", "timeframe-context-builder.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /buildMockWorkspaceCandles/);
  assert.match(src, /candlesByTimeframe/);
});

test("dashboard and paper page consume shared loaders", async () => {
  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  assert.match(dash, /loadHermesMarketQuotesSnapshot/);
  assert.match(dash, /loadHermesTimeframeCandleMap/);
  assert.match(dash, /mtfCandlesByTimeframe|candlesByTimeframe/);

  const paper = await fs.promises.readFile(
    path.join(process.cwd(), "components", "paper-trading-page.tsx"),
    "utf8",
  );
  assert.match(paper, /loadHermesMarketQuotesSnapshot/);
  assert.match(paper, /evaluatePaperMarketDataAuthority/);

  const scanner = await fs.promises.readFile(
    path.join(process.cwd(), "components", "opportunity-scanner-page.tsx"),
    "utf8",
  );
  assert.match(scanner, /loadHermesMarketQuotesSnapshot/);

  const briefing = await fs.promises.readFile(
    path.join(process.cwd(), "components", "morning-briefing-page.tsx"),
    "utf8",
  );
  assert.match(briefing, /loadHermesMarketQuotesSnapshot/);
});

test("consumers module does not import score engines", async () => {
  const src = await fs.promises.readFile(
    path.join(process.cwd(), "lib", "market-data", "consumers.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /reasoning-engine|trade-quality-engine|confidence-engine|hermes-score-engine/);
  assert.doesNotMatch(src, /learning-engine|intelligence-v2/);
});
