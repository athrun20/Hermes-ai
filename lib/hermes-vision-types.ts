import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { CoinSymbol } from "@/lib/market-data";

export type HermesVisionAction =
  | "Study Setup"
  | "Wait for Confirmation"
  | "Improve Risk/Reward"
  | "Move Stop Below Support"
  | "Observe Only"
  | "Ready for Decision Review";

export type HermesVisionContext = {
  symbol: CoinSymbol;
  currentPrice: number;
  candleTrend: "Bullish" | "Bearish" | "Neutral";
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
  averageCandleRange: number;
  horizontalLines: ChartDrawing[];
  trendLines: ChartDrawing[];
  supportZones: ChartDrawing[];
  resistanceZones: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  riskReward: number | null;
  distanceFromSupport: number | null;
  distanceFromResistance: number | null;
  traderDna: string;
  dailyGoal: string;
};

export type HermesVisionLabel = {
  id: string;
  text: string;
  tone: "mint" | "gold" | "danger" | "muted";
  price?: number;
  priority: number;
};

export type HermesVisionDimension =
  | "Structure"
  | "Trend"
  | "Momentum"
  | "Volume"
  | "Confirmation"
  | "Risk";

export type HermesVisionDimensionScore = {
  dimension: HermesVisionDimension;
  score: number;
  verdict: "Strong" | "Constructive" | "Developing" | "Weak" | "Undefined";
  reasons: string[];
};

export type HermesVisionResult = {
  kind: "hermes-vision";
  symbol: CoinSymbol;
  primaryInsight: string;
  setupStructureScore: number;
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  riskScore: number;
  confirmationScore: number;
  confidenceAdjustment: number;
  suggestedAction: HermesVisionAction;
  labels: HermesVisionLabel[];
  reasons: string[];
  dimensions: HermesVisionDimensionScore[];
  caution: {
    active: boolean;
    message: string;
  };
};
