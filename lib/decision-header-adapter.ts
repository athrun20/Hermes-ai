import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";

export type DecisionHeaderState =
  | "Observe"
  | "Wait for Confirmation"
  | "Prepare"
  | "Ready With Caution"
  | "High-Quality Setup"
  | "Avoid"
  | "Manage Existing Position";

export type DecisionHeaderViewModel = {
  decisionState: DecisionHeaderState;
  marketState: string;
  bias: "Bullish" | "Bearish" | "Neutral";
  opinion: string;
  nextAction: string;
  primaryBlocker: string;
  confidence: number;
  readiness: number;
  tradeQuality: number;
  updatedAt: number;
};

export function buildDecisionHeaderView({
  reasoning,
  vision,
  strategy,
  tradeQuality,
}: {
  reasoning?: ReasoningResult;
  vision: HermesVisionResult;
  strategy: StrategyIntelligenceResult;
  tradeQuality?: TradeQualityResult;
}): DecisionHeaderViewModel {
  const confidence = Math.round(reasoning?.confidenceScore ?? 50 + vision.confidenceAdjustment);
  const readiness = Math.round(reasoning?.tradeReadinessScore ?? Math.max(0, Math.min(100, vision.confirmationScore)));
  const quality = Math.round(tradeQuality?.score ?? Math.max(0, Math.min(100, (vision.setupStructureScore + vision.riskScore + vision.confirmationScore) / 3)));
  const primaryBlocker =
    reasoning?.readinessBlockers[0] ??
    tradeQuality?.weaknesses[0] ??
    strategy.currentStrategy.riskNotes[0] ??
    "Confirmation is still developing.";
  const nextAction =
    reasoning?.confirmationConditions[0] ??
    strategy.currentStrategy.nextConfirmation ??
    "Wait for confirmation before practicing risk.";

  return {
    decisionState: mapDecisionState({ reasoning, quality, readiness, visionAction: vision.suggestedAction }),
    marketState: reasoning?.marketContext ?? strategy.currentStrategy.type,
    bias: inferBias(reasoning?.marketContext ?? vision.primaryInsight),
    opinion: buildOpinion({ reasoning, vision, strategy, primaryBlocker }),
    nextAction,
    primaryBlocker,
    confidence,
    readiness,
    tradeQuality: quality,
    updatedAt: reasoning?.timestamp ?? Date.now(),
  };
}

function mapDecisionState({
  reasoning,
  quality,
  readiness,
  visionAction,
}: {
  reasoning?: ReasoningResult;
  quality: number;
  readiness: number;
  visionAction: HermesVisionResult["suggestedAction"];
}): DecisionHeaderState {
  if (reasoning?.recommendedAction === "Manage Existing Position") return "Manage Existing Position";
  if (reasoning?.recommendedAction === "Avoid" || quality < 40) return "Avoid";
  if (readiness >= 82 && quality >= 78) return "High-Quality Setup";
  if (readiness >= 66 && quality >= 58) return "Ready With Caution";
  if (reasoning?.recommendedAction === "Prepare" || visionAction === "Ready for Decision Review") return "Prepare";
  if (reasoning?.recommendedAction === "Validate" || readiness >= 48) return "Wait for Confirmation";
  return "Observe";
}

function inferBias(text: string): DecisionHeaderViewModel["bias"] {
  const value = text.toLowerCase();
  if (value.includes("bull") || value.includes("uptrend") || value.includes("constructive")) return "Bullish";
  if (value.includes("bear") || value.includes("downtrend") || value.includes("weak")) return "Bearish";
  return "Neutral";
}

function buildOpinion({
  reasoning,
  vision,
  strategy,
  primaryBlocker,
}: {
  reasoning?: ReasoningResult;
  vision: HermesVisionResult;
  strategy: StrategyIntelligenceResult;
  primaryBlocker: string;
}) {
  if (reasoning?.reasoningSummary) return trimSentence(reasoning.reasoningSummary);

  return trimSentence(
    `${vision.primaryInsight} ${strategy.currentStrategy.type} remains the active study framework, but ${primaryBlocker.toLowerCase()}`,
  );
}

function trimSentence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 180) return cleaned;
  return `${cleaned.slice(0, 177).trim()}...`;
}
