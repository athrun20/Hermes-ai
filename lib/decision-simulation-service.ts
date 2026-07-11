import type {
  DecisionConclusion,
  DecisionSimulationInput,
  DecisionSimulationResult,
  DecisionSimulationState,
  TradeSummary,
} from "@/lib/decision-simulator-types";
import { calculateExpectedValue } from "@/lib/expected-value-service";
import { findHistoricalSetupComparison } from "@/lib/historical-setup-adapter";
import { buildPreTradeChecklist, getPrimaryBlocker } from "@/lib/pre-trade-checklist-service";
import { calculateRiskImpact } from "@/lib/risk-impact-service";
import { generateScenarios } from "@/lib/scenario-generation-service";
import { calculateScenarioProbabilities } from "@/lib/scenario-probability-service";
import { buildAdjustmentCoaching } from "@/lib/trade-adjustment-impact-service";
import { validateSimulationInput } from "@/lib/trade-plan-validation-service";
import { evaluateTraderReasonAlignment } from "@/lib/trader-reason-alignment-service";

export function buildDecisionSimulation(input: DecisionSimulationInput): DecisionSimulationResult {
  const createdAt = input.createdAt ?? Date.now();
  const validation = validateSimulationInput(input);
  const inputSignature = buildSimulationSignature(input);
  const canModel = validation.state === "Ready to simulate";
  const entry = input.plan.entryPrice ?? input.currentPrice;
  const stop = input.plan.stopLoss ?? entry;
  const target = input.plan.takeProfit ?? entry;
  const riskImpact = canModel
    ? calculateRiskImpact({
        entry,
        stop,
        target,
        notional: input.plan.notional,
        equity: input.portfolio.equity,
        side: input.plan.side,
      })
    : null;
  const probabilities = canModel
    ? calculateScenarioProbabilities({ input, riskImpact })
    : { favorable: 0, neutral: 0, adverse: 0, evidence: [] };
  const scenarios = canModel ? generateScenarios({ input, probabilities, riskImpact }) : [];
  const checklist = buildPreTradeChecklist({
    input,
    riskImpact,
    validationErrors: validation.validationErrors,
  });
  const primaryBlocker = getPrimaryBlocker(checklist);
  const dataQuality = getDataQuality(input, validation.state);
  const decision = buildDecisionConclusion({
    state: validation.state,
    input,
    riskImpact,
    primaryBlocker,
  });
  const traderReasonAlignment = evaluateTraderReasonAlignment(input);
  const expectedValue = calculateExpectedValue({ scenarios, riskImpact, dataQuality });
  const historicalComparison = findHistoricalSetupComparison(input.memory);
  const summary = canModel
    ? buildTradeSummary({
        input,
        riskImpact,
        createdAt,
      })
    : null;

  return {
    kind: "hermes-decision-simulation-v1",
    id: `${createdAt}-${input.symbol}-${input.plan.side}`,
    state: canModel ? "Simulation complete" : validation.state,
    stale: false,
    staleReasons: [],
    inputSignature,
    missingRequirements: validation.missingRequirements,
    validationErrors: validation.validationErrors,
    summary,
    scenarios,
    checklist,
    primaryBlocker,
    riskImpact,
    adjustmentCoaching: canModel ? buildAdjustmentCoaching({ input, riskImpact }) : null,
    decision,
    traderReasonAlignment,
    expectedValue,
    historicalComparison,
    probabilityNote:
      "Scenario probabilities are modeled estimates based on current market evidence and are not guarantees.",
    whyHermesReachedThis: buildWhyHermesReachedThis(input, primaryBlocker, riskImpact),
    dataQuality,
    createdAt,
  };
}

export function markSimulationStale(
  simulation: DecisionSimulationResult | null,
  input: DecisionSimulationInput,
): DecisionSimulationResult | null {
  if (!simulation) return null;

  const nextSignature = buildSimulationSignature(input);
  if (nextSignature === simulation.inputSignature) return simulation;

  return {
    ...simulation,
    state: "Stale simulation",
    stale: true,
    staleReasons: getStaleReasons(simulation.inputSignature, nextSignature),
  };
}

export function buildSimulationSignature(input: DecisionSimulationInput) {
  const plan = input.plan;
  return [
    input.symbol,
    input.timeframe,
    Math.round(input.currentPrice * 100),
    plan.side,
    Math.round((plan.entryPrice ?? 0) * 100),
    Math.round((plan.stopLoss ?? 0) * 100),
    Math.round((plan.takeProfit ?? 0) * 100),
    Math.round(plan.notional * 100),
    input.news?.urgency ?? "none",
    input.reasoning?.marketStructure ?? "none",
    Math.round(input.reasoning?.confidenceScore ?? 0),
    Math.round(input.reasoning?.tradeReadinessScore ?? 0),
  ].join("|");
}

function buildTradeSummary({
  input,
  riskImpact,
  createdAt,
}: {
  input: DecisionSimulationInput;
  riskImpact: NonNullable<ReturnType<typeof calculateRiskImpact>> | null;
  createdAt: number;
}): TradeSummary {
  return {
    symbol: input.symbol,
    side: input.plan.side,
    entry: input.plan.entryPrice as number,
    stop: input.plan.stopLoss as number,
    targets: [input.plan.takeProfit as number],
    notional: input.plan.notional,
    positionSize: riskImpact?.positionSize ?? 0,
    dollarRisk: riskImpact?.dollarRisk ?? 0,
    portfolioRiskPct: riskImpact?.portfolioRiskPct ?? 0,
    riskReward: riskImpact?.riskReward ?? null,
    confidence: input.reasoning?.confidenceScore ?? input.tradeQuality?.score ?? 0,
    tradeReadiness: input.reasoning?.tradeReadinessScore ?? 0,
    tradeQuality: input.tradeQuality?.score ?? 0,
    traderDnaFit: input.memory?.personality ?? "Learning profile",
    timestamp: createdAt,
  };
}

function buildDecisionConclusion({
  state,
  input,
  riskImpact,
  primaryBlocker,
}: {
  state: DecisionSimulationState;
  input: DecisionSimulationInput;
  riskImpact: ReturnType<typeof calculateRiskImpact> | null;
  primaryBlocker: string;
}): DecisionConclusion {
  const readiness = input.reasoning?.tradeReadinessScore ?? 0;
  const quality = input.tradeQuality?.score ?? 0;
  const rr = riskImpact?.riskReward ?? 0;

  if (state === "Invalid trade plan") {
    return baseDecision("Avoid", "The plan is invalid until entry, stop, target, and size agree with direction.", primaryBlocker, input);
  }

  if (state !== "Ready to simulate") {
    return baseDecision("Not Ready", "Hermes needs a complete plan before modeling outcomes.", primaryBlocker, input);
  }

  if (input.reasoning?.recommendedAction === "Manage Existing Position") {
    return baseDecision("Manage Existing Position", "The current context is better suited for managing exposure than adding a new idea.", primaryBlocker, input);
  }

  if (rr < 1 || quality < 45) {
    return baseDecision("Avoid", "Risk or trade quality is too weak for a useful paper-trade lesson.", primaryBlocker, input);
  }

  if (readiness >= 82 && quality >= 78 && rr >= 2) {
    return baseDecision("High-Quality Setup", "The plan has defined risk, constructive evidence, and enough reward to study.", primaryBlocker, input);
  }

  if (readiness >= 65 && quality >= 60) {
    return baseDecision("Ready With Caution", "The plan is usable for paper practice, but at least one confirmation factor remains unfinished.", primaryBlocker, input);
  }

  return baseDecision("Wait for Confirmation", "The market thesis is developing, but Hermes wants stronger confirmation before risk is practiced.", primaryBlocker, input);
}

function baseDecision(
  state: DecisionConclusion["state"],
  conclusion: string,
  primaryBlocker: string,
  input: DecisionSimulationInput,
): DecisionConclusion {
  return {
    state,
    conclusion,
    primaryReason: input.reasoning?.reasoningSummary ?? conclusion,
    mainBlocker: primaryBlocker,
    confirmationNeeded: input.reasoning?.confirmationConditions[0] ?? "A clean confirmation candle with supportive volume.",
    invalidationCondition: input.reasoning?.invalidationConditions[0] ?? "Price reaches the planned stop or structure fails.",
    riskNote: input.news?.riskCaution.active
      ? input.news.riskCaution.message
      : "Hermes does not forbid the trade. Hermes asks whether the trade deserves risk.",
  };
}

function buildWhyHermesReachedThis(
  input: DecisionSimulationInput,
  primaryBlocker: string,
  riskImpact: ReturnType<typeof calculateRiskImpact> | null,
) {
  return [
    `Confidence remains separate at ${Math.round(input.reasoning?.confidenceScore ?? input.tradeQuality?.score ?? 0)}%.`,
    `Readiness is ${Math.round(input.reasoning?.tradeReadinessScore ?? 0)} and reflects whether the setup is actionable now.`,
    riskImpact?.riskReward
      ? `The current plan offers ${riskImpact.riskReward.toFixed(2)}R with ${riskImpact.portfolioRiskPct.toFixed(2)}% portfolio risk.`
      : "Risk/reward cannot be trusted until the plan is valid.",
    `Primary blocker: ${primaryBlocker}`,
  ];
}

function getDataQuality(input: DecisionSimulationInput, state: DecisionSimulationState) {
  if (state === "Market data unavailable" || state === "Incomplete trade plan") return "Insufficient";
  if (input.reasoning?.dataState === "Stale") return "Stale";
  if (!input.reasoning || !input.tradeQuality) return "Estimated";
  return "Ready";
}

function getStaleReasons(previous: string, next: string) {
  const labels = [
    "symbol",
    "timeframe",
    "price",
    "side",
    "entry",
    "stop",
    "target",
    "size",
    "news risk",
    "market structure",
    "confidence",
    "readiness",
  ];
  const before = previous.split("|");
  const after = next.split("|");
  return labels.filter((_, index) => before[index] !== after[index]);
}
