import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { AssetQuote, Candle, CoinSymbol } from "@/lib/market-data";
import { buildHermesVisionContext } from "@/lib/chart-context-builder";
import { getMarketAsset, type WorkspaceTimeframe } from "@/lib/market-universe";
import { HERMES_MULTI_TIMEFRAMES } from "@/lib/market-data/consumers";
import { analyzeWorkspaceSymbol } from "@/lib/symbol-analysis-engine";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";

/** @deprecated Prefer HERMES_MULTI_TIMEFRAMES from market-data/consumers. */
export const multiTimeframes: WorkspaceTimeframe[] = HERMES_MULTI_TIMEFRAMES;

export function buildTimeframeContexts({
  quote,
  drawings,
  tradeLevels,
  traderDna,
  dailyGoal,
  candlesByTimeframe,
}: {
  quote: AssetQuote;
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  traderDna: string;
  dailyGoal: string;
  /**
   * Step E: candles from MarketDataService (via loadHermesTimeframeCandleMap).
   * When provided, replaces the former independent mock builder path.
   */
  candlesByTimeframe?: Partial<Record<WorkspaceTimeframe, Candle[]>>;
}): Array<{ timeframe: WorkspaceTimeframe; context: HermesVisionContext }> {
  return multiTimeframes.map((timeframe) => {
    // Prefer service-backed candles; empty series if not yet loaded (honest, not silent mock).
    const candles = candlesByTimeframe?.[timeframe] ?? [];
    const analysis = analyzeWorkspaceSymbol({
      asset: getMarketAsset(quote.symbol as CoinSymbol),
      candles,
    });

    return {
      timeframe,
      context: buildHermesVisionContext({
        quote,
        candles,
        drawings,
        tradeLevels,
        analysis,
        traderDna,
        dailyGoal,
      }),
    };
  });
}
