import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { CoinSymbol } from "@/lib/market-data";

export type ChartSuggestedAction =
  | "Study Setup"
  | "Wait for Confirmation"
  | "Improve Risk/Reward"
  | "Move Stop Below Support"
  | "Observe Only"
  | "Ready for Decision Review";

export type ChartIntelligenceContextV1 = {
  symbol: CoinSymbol;
  currentPrice: number;
  trendDirection: "Bullish" | "Bearish" | "Neutral";
  ema20?: number;
  ema50?: number;
  vwap?: number;
  rsi?: number;
  macd?: {
    line: number;
    signal: number;
    histogram: number;
  };
  volume: {
    current: number;
    average: number;
    status: "Rising" | "Normal" | "Fading";
  };
  drawings: ChartDrawing[];
  supportLines: ChartDrawing[];
  resistanceLines: ChartDrawing[];
  trendLines: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  riskReward: number | null;
  traderDna: string;
  dailyGoal: string;
};

export type ChartIntelligenceLabel = {
  id: string;
  text: string;
  tone: "mint" | "gold" | "danger" | "muted";
  price?: number;
};

export type ChartIntelligenceResult = {
  kind: "chart-intelligence";
  symbol: CoinSymbol;
  currentInsight: string;
  structureQuality: "Strong" | "Developing" | "Weak";
  riskQuality: "Strong" | "Acceptable" | "Needs Work" | "Undefined";
  confirmationStatus: "Confirmed" | "Developing" | "Missing";
  suggestedAction: ChartSuggestedAction;
  labels: ChartIntelligenceLabel[];
  reasons: string[];
};
