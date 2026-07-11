import type { DecisionSimulationInput, RiskImpact } from "@/lib/decision-simulator-types";

export function buildAdjustmentCoaching({
  input,
  riskImpact,
}: {
  input: DecisionSimulationInput;
  riskImpact: RiskImpact | null;
}) {
  const entry = input.plan.entryPrice ?? input.currentPrice;
  const price = input.currentPrice;
  const entryDistance = price > 0 ? (Math.abs(entry - price) / price) * 100 : 0;

  return {
    entry:
      entryDistance < 0.3
        ? "Entry is close to current price. Confirm structure before reacting."
        : entryDistance > 2
          ? "The revised entry requires patience and a deeper move before practice."
          : "Entry gives the plan room to develop without chasing.",
    stop:
      riskImpact?.invalidationDistancePct && riskImpact.invalidationDistancePct < 0.45
        ? "This stop may sit inside normal noise. Confirm it represents thesis invalidation."
        : "Stop placement gives Hermes a clear invalidation point to evaluate.",
    target:
      riskImpact?.riskReward && riskImpact.riskReward >= 2
        ? "Target creates a disciplined reward profile, but confirmation still matters."
        : "Target may not reward the current risk enough. Improve entry, target, or risk.",
    size:
      riskImpact?.riskStatus === "Exceeds plan"
        ? "This size exceeds conservative paper-risk limits and should require explicit caution."
        : "Position size keeps the lesson focused on process rather than account stress.",
  };
}
