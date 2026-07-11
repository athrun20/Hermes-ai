import type { DecisionSimulationInput, RiskImpact, ScenarioModel } from "@/lib/decision-simulator-types";

export function generateScenarios({
  input,
  probabilities,
  riskImpact,
}: {
  input: DecisionSimulationInput;
  probabilities: { favorable: number; neutral: number; adverse: number; evidence: string[] };
  riskImpact: RiskImpact | null;
}): ScenarioModel[] {
  const side = input.plan.side;
  const entry = input.plan.entryPrice ?? input.currentPrice;
  const stop = input.plan.stopLoss ?? entry;
  const target = input.plan.takeProfit ?? entry;
  const directionVerb = side === "Long" ? "holds above" : "rejects below";
  const failureVerb = side === "Long" ? "loses" : "reclaims";
  const rrText = riskImpact?.riskReward ? `${riskImpact.riskReward.toFixed(2)}R` : "unconfirmed R/R";
  const evidence = [
    input.reasoning?.reasoningSummary ?? "Hermes is using current rule-based market evidence.",
    ...(probabilities.evidence.length ? probabilities.evidence : []),
  ].slice(0, 4);

  return [
    {
      id: "favorable",
      title: "Favorable scenario",
      probability: probabilities.favorable,
      narrative: `Price ${directionVerb} the planned entry area, confirmation improves, and the move works toward the target zone.`,
      triggerConditions: input.reasoning?.confirmationConditions.slice(0, 3) ?? [
        "Structure confirms near entry.",
        "Volume expands above average.",
      ],
      expectedPath: `${format(entry)} -> ${format(target)} if confirmation continues.`,
      likelyTargetZone: format(target),
      likelyInvalidationZone: format(stop),
      expectedTimeHorizon: "Current session to next major candle cycle",
      confidenceLevel: getScenarioConfidence(probabilities.favorable),
      managementGuidance: [
        "Consider partial profit at the planned target area.",
        "Do not increase size after an extended move.",
        "Reassess only after structure confirms.",
      ],
      majorRisk: input.news?.riskCaution.active
        ? input.news.riskCaution.message
        : "Momentum may fade before price reaches the full target.",
      sourceEvidence: evidence,
      status: "Modeled estimate",
    },
    {
      id: "neutral",
      title: "Neutral scenario",
      probability: probabilities.neutral,
      narrative: `Price tests the plan but remains range-bound, leaving the thesis alive without enough confirmation.`,
      triggerConditions: [
        "Volume remains near average.",
        "RSI and MACD do not materially expand.",
        "Price holds between entry and invalidation.",
      ],
      expectedPath: `${format(entry)} area churn with incomplete follow-through.`,
      likelyTargetZone: `Partial progress before ${format(target)}`,
      likelyInvalidationZone: format(stop),
      expectedTimeHorizon: "One to three candles on the active timeframe",
      confidenceLevel: getScenarioConfidence(probabilities.neutral),
      managementGuidance: [
        "Avoid chasing while confirmation is incomplete.",
        "Reduce expectations if momentum stays weak.",
        "Let the original invalidation guide the review.",
      ],
      majorRisk: `The plan may consume time without improving beyond ${rrText}.`,
      sourceEvidence: evidence,
      status: "Needs confirmation",
    },
    {
      id: "adverse",
      title: "Adverse scenario",
      probability: probabilities.adverse,
      narrative: `Price ${failureVerb} the key planning level and moves toward the invalidation zone.`,
      triggerConditions: input.reasoning?.invalidationConditions.slice(0, 3) ?? [
        "Entry fails to hold.",
        "Volume confirms against the thesis.",
      ],
      expectedPath: `${format(entry)} -> ${format(stop)} if invalidation appears.`,
      likelyTargetZone: format(stop),
      likelyInvalidationZone: format(stop),
      expectedTimeHorizon: "Can develop quickly if event risk or liquidity changes",
      confidenceLevel: getScenarioConfidence(probabilities.adverse),
      managementGuidance: [
        "Respect the planned invalidation.",
        "Do not average down automatically.",
        "Reassess the thesis after structure failure.",
      ],
      majorRisk: "A weak stop or oversized position can turn a lesson into poor discipline.",
      sourceEvidence: evidence,
      status: "Risk elevated",
    },
  ];
}

function getScenarioConfidence(probability: number) {
  if (probability >= 50) return "High";
  if (probability >= 28) return "Medium";
  return "Low";
}

function format(value: number) {
  return value >= 1000 ? `$${value.toFixed(2)}` : `$${value.toFixed(3)}`;
}
