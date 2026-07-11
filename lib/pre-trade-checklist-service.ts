import type { ChecklistItem, DecisionSimulationInput, RiskImpact } from "@/lib/decision-simulator-types";

export function buildPreTradeChecklist({
  input,
  riskImpact,
  validationErrors,
}: {
  input: DecisionSimulationInput;
  riskImpact: RiskImpact | null;
  validationErrors: string[];
}): ChecklistItem[] {
  const trendAligned = isTrendAligned(input);
  const eventRisk = input.news?.urgency === "High";
  const qualityScore = input.tradeQuality?.score ?? null;

  return [
    {
      id: "plan-complete",
      label: "Trade plan complete",
      state: validationErrors.length === 0 ? "Passed" : "Failed",
      detail: validationErrors[0] ?? "Entry, stop, target, and size are defined.",
      impact: "High",
    },
    {
      id: "trend-aligned",
      label: "Trend aligned",
      state: trendAligned === null ? "Not available" : trendAligned ? "Passed" : "Warning",
      detail: trendAligned === null ? "Trend context is not available." : trendAligned ? "Plan agrees with available trend context." : "Trade direction conflicts with some trend evidence.",
      impact: "High",
    },
    {
      id: "volume-confirmed",
      label: "Volume confirmed",
      state: input.reasoning?.volumeQuality.toLowerCase().includes("weak") ? "Warning" : "Passed",
      detail: input.reasoning?.volumeQuality ?? "Volume evidence is estimated from mock chart context.",
      impact: "Medium",
    },
    {
      id: "risk-reward",
      label: "Risk/reward acceptable",
      state: riskImpact?.riskReward === null ? "Failed" : (riskImpact?.riskReward ?? 0) >= 2 ? "Passed" : "Warning",
      detail: riskImpact?.riskReward ? `${riskImpact.riskReward.toFixed(2)}R planned.` : "Risk/reward is not valid yet.",
      impact: "High",
    },
    {
      id: "position-size",
      label: "Position size within limits",
      state: riskImpact?.riskStatus === "Exceeds plan" ? "Warning" : riskImpact?.riskStatus === "Invalid" ? "Failed" : "Passed",
      detail: riskImpact ? riskImpact.note : "Position risk cannot be calculated.",
      impact: "High",
    },
    {
      id: "event-risk",
      label: "Event risk acceptable",
      state: eventRisk ? "Warning" : "Passed",
      detail: input.news?.riskCaution.active
        ? input.news.riskCaution.message
        : "No high-urgency mock catalyst is blocking the plan.",
      impact: eventRisk ? "High" : "Low",
    },
    {
      id: "trader-fit",
      label: "Trader DNA fit acceptable",
      state: qualityScore === null ? "Not available" : qualityScore >= 60 ? "Passed" : "Warning",
      detail: input.memory?.personality
        ? `Current fit is checked against ${input.memory.personality}.`
        : "Hermes has limited completed-trade history for personal fit.",
      impact: "Medium",
    },
  ];
}

export function getPrimaryBlocker(checklist: ChecklistItem[]) {
  const failed = checklist.find((item) => item.state === "Failed" && item.impact === "High");
  if (failed) return failed.detail;
  const warning = checklist.find((item) => item.state === "Warning" && item.impact === "High");
  if (warning) return warning.detail;
  return "No primary blocker. The trade still requires execution discipline.";
}

function isTrendAligned(input: DecisionSimulationInput) {
  const direction = input.multiTimeframe?.higherTimeframeDirection;
  if (!direction) return null;
  if (input.plan.side === "Long") return direction.includes("Bullish");
  return direction.includes("Bearish");
}
