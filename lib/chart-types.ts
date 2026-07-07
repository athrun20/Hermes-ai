import type { CoinSymbol } from "@/lib/market-data";

export type ChartDrawingTool =
  | "none"
  | "crosshair"
  | "horizontal-line"
  | "trend-line"
  | "ray"
  | "rectangle"
  | "support-zone"
  | "resistance-zone"
  | "risk-reward"
  | "text-note"
  | "erase"
  | "entry"
  | "stop"
  | "target";

export type ChartDrawing = {
  id: string;
  symbol: CoinSymbol;
  type: Exclude<ChartDrawingTool, "none" | "crosshair" | "erase" | "entry" | "stop" | "target">;
  price: number;
  createdAt: number;
};

export type ChartTradeLevels = {
  entry?: number;
  stop?: number;
  target?: number;
};
