import type { CoinSymbol } from "@/lib/market-data";

export type HermesScoreCategory =
  | "Trend"
  | "Momentum"
  | "Volume"
  | "Structure"
  | "Risk"
  | "Confirmation"
  | "Trader Fit";

export type HermesScoreLabel =
  | "Elite Setup"
  | "High Quality"
  | "Worth Studying"
  | "Needs Confirmation"
  | "Weak Setup"
  | "Avoid";

export type HermesScoreStatus = "Strong" | "Constructive" | "Developing" | "Weak";

export type HermesScoreBreakdownItem = {
  category: HermesScoreCategory;
  score: number;
  status: HermesScoreStatus;
  reason: string;
};

export type HermesScoreResult = {
  symbol: CoinSymbol | string;
  score: number;
  label: HermesScoreLabel;
  explanation: string;
  breakdown: HermesScoreBreakdownItem[];
};
