import type { CoinSymbol } from "@/lib/market-data";
import type { WorkspaceTimeframe } from "@/lib/market-universe";

export type MultiTimeframeDirection =
  | "Strong Bullish"
  | "Bullish"
  | "Neutral"
  | "Bearish"
  | "Strong Bearish";

export type MultiTimeframeStatus =
  | "Strong Alignment"
  | "Constructive"
  | "Mixed"
  | "Conflict"
  | "No Clear Alignment";

export type MultiTimeframePattern =
  | "Full bullish alignment"
  | "Full bearish alignment"
  | "Higher-timeframe bullish / lower-timeframe bearish pullback"
  | "Higher-timeframe bearish / lower-timeframe bullish bounce"
  | "Mixed conditions"
  | "No clear alignment";

export type TimeframeAnalysis = {
  timeframe: WorkspaceTimeframe;
  direction: MultiTimeframeDirection;
  score: number;
  trend: string;
  emaAlignment: "Bullish" | "Bearish" | "Neutral";
  vwapPosition: "Above" | "Below" | "Neutral";
  rsiCondition: "Constructive" | "Stretched" | "Weak" | "Neutral";
  macdCondition: "Bullish" | "Bearish" | "Neutral";
  volumeConfirmation: "Confirmed" | "Fading" | "Neutral";
  marketStructure: "Constructive" | "Weak" | "Range";
  supportResistanceContext: string;
  momentum: "Improving" | "Fading" | "Neutral";
};

export type MultiTimeframeIntelligence = {
  symbol: CoinSymbol;
  activeTimeframe: WorkspaceTimeframe;
  rows: TimeframeAnalysis[];
  alignmentScore: number;
  status: MultiTimeframeStatus;
  pattern: MultiTimeframePattern;
  mentorSummary: string;
  alignmentImpact: number;
  higherTimeframeDirection: MultiTimeframeDirection;
  countertrendWarning: string | null;
};
