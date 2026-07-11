import type { DecisionSimulationInput, TraderReasonAlignment } from "@/lib/decision-simulator-types";

export function evaluateTraderReasonAlignment(input: DecisionSimulationInput): TraderReasonAlignment {
  const reason = input.traderReason;
  const structure = input.reasoning?.marketStructure ?? "";
  const context = `${structure} ${input.reasoning?.marketContext ?? ""} ${input.reasoning?.reasoningSummary ?? ""}`.toLowerCase();

  if (!input.reasoning || input.reasoning.dataState !== "Ready") {
    return {
      reason,
      status: "Insufficient evidence",
      explanation: "Hermes needs more stable market evidence before judging the stated reason.",
    };
  }

  const aligned =
    (reason === "Breakout" && context.includes("breakout")) ||
    (reason === "Pullback" && (context.includes("retest") || context.includes("pullback"))) ||
    (reason === "Trend continuation" && context.includes("trending")) ||
    (reason === "Reversal" && (context.includes("rejection") || context.includes("sweep"))) ||
    (reason === "Momentum" && input.reasoning.momentumCondition.toLowerCase().includes("impro")) ||
    (reason === "News catalyst" && input.news?.urgency === "High") ||
    (reason === "Support or resistance reaction" && /support|resistance/.test(context));

  if (aligned) {
    return {
      reason,
      status: "Aligned",
      explanation: `Your ${reason.toLowerCase()} thesis matches the current Hermes evidence.`,
    };
  }

  if (input.reasoning.tradeReadinessScore >= 60) {
    return {
      reason,
      status: "Partially aligned",
      explanation: "The idea is plausible, but confirmation is still incomplete.",
    };
  }

  return {
    reason,
    status: "Misaligned",
    explanation: `You selected ${reason.toLowerCase()}, but Hermes does not see enough matching evidence yet.`,
  };
}
