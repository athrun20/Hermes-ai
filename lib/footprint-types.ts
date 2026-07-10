import type { HermesVisionLabel } from "@/lib/hermes-vision-types";

export type FootprintType =
  | "Accumulation"
  | "Distribution"
  | "Buyer Absorption"
  | "Seller Absorption"
  | "Liquidity Sweep"
  | "Failed Breakout"
  | "Failed Breakdown"
  | "Exhaustion"
  | "Hidden Buying"
  | "Hidden Selling"
  | "Supply Absorbed"
  | "Demand Absorbed"
  | "No clear institutional footprint";

export type FootprintStrength = "Weak" | "Developing" | "Strong";
export type FootprintDirection = "Bullish" | "Bearish" | "Neutral";
export type FootprintConfirmation = "Confirmed" | "Developing" | "Unclear";

export type InstitutionalFootprintResult = {
  type: FootprintType;
  confidence: number;
  strength: FootprintStrength;
  direction: FootprintDirection;
  confirmationStatus: FootprintConfirmation;
  evidence: string[];
  explanation: string;
  riskNote: string;
  suggestedAction: string;
  confirmationNeeded: string;
  confidenceImpact: number;
  chartLabels: HermesVisionLabel[];
};
