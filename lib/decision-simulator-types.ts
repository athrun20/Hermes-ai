import type { CoinSymbol } from "@/lib/market-data";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { PortfolioSnapshot, PositionSide } from "@/lib/paper-trading";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { TradeQualityPlan, TradeQualityResult } from "@/lib/trade-quality-types";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";

export type DecisionSimulationState =
  | "No trade plan"
  | "Incomplete trade plan"
  | "Ready to simulate"
  | "Simulation running"
  | "Simulation complete"
  | "Stale simulation"
  | "Invalid trade plan"
  | "Unsupported data"
  | "Market data unavailable";

export type TraderReason =
  | "Breakout"
  | "Pullback"
  | "Trend continuation"
  | "Reversal"
  | "Momentum"
  | "Mean reversion"
  | "News catalyst"
  | "Support or resistance reaction"
  | "Other";

export type ReasonAlignmentStatus =
  | "Aligned"
  | "Partially aligned"
  | "Misaligned"
  | "Insufficient evidence";

export type ChecklistState = "Passed" | "Warning" | "Failed" | "Not available";

export type DecisionResultState =
  | "Not Ready"
  | "Wait for Confirmation"
  | "Ready With Caution"
  | "High-Quality Setup"
  | "Avoid"
  | "Manage Existing Position";

export type ScenarioStatus = "Modeled estimate" | "Developing" | "Needs confirmation" | "Risk elevated";

export type ScenarioConfidence = "Low" | "Medium" | "High";

export type ScenarioModel = {
  id: "favorable" | "neutral" | "adverse";
  title: string;
  probability: number;
  narrative: string;
  triggerConditions: string[];
  expectedPath: string;
  likelyTargetZone: string;
  likelyInvalidationZone: string;
  expectedTimeHorizon: string;
  confidenceLevel: ScenarioConfidence;
  managementGuidance: string[];
  majorRisk: string;
  sourceEvidence: string[];
  status: ScenarioStatus;
};

export type RiskImpact = {
  positionSize: number;
  dollarRisk: number;
  portfolioRiskPct: number;
  riskReward: number | null;
  targetDistancePct: number | null;
  invalidationDistancePct: number | null;
  riskStatus: "Within plan" | "Elevated" | "Exceeds plan" | "Invalid";
  note: string;
};

export type TradeSummary = {
  symbol: CoinSymbol;
  side: PositionSide;
  entry: number;
  stop: number;
  targets: number[];
  notional: number;
  positionSize: number;
  dollarRisk: number;
  portfolioRiskPct: number;
  riskReward: number | null;
  confidence: number;
  tradeReadiness: number;
  tradeQuality: number;
  traderDnaFit: string;
  timestamp: number;
};

export type ChecklistItem = {
  id: string;
  label: string;
  state: ChecklistState;
  detail: string;
  impact: "High" | "Medium" | "Low";
};

export type DecisionConclusion = {
  state: DecisionResultState;
  conclusion: string;
  primaryReason: string;
  mainBlocker: string;
  confirmationNeeded: string;
  invalidationCondition: string;
  riskNote: string;
};

export type AdjustmentCoaching = {
  entry: string;
  stop: string;
  target: string;
  size: string;
};

export type TraderReasonAlignment = {
  reason: TraderReason;
  status: ReasonAlignmentStatus;
  explanation: string;
};

export type ExpectedValueEstimate = {
  available: boolean;
  valueR: number | null;
  reason: string;
};

export type HistoricalSetupComparison = {
  available: boolean;
  similarSetups: number;
  sampleSize: number;
  note: string;
};

export type DecisionSimulationInput = {
  symbol: CoinSymbol;
  timeframe: string;
  currentPrice: number;
  plan: TradeQualityPlan;
  portfolio: PortfolioSnapshot;
  tradeQuality?: TradeQualityResult;
  reasoning?: ReasoningResult;
  memory?: HermesMemorySnapshot;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
  news?: NewsIntelligenceResult;
  traderReason: TraderReason;
  createdAt?: number;
};

export type DecisionSimulationResult = {
  kind: "hermes-decision-simulation-v1";
  id: string;
  state: DecisionSimulationState;
  stale: boolean;
  staleReasons: string[];
  inputSignature: string;
  missingRequirements: string[];
  validationErrors: string[];
  summary: TradeSummary | null;
  scenarios: ScenarioModel[];
  checklist: ChecklistItem[];
  primaryBlocker: string;
  riskImpact: RiskImpact | null;
  adjustmentCoaching: AdjustmentCoaching | null;
  decision: DecisionConclusion;
  traderReasonAlignment: TraderReasonAlignment;
  expectedValue: ExpectedValueEstimate;
  historicalComparison: HistoricalSetupComparison;
  probabilityNote: string;
  whyHermesReachedThis: string[];
  dataQuality: "Ready" | "Estimated" | "Insufficient" | "Stale";
  createdAt: number;
};

export type DecisionSimulationSnapshot = Pick<
  DecisionSimulationResult,
  | "kind"
  | "id"
  | "inputSignature"
  | "summary"
  | "scenarios"
  | "checklist"
  | "traderReasonAlignment"
  | "decision"
  | "dataQuality"
  | "createdAt"
> & {
  symbol: CoinSymbol;
  timeframe: string;
};
