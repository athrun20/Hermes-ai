import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { AssetQuote } from "@/lib/market-data";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { TradeQualityContext, TradeQualityPlan } from "@/lib/trade-quality-types";
import type { ReasoningResult } from "@/lib/reasoning-types";

export function buildTradeQualityContext({
  quote,
  plan,
  portfolio,
  vision,
  visionContext,
  multiTimeframe,
  footprint,
  strategy,
  news,
  memory,
  dailyGoal,
  reasoning,
}: {
  quote: AssetQuote;
  plan: TradeQualityPlan;
  portfolio?: PortfolioSnapshot;
  vision: HermesVisionResult;
  visionContext: HermesVisionContext;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  strategy: StrategyIntelligenceResult;
  news: NewsIntelligenceResult;
  memory: HermesMemorySnapshot;
  dailyGoal: string;
  reasoning?: ReasoningResult;
}): TradeQualityContext {
  return {
    symbol: quote.symbol,
    price: quote.price,
    plan,
    portfolio,
    vision,
    visionContext,
    multiTimeframe,
    footprint,
    strategy,
    news,
    memory,
    dailyGoal,
    reasoning,
  };
}
