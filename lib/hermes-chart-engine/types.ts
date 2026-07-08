import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
import type { Candle } from "@/lib/market-data";
import type { HermesVisionLabel } from "@/lib/hermes-vision-types";

export type HermesChartViewport = {
  start: number;
  end: number;
};

export type HermesChartBounds = {
  width: number;
  height: number;
  plot: ChartRect;
  volume: ChartRect | null;
  rsi: ChartRect | null;
  macd: ChartRect | null;
};

export type ChartRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HermesChartIndicators = {
  volume: boolean;
  rsi: boolean;
  macd: boolean;
  ema20: boolean;
  ema50: boolean;
  sma20: boolean;
  vwap: boolean;
};

export type HermesChartSeries = {
  ema20: number[];
  ema50: number[];
  sma20: number[];
  vwap: number[];
  rsi: number[];
  macd: Array<{
    macd: number;
    signal: number;
    histogram: number;
  }>;
  volume: number[];
};

export type HermesChartRenderInput = {
  canvas: HTMLCanvasElement;
  candles: Candle[];
  viewport: HermesChartViewport;
  indicators: HermesChartIndicators;
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  selectedTool: ChartDrawingTool;
  visionLabels: HermesVisionLabel[];
  crosshair: {
    visible: boolean;
    x: number;
    y: number;
  };
  selectedCandleIndex?: number | null;
};

export type HermesChartHit = {
  price: number;
  candleIndex: number;
  time: number;
};
