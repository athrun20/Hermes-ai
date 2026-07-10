import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { AssetQuote, CoinSymbol } from "@/lib/market-data";
import { buildHermesVisionContext } from "@/lib/chart-context-builder";
import { buildMockWorkspaceCandles, getMarketAsset, type WorkspaceTimeframe } from "@/lib/market-universe";
import { analyzeWorkspaceSymbol } from "@/lib/symbol-analysis-engine";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";

export const multiTimeframes: WorkspaceTimeframe[] = ["5m", "15m", "1H", "4H", "1D"];

export function buildTimeframeContexts({
  quote,
  drawings,
  tradeLevels,
  traderDna,
  dailyGoal,
}: {
  quote: AssetQuote;
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  traderDna: string;
  dailyGoal: string;
}): Array<{ timeframe: WorkspaceTimeframe; context: HermesVisionContext }> {
  return multiTimeframes.map((timeframe) => {
    const candles = buildMockWorkspaceCandles(quote, timeframe);
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
