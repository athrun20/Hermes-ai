import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesVisionContext, HermesVisionLabel, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { Candle } from "@/lib/market-data";

export type SmartChartAnnotation = HermesVisionLabel & {
  kind:
    | "structure"
    | "breakout"
    | "retest"
    | "support-resistance"
    | "vwap"
    | "ema"
    | "volume"
    | "liquidity"
    | "zone"
    | "footprint"
    | "momentum"
    | "news";
};

export type SmartChartIntelligenceInput = {
  candles: Candle[];
  context: HermesVisionContext;
  vision: HermesVisionResult;
  reasoning: ReasoningResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  news: NewsIntelligenceResult;
};

export type SmartChartIntelligenceResult = {
  kind: "hermes-smart-chart-intelligence-v1";
  annotations: SmartChartAnnotation[];
  confidenceDelta: number;
  thesisImpact: string;
};
