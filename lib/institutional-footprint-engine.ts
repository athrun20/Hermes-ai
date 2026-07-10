import type { Candle } from "@/lib/market-data";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import { buildFootprintChartLabels } from "@/lib/footprint-chart-labels";
import { calculateFootprintConfidenceImpact } from "@/lib/footprint-confidence-impact";
import { buildFootprintEvidenceState } from "@/lib/footprint-evidence-builder";
import { matchFootprintRules } from "@/lib/footprint-rules";
import type { FootprintStrength, InstitutionalFootprintResult } from "@/lib/footprint-types";

export function analyzeInstitutionalFootprint({
  candles,
  context,
  multiTimeframe,
  strategy,
  news,
}: {
  candles: Candle[];
  context: HermesVisionContext;
  multiTimeframe: MultiTimeframeIntelligence;
  strategy: StrategyIntelligenceResult;
  news: NewsIntelligenceResult;
}): InstitutionalFootprintResult {
  const state = buildFootprintEvidenceState(candles, context);
  const match = matchFootprintRules(state);
  const adjustedConfidence = clamp(
    match.baseConfidence +
      match.evidence.length * 5 +
      (news.urgency === "High" ? -4 : 0) +
      (multiTimeframe.status === "Strong Alignment" ? 4 : 0),
  );
  const partial: Pick<InstitutionalFootprintResult, "type" | "direction" | "confidence"> = {
    type: match.type,
    direction: match.direction,
    confidence: adjustedConfidence,
  };
  const confidenceImpact = calculateFootprintConfidenceImpact({
    footprint: partial,
    multiTimeframe,
    strategy,
  });

  return {
    type: match.type,
    confidence: adjustedConfidence,
    strength: getStrength(adjustedConfidence),
    direction: match.direction,
    confirmationStatus:
      match.type === "No clear institutional footprint"
        ? "Unclear"
        : adjustedConfidence >= 78
          ? "Confirmed"
          : "Developing",
    evidence: match.evidence.slice(0, 5),
    explanation: buildExplanation(match.type, match.evidence),
    riskNote: buildRiskNote(match.type),
    suggestedAction: buildSuggestedAction(match.type),
    confirmationNeeded: buildConfirmationNeeded(match.type),
    confidenceImpact,
    chartLabels: buildFootprintChartLabels({ footprint: partial, context }),
  };
}

function buildExplanation(type: InstitutionalFootprintResult["type"], evidence: string[]) {
  if (type === "No clear institutional footprint") {
    return "Hermes does not see enough evidence to responsibly label institutional behavior yet.";
  }
  return `Hermes suspects ${type.toLowerCase()} because ${evidence.slice(0, 3).join(", ").toLowerCase()}. Confirmation is still required.`;
}

function buildRiskNote(type: InstitutionalFootprintResult["type"]) {
  if (["Distribution", "Failed Breakout", "Hidden Selling", "Demand Absorbed"].includes(type)) {
    return "This footprint can conflict with long plans. Reduce size or wait for confirmation.";
  }
  if (["Accumulation", "Buyer Absorption", "Failed Breakdown", "Supply Absorbed"].includes(type)) {
    return "This footprint can support long ideas, but only after price confirms structure.";
  }
  if (type === "Exhaustion" || type === "Liquidity Sweep") {
    return "This footprint often creates noisy reversals. Avoid assuming direction too early.";
  }
  return "Footprint evidence is unclear. Let price, volume, and structure provide more proof.";
}

function buildSuggestedAction(type: InstitutionalFootprintResult["type"]) {
  if (type === "No clear institutional footprint") return "Observe Only";
  if (["Failed Breakout", "Distribution", "Exhaustion"].includes(type)) return "Wait for Confirmation";
  if (["Buyer Absorption", "Supply Absorbed", "Accumulation"].includes(type)) return "Study Setup";
  return "Improve Plan";
}

function buildConfirmationNeeded(type: InstitutionalFootprintResult["type"]) {
  if (["Buyer Absorption", "Failed Breakdown", "Supply Absorbed"].includes(type)) {
    return "Close above the prior swing high with expanding volume.";
  }
  if (["Seller Absorption", "Failed Breakout", "Distribution"].includes(type)) {
    return "Failed reclaim or close below support with continued participation.";
  }
  if (type === "Liquidity Sweep") return "Wait for acceptance back inside structure before planning risk.";
  if (type === "Exhaustion") return "Wait for a clean reversal or continuation candle after the exhaustion move.";
  return "Wait for multiple confirming clues before assigning footprint meaning.";
}

function getStrength(confidence: number): FootprintStrength {
  if (confidence >= 78) return "Strong";
  if (confidence >= 56) return "Developing";
  return "Weak";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
