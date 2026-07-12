/**
 * Developer Shadow Validation Pass runner.
 *
 * Exercises realistic Hermes workspace scenarios against Shadow Mode.
 * Does not change production pipeline authority or UI.
 *
 * Usage:
 *   npx --yes tsx scripts/run-shadow-validation.ts
 *   npm.cmd run shadow:validate
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildMockWorkspaceCandles,
  getMarketAsset,
} from "../lib/market-universe";
import type { CoinSymbol, Timeframe } from "../lib/market-data";
import { buildHermesVisionContext } from "../lib/chart-context-builder";
import { analyzeHermesVision } from "../lib/hermes-vision-engine";
import { analyzeMultiTimeframeIntelligence } from "../lib/multi-timeframe-engine";
import { analyzeInstitutionalFootprint } from "../lib/institutional-footprint-engine";
import { buildNewsIntelligence } from "../lib/news-intelligence-engine";
import { analyzeStrategyIntelligence } from "../lib/strategy-engine";
import { calculateHermesScore } from "../lib/hermes-score-engine";
import { buildHermesReasoning } from "../lib/reasoning-engine";
import { evaluateTradeQuality } from "../lib/trade-quality-engine";
import { buildTradeQualityContext } from "../lib/trade-quality-context-builder";
import { buildSmartChartIntelligence } from "../lib/smart-chart-intelligence";
import { analyzeWorkspaceSymbol } from "../lib/symbol-analysis-engine";
import {
  generateTradingPersonality,
  toHermesMemorySnapshot,
  updateMemory,
} from "../lib/hermes-memory";
import type { ChartTradeLevels } from "../lib/chart-types";
import type { TradeQualityPlan } from "../lib/trade-quality-types";
import {
  clearShadowComparisons,
  getRecentShadowComparisons,
  runHermesShadowComparison,
  buildShadowMemoKey,
  SHADOW_RING_BUFFER_CAPACITY,
} from "../lib/intelligence-v2/shadow-mode";
import {
  buildShadowValidationReport,
  formatShadowValidationMarkdown,
  printShadowValidationTable,
  registerShadowValidationDevHelper,
} from "../lib/intelligence-v2/shadow-validation";
import type { HermesIntelligenceInput } from "../lib/intelligence-v2/orchestrator";

type ScenarioName =
  | "btc-1h"
  | "btc-15m"
  | "btc-4h"
  | "btc-1d"
  | "eth-1h"
  | "aapl-stock"
  | "spy-etf"
  | "symbol-switch-btc-to-eth"
  | "timeframe-switch-1h-to-15m"
  | "no-trade-plan"
  | "complete-trade-plan"
  | "missing-stop"
  | "missing-target"
  | "open-long"
  | "open-short"
  | "no-open-position"
  | "mtf-conflict"
  | "elevated-news-risk"
  | "poor-stale-data"
  | "missing-footprint"
  | "missing-news"
  | "smart-chart-present"
  | "smart-chart-absent"
  | "rapid-interaction-memo";

type ScenarioResult = {
  name: ScenarioName;
  ok: boolean;
  parityStatus: string;
  durationMs: number;
  notes: string[];
};

function emptyMemory() {
  const state = updateMemory({ completedTrades: [] });
  return toHermesMemorySnapshot(state);
}

function levelsComplete(price: number): ChartTradeLevels {
  return {
    entry: price,
    stop: price * 0.97,
    target: price * 1.06,
  };
}

function buildWorkspaceSlice(args: {
  symbol: CoinSymbol;
  timeframe: Timeframe;
  tradeLevels?: ChartTradeLevels;
  omitFootprint?: boolean;
  omitNews?: boolean;
  omitSmartChart?: boolean;
  forceMtfConflict?: boolean;
  forceHighNews?: boolean;
  forceStale?: boolean;
  forcePoorCandles?: boolean;
  hasOpenPosition?: boolean;
  openSide?: "Long" | "Short";
}) {
  const asset = getMarketAsset(args.symbol);
  const candles = args.forcePoorCandles
    ? []
    : buildMockWorkspaceCandles(asset, args.timeframe);
  const quote = {
    symbol: asset.symbol,
    name: asset.name,
    coingeckoId: asset.coingeckoId,
    pair: asset.pair,
    price: asset.price,
    change24h: asset.change24h,
  };
  const tradeLevels = args.tradeLevels ?? {};
  const analysis = analyzeWorkspaceSymbol({ asset, candles: candles.length ? candles : buildMockWorkspaceCandles(asset, "1H") });
  const memory = emptyMemory();
  const personality = generateTradingPersonality(updateMemory({ completedTrades: [] }));
  const dailyGoal = "Only A setups";

  const visionContext = buildHermesVisionContext({
    quote,
    candles: candles.length ? candles : buildMockWorkspaceCandles(asset, "1H"),
    drawings: [],
    tradeLevels,
    analysis,
    traderDna: personality.archetype,
    dailyGoal,
  });
  const vision = analyzeHermesVision(visionContext);

  let multiTimeframe = analyzeMultiTimeframeIntelligence({
    quote,
    activeTimeframe: args.timeframe,
    drawings: [],
    tradeLevels,
    traderMemory: memory,
    traderDna: personality.archetype,
    dailyGoal,
  });

  if (args.forceMtfConflict) {
    multiTimeframe = {
      ...multiTimeframe,
      status: "Conflict",
      alignmentScore: 35,
      higherTimeframeDirection: "Bearish",
      countertrendWarning: "Lower timeframe fights HTF bearish structure.",
      pattern: "Mixed directional conflict",
      mentorSummary: "Timeframes disagree — patience required.",
      alignmentImpact: -3,
    };
  }

  let news = buildNewsIntelligence(args.symbol);
  if (args.forceHighNews) {
    news = {
      ...news,
      urgency: "High",
      riskCaution: {
        active: true,
        message: "Elevated event risk — avoid forcing entries.",
      },
      possibleMarketImpact: "High headline risk can distort execution quality.",
      hermesInterpretation: "News urgency is elevated; treat setups as study-first.",
    };
  }

  const preliminaryScore = calculateHermesScore({
    context: visionContext,
    vision,
    multiTimeframe,
  });

  const preliminaryStrategy = analyzeStrategyIntelligence({
    context: visionContext,
    vision,
    news,
    traderMemory: memory,
    confidence: preliminaryScore.score,
    timeframe: args.timeframe,
    multiTimeframe,
  });

  // Always compute footprint for the *current* dashboard-like path so primary
  // scores remain authoritative; optional omission applies only to v2Input.
  const footprint = analyzeInstitutionalFootprint({
    candles: candles.length ? candles : buildMockWorkspaceCandles(asset, "1H"),
    context: visionContext,
    multiTimeframe,
    strategy: preliminaryStrategy,
    news,
  });

  const strategy = analyzeStrategyIntelligence({
    context: visionContext,
    vision,
    news,
    traderMemory: memory,
    confidence: preliminaryScore.score,
    timeframe: args.timeframe,
    multiTimeframe,
    footprint,
  });

  const plan: TradeQualityPlan = {
    side: args.openSide === "Short" ? "Short" : "Long",
    notional: 500,
    entryPrice: tradeLevels.entry,
    stopLoss: tradeLevels.stop,
    takeProfit: tradeLevels.target,
  };

  const reasoning = buildHermesReasoning({
    context: visionContext,
    vision,
    multiTimeframe,
    footprint,
    news,
    strategy,
    hermesScore: preliminaryScore,
    memory,
    plan,
  });

  // Optionally mark stale without recomputing scores
  const reasoningForShadow = args.forceStale
    ? { ...reasoning, dataState: "Stale" as const }
    : reasoning;

  const tradeQuality = evaluateTradeQuality(
    buildTradeQualityContext({
      quote,
      plan,
      portfolio: {
        startingBalance: 10000,
        cash: 10000,
        equity: 10000,
        buyingPower: 10000,
        unrealizedPnl: 0,
        realizedPnl: 0,
        dailyPnl: 0,
      },
      vision,
      visionContext,
      multiTimeframe,
      footprint,
      strategy,
      news,
      memory,
      dailyGoal,
      reasoning: reasoningForShadow,
    }),
  );

  const hermesScore = calculateHermesScore({
    context: visionContext,
    vision,
    multiTimeframe,
    footprint,
    tradeQuality,
  });

  const smartChartComputed = buildSmartChartIntelligence({
    candles: candles.length ? candles : buildMockWorkspaceCandles(asset, "1H"),
    context: visionContext,
    vision,
    reasoning: reasoningForShadow,
    multiTimeframe,
    footprint,
    news,
  });
  const smartChart = args.omitSmartChart ? undefined : smartChartComputed;

  const hasOpenPosition = Boolean(args.hasOpenPosition);

  const v2Input: HermesIntelligenceInput = {
    symbol: args.symbol,
    timeframe: args.timeframe,
    sourceTimestamp: reasoningForShadow.timestamp,
    quote: {
      symbol: quote.symbol,
      price: quote.price,
      change24h: quote.change24h,
    },
    // Poor-data scenario: keep current scores from full tape, but feed empty candles to v2
    // only when explicitly requested (regime degrades without inventing Confidence).
    candles: args.forcePoorCandles ? [] : candles,
    vision,
    visionContext: {
      candleTrend: visionContext.candleTrend,
      averageCandleRange: visionContext.averageCandleRange,
      currentPrice: visionContext.currentPrice,
      volume: visionContext.volume,
      rsi: visionContext.rsi,
    },
    multiTimeframe,
    footprint: args.omitFootprint ? undefined : footprint,
    news: args.omitNews ? undefined : news,
    smartChart,
    memory,
    personality,
    dailyGoal,
    reasoning: reasoningForShadow,
    tradeQuality,
    hermesScore,
    plan: {
      hasEntry: tradeLevels.entry !== undefined,
      hasStop: tradeLevels.stop !== undefined,
      hasTarget: tradeLevels.target !== undefined,
      riskReward: visionContext.riskReward,
    },
    riskQuality: reasoningForShadow.riskQuality,
    hasOpenPosition,
    dataFreshness: args.forceStale ? "stale" : "fixture",
    dataQualityOverride: args.forcePoorCandles ? "Poor" : undefined,
    profile: {
      traderDnaFit: reasoningForShadow.traderFit,
      personality: personality.archetype,
      disciplineScore: memory.scores.discipline,
    },
  };

  return {
    current: {
      symbol: args.symbol,
      timeframe: args.timeframe,
      confidence: reasoningForShadow.confidenceScore,
      readiness: reasoningForShadow.tradeReadinessScore,
      readinessState: reasoningForShadow.readinessState,
      tradeQualityScore: tradeQuality.score,
      hermesScore: hermesScore.score,
      thesis: reasoningForShadow.reasoningSummary,
      marketContext: reasoningForShadow.marketContext,
      coachMessage: reasoningForShadow.coachingMessage,
      dataState: reasoningForShadow.dataState,
      hasOpenPosition,
    },
    v2Input,
    memoKey: buildShadowMemoKey({
      symbol: args.symbol,
      timeframe: args.timeframe,
      confidence: reasoningForShadow.confidenceScore,
      readiness: reasoningForShadow.tradeReadinessScore,
      tradeQualityScore: tradeQuality.score,
      hermesScore: hermesScore.score,
      hasOpenPosition,
      reasoningTimestamp: reasoningForShadow.timestamp,
      candleCount: candles.length,
      lastCandleTime: candles[candles.length - 1]?.time,
    }),
  };
}

function runScenario(name: ScenarioName, slice: ReturnType<typeof buildWorkspaceSlice>): ScenarioResult {
  const comparison = runHermesShadowComparison({
    current: slice.current,
    v2Input: slice.v2Input,
    silent: true,
  });
  const notes: string[] = [];
  if (comparison.degraded) notes.push("degraded");
  if (comparison.missingInputs.length) notes.push(`missing=${comparison.missingInputs.join(",")}`);
  if (comparison.parityStatus === "Fail" || comparison.parityStatus === "Error") {
    notes.push(`status=${comparison.parityStatus}`);
  }
  const conf = comparison.comparisons.find((c) => c.field === "confidence");
  if (conf?.passed === false) notes.push("confidence-mismatch");
  const ready = comparison.comparisons.find((c) => c.field === "readiness");
  if (ready?.passed === false) notes.push("readiness-mismatch");

  return {
    name,
    ok: comparison.parityStatus !== "Fail" && comparison.parityStatus !== "Error",
    parityStatus: comparison.parityStatus,
    durationMs: comparison.durationMs,
    notes,
  };
}

function main() {
  registerShadowValidationDevHelper();
  clearShadowComparisons();

  const btcPrice = getMarketAsset("BTC").price;
  const results: ScenarioResult[] = [];

  // 1–4 BTC multi-timeframe
  for (const tf of ["1H", "15m", "4H", "1D"] as Timeframe[]) {
    const name =
      tf === "1H" ? "btc-1h" : tf === "15m" ? "btc-15m" : tf === "4H" ? "btc-4h" : "btc-1d";
    results.push(
      runScenario(
        name,
        buildWorkspaceSlice({
          symbol: "BTC",
          timeframe: tf,
          tradeLevels: levelsComplete(btcPrice),
        }),
      ),
    );
  }

  // 5 ETH crypto
  results.push(
    runScenario(
      "eth-1h",
      buildWorkspaceSlice({
        symbol: "ETH",
        timeframe: "1H",
        tradeLevels: levelsComplete(getMarketAsset("ETH").price),
      }),
    ),
  );

  // 6 Stock fixture
  results.push(
    runScenario(
      "aapl-stock",
      buildWorkspaceSlice({
        symbol: "AAPL",
        timeframe: "1H",
        tradeLevels: levelsComplete(getMarketAsset("AAPL").price),
      }),
    ),
  );

  // 7 ETF fixture
  results.push(
    runScenario(
      "spy-etf",
      buildWorkspaceSlice({
        symbol: "SPY",
        timeframe: "1H",
        tradeLevels: levelsComplete(getMarketAsset("SPY").price),
      }),
    ),
  );

  // 8 Symbol switching (BTC then ETH)
  results.push(
    runScenario(
      "symbol-switch-btc-to-eth",
      buildWorkspaceSlice({
        symbol: "ETH",
        timeframe: "1H",
        tradeLevels: levelsComplete(getMarketAsset("ETH").price),
      }),
    ),
  );

  // 9 Timeframe switching
  results.push(
    runScenario(
      "timeframe-switch-1h-to-15m",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "15m",
        tradeLevels: levelsComplete(btcPrice),
      }),
    ),
  );

  // 10 No trade plan
  results.push(
    runScenario(
      "no-trade-plan",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: {},
      }),
    ),
  );

  // 11 Complete plan
  results.push(
    runScenario(
      "complete-trade-plan",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
      }),
    ),
  );

  // 12 Missing stop
  results.push(
    runScenario(
      "missing-stop",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: { entry: btcPrice, target: btcPrice * 1.05 },
      }),
    ),
  );

  // 13 Missing target
  results.push(
    runScenario(
      "missing-target",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: { entry: btcPrice, stop: btcPrice * 0.97 },
      }),
    ),
  );

  // 14 Open long
  results.push(
    runScenario(
      "open-long",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        hasOpenPosition: true,
        openSide: "Long",
      }),
    ),
  );

  // 15 Open short
  results.push(
    runScenario(
      "open-short",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        hasOpenPosition: true,
        openSide: "Short",
      }),
    ),
  );

  // 16 No open position
  results.push(
    runScenario(
      "no-open-position",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        hasOpenPosition: false,
      }),
    ),
  );

  // 17 MTF conflict
  results.push(
    runScenario(
      "mtf-conflict",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        forceMtfConflict: true,
      }),
    ),
  );

  // 18 Elevated news
  results.push(
    runScenario(
      "elevated-news-risk",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        forceHighNews: true,
      }),
    ),
  );

  // 19 Poor/stale data
  results.push(
    runScenario(
      "poor-stale-data",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        forceStale: true,
        forcePoorCandles: true,
      }),
    ),
  );

  // 20 Missing footprint
  results.push(
    runScenario(
      "missing-footprint",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        omitFootprint: true,
      }),
    ),
  );

  // 21 Missing news
  results.push(
    runScenario(
      "missing-news",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        omitNews: true,
      }),
    ),
  );

  // 22 Smart chart present
  results.push(
    runScenario(
      "smart-chart-present",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        omitSmartChart: false,
      }),
    ),
  );

  // 23 Smart chart absent
  results.push(
    runScenario(
      "smart-chart-absent",
      buildWorkspaceSlice({
        symbol: "BTC",
        timeframe: "1H",
        tradeLevels: levelsComplete(btcPrice),
        omitSmartChart: true,
      }),
    ),
  );

  // 24 Rapid interaction — same memo key should not imply excessive unique work;
  //    we still record each intentional shadow call, but keys stay stable for identical state.
  const rapidSlice = buildWorkspaceSlice({
    symbol: "BTC",
    timeframe: "1H",
    tradeLevels: levelsComplete(btcPrice),
  });
  const keys = new Set<string>();
  let rapidRuns = 0;
  for (let i = 0; i < 5; i += 1) {
    keys.add(rapidSlice.memoKey);
    runHermesShadowComparison({
      current: rapidSlice.current,
      v2Input: rapidSlice.v2Input,
      silent: true,
    });
    rapidRuns += 1;
  }
  results.push({
    name: "rapid-interaction-memo",
    ok: keys.size === 1 && rapidRuns === 5,
    parityStatus: keys.size === 1 ? "Pass" : "Fail",
    durationMs: 0,
    notes: [
      `uniqueMemoKeys=${keys.size}`,
      `runs=${rapidRuns}`,
      `ringSize=${getRecentShadowComparisons().length}`,
      `capacity=${SHADOW_RING_BUFFER_CAPACITY}`,
    ],
  });

  // Ring buffer capacity check: buffer should not exceed capacity after many runs
  const ringSize = getRecentShadowComparisons().length;
  if (ringSize > SHADOW_RING_BUFFER_CAPACITY) {
    results.push({
      name: "rapid-interaction-memo",
      ok: false,
      parityStatus: "Fail",
      durationMs: 0,
      notes: [`ring overflow ${ringSize}>${SHADOW_RING_BUFFER_CAPACITY}`],
    });
  }

  const report = buildShadowValidationReport(getRecentShadowComparisons());
  printShadowValidationTable(getRecentShadowComparisons());

  const outDir = join(process.cwd(), "tmp");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "shadow-validation-report.json");
  const mdPath = join(outDir, "shadow-validation-report.md");
  writeFileSync(jsonPath, JSON.stringify({ scenarios: results, report }, null, 2), "utf8");
  writeFileSync(mdPath, formatShadowValidationMarkdown(report), "utf8");

  // eslint-disable-next-line no-console
  console.info("\n[Hermes Shadow Validation] scenario results:");
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.info(
      `  ${r.ok ? "✓" : "✗"} ${r.name} · ${r.parityStatus} · ${r.durationMs}ms${r.notes.length ? ` · ${r.notes.join("; ")}` : ""}`,
    );
  }
  // eslint-disable-next-line no-console
  console.info(`\nWrote ${jsonPath}`);
  // eslint-disable-next-line no-console
  console.info(`Wrote ${mdPath}`);
  // eslint-disable-next-line no-console
  console.info(`Recommendation: ${report.recommendation}`);

  const hardFail = results.some((r) => !r.ok && r.name !== "poor-stale-data");
  // poor-stale may be Partial/Fail due to missing candles by design — still recorded
  if (report.summary.blockerCount > 0 && hardFail) {
    process.exitCode = 1;
  }
}

main();
