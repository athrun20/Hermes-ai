import type { DecisionSimulationInput, DecisionSimulationState } from "@/lib/decision-simulator-types";

export function validateSimulationInput(input: DecisionSimulationInput): {
  state: DecisionSimulationState;
  missingRequirements: string[];
  validationErrors: string[];
} {
  const missingRequirements: string[] = [];
  const validationErrors: string[] = [];
  const { plan } = input;

  if (!input.symbol) missingRequirements.push("Symbol");
  if (!plan.side) missingRequirements.push("Direction");
  if (!isPositive(plan.entryPrice)) missingRequirements.push("Entry");
  if (!isPositive(plan.stopLoss)) missingRequirements.push("Stop loss");
  if (!isPositive(plan.takeProfit)) missingRequirements.push("At least one target");
  if (!isPositive(plan.notional)) missingRequirements.push("Position size or risk amount");

  if (!Number.isFinite(input.currentPrice) || input.currentPrice <= 0) {
    validationErrors.push("Market data unavailable.");
  }

  if (missingRequirements.length > 0) {
    return {
      state: "Incomplete trade plan",
      missingRequirements,
      validationErrors,
    };
  }

  const entry = plan.entryPrice as number;
  const stop = plan.stopLoss as number;
  const target = plan.takeProfit as number;

  if (plan.side === "Long" && stop >= entry) {
    validationErrors.push("Long stop must be below entry.");
  }

  if (plan.side === "Long" && target <= entry) {
    validationErrors.push("Long target must be above entry.");
  }

  if (plan.side === "Short" && stop <= entry) {
    validationErrors.push("Short stop must be above entry.");
  }

  if (plan.side === "Short" && target >= entry) {
    validationErrors.push("Short target must be below entry.");
  }

  if (plan.notional > input.portfolio.buyingPower) {
    validationErrors.push("Position size exceeds available buying power.");
  }

  if (validationErrors.some((error) => error.includes("Market data"))) {
    return { state: "Market data unavailable", missingRequirements, validationErrors };
  }

  return {
    state: validationErrors.length > 0 ? "Invalid trade plan" : "Ready to simulate",
    missingRequirements,
    validationErrors,
  };
}

function isPositive(value: number | undefined) {
  return Number.isFinite(value) && Number(value) > 0;
}
