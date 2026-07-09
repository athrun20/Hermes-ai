export type StrategyType =
  | "Trend Pullback"
  | "Momentum Breakout"
  | "Range Trading"
  | "Trend Continuation"
  | "Reversal"
  | "Support Bounce"
  | "Resistance Rejection"
  | "VWAP Reclaim"
  | "Opening Range Breakout"
  | "Consolidation"
  | "No Valid Strategy";

export type StrategyQuality = "Excellent" | "Strong" | "Developing" | "Weak";

export type StrategySignal = {
  type: StrategyType;
  score: number;
  quality: StrategyQuality;
  whyItFits: string[];
  nextConfirmation: string;
  riskNotes: string[];
  traderDnaFit: "Aligned" | "Neutral" | "Poor Fit";
};

export type StrategyIntelligenceResult = {
  currentStrategy: StrategySignal;
  strategies: StrategySignal[];
};
