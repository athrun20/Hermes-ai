import type { CoinSymbol } from "@/lib/market-data";

export type ChartDrawingTool =
  | "none"
  | "horizontal-line"
  | "trend-line"
  | "support-zone"
  | "resistance-zone"
  | "entry"
  | "stop"
  | "target";

export type ChartDrawing = {
  id: string;
  symbol: CoinSymbol;
  type: Exclude<ChartDrawingTool, "none" | "entry" | "stop" | "target">;
  price: number;
  createdAt: number;
};

export type ChartTradeLevels = {
  entry?: number;
  stop?: number;
  target?: number;
};
