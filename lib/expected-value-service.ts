import type { ExpectedValueEstimate, RiskImpact, ScenarioModel } from "@/lib/decision-simulator-types";

export function calculateExpectedValue({
  scenarios,
  riskImpact,
  dataQuality,
}: {
  scenarios: ScenarioModel[];
  riskImpact: RiskImpact | null;
  dataQuality: "Ready" | "Estimated" | "Insufficient" | "Stale";
}): ExpectedValueEstimate {
  if (!riskImpact?.riskReward || dataQuality !== "Ready") {
    return {
      available: false,
      valueR: null,
      reason: "Expected value is hidden until probabilities and payoff inputs are sufficiently structured.",
    };
  }

  const favorable = scenarios.find((scenario) => scenario.id === "favorable")?.probability ?? 0;
  const neutral = scenarios.find((scenario) => scenario.id === "neutral")?.probability ?? 0;
  const adverse = scenarios.find((scenario) => scenario.id === "adverse")?.probability ?? 0;
  const valueR = (favorable / 100) * riskImpact.riskReward + (neutral / 100) * 0.25 - (adverse / 100);

  return {
    available: true,
    valueR,
    reason: "Modeled estimate based on current scenario probabilities and planned payoff.",
  };
}
