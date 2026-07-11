import type { DecisionSimulationInput, RiskImpact } from "@/lib/decision-simulator-types";

export function calculateScenarioProbabilities({
  input,
  riskImpact,
}: {
  input: DecisionSimulationInput;
  riskImpact: RiskImpact | null;
}): { favorable: number; neutral: number; adverse: number; evidence: string[] } {
  let favorable = 34;
  let neutral = 34;
  let adverse = 32;
  const evidence: string[] = [];
  const confidence = input.reasoning?.confidenceScore ?? input.tradeQuality?.score ?? 55;
  const readiness = input.reasoning?.tradeReadinessScore ?? input.tradeQuality?.planCompleteness ?? 50;

  favorable += (confidence - 55) * 0.24;
  favorable += (readiness - 55) * 0.16;
  adverse -= (confidence - 55) * 0.12;

  if (input.multiTimeframe?.alignmentImpact) {
    favorable += input.multiTimeframe.alignmentImpact * 0.45;
    adverse -= input.multiTimeframe.alignmentImpact * 0.25;
    evidence.push(`Multi-timeframe alignment impact ${signed(input.multiTimeframe.alignmentImpact)}.`);
  }

  if (riskImpact?.riskReward && riskImpact.riskReward >= 2) {
    favorable += 5;
    neutral -= 1;
    evidence.push("Risk/reward clears the 2:1 planning threshold.");
  } else if (riskImpact?.riskReward && riskImpact.riskReward < 1) {
    adverse += 10;
    favorable -= 7;
    evidence.push("Risk/reward is weaker than the planned risk.");
  }

  if (input.news?.urgency === "High") {
    adverse += 8;
    neutral += 2;
    favorable -= 5;
    evidence.push("High-urgency news increases path uncertainty.");
  }

  if (input.footprint?.direction === "Bullish" && input.plan.side === "Long") favorable += 4;
  if (input.footprint?.direction === "Bearish" && input.plan.side === "Short") favorable += 4;
  if (input.footprint?.direction === "Bullish" && input.plan.side === "Short") adverse += 5;
  if (input.footprint?.direction === "Bearish" && input.plan.side === "Long") adverse += 5;

  if (input.tradeQuality?.score && input.tradeQuality.score < 55) {
    adverse += 7;
    favorable -= 5;
    evidence.push("Trade Quality is below the preferred practice zone.");
  }

  return normalizeProbabilities({ favorable, neutral, adverse });
}

export function normalizeProbabilities(raw: {
  favorable: number;
  neutral: number;
  adverse: number;
  evidence?: string[];
}): { favorable: number; neutral: number; adverse: number; evidence: string[] } {
  const clipped = {
    favorable: Math.max(8, raw.favorable),
    neutral: Math.max(8, raw.neutral),
    adverse: Math.max(8, raw.adverse),
  };
  const total = clipped.favorable + clipped.neutral + clipped.adverse;
  const favorable = Math.round((clipped.favorable / total) * 100);
  const neutral = Math.round((clipped.neutral / total) * 100);
  const adverse = Math.max(0, 100 - favorable - neutral);

  return {
    favorable,
    neutral,
    adverse,
    evidence: raw.evidence ?? [],
  };
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}
