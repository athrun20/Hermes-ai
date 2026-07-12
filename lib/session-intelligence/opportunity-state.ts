/**
 * Opportunity State — independent educational environment state.
 * Must not replace product Confidence.
 */

import type {
  MarketHealth,
  OpportunityState,
  OpportunityWindow,
  SessionIntelligenceInput,
  SessionPhase,
} from "@/lib/session-intelligence/types";
import type { SessionBias } from "@/lib/session-intelligence/types";

export function detectOpportunityState(args: {
  input: SessionIntelligenceInput;
  phase: SessionPhase;
  bias: SessionBias;
  health: MarketHealth;
}): OpportunityState {
  const { input, phase, bias, health } = args;
  const readiness = input.productReadiness;
  const confidence = input.productConfidence;
  const newsAvoid =
    input.news.urgency === "High" &&
    (input.news.riskCaution?.active || input.news.sentiment === "Negative");
  const weakParticipation =
    input.context.volume.status === "Fading" ||
    (input.context.volume.average > 0 &&
      input.context.volume.current / input.context.volume.average < 0.65);
  const structure = input.reasoning.marketStructure ?? "";
  const hasTrigger =
    structure === "Breakout" ||
    structure === "Retest" ||
    phase === "Trend Continuation" ||
    phase === "Trend Expansion" ||
    phase === "Opening Drive";

  if (newsAvoid || health === "Unstable") return "Avoid";
  if (health === "Weak" && weakParticipation) return "Weak";
  if (phase === "Consolidation" || phase === "Opening Balance") {
    // High product confidence can still be Waiting without a trigger
    if (!hasTrigger) return "Waiting";
  }
  if (!hasTrigger && (readiness == null || readiness < 55)) return "Waiting";
  if (health === "Weak") return "Weak";

  if (
    (health === "Excellent" || health === "Healthy") &&
    hasTrigger &&
    (bias === "Bullish" || bias === "Bearish") &&
    !weakParticipation
  ) {
    // Excellent only when environment + trigger align; confidence alone is insufficient
    if (confidence != null && confidence >= 70 && (readiness == null || readiness >= 55)) {
      return "Excellent Opportunity";
    }
    return "Developing";
  }

  if (hasTrigger && health === "Mixed") return "Developing";
  if (hasTrigger) return "Developing";
  return "Waiting";
}

export function buildOpportunityWindows(args: {
  input: SessionIntelligenceInput;
  phase: SessionPhase;
  bias: SessionBias;
  opportunityState: OpportunityState;
}): OpportunityWindow[] {
  const { input, phase, bias, opportunityState } = args;
  const windows: OpportunityWindow[] = [];

  if (opportunityState === "Avoid") {
    windows.push({
      kind: "No Trade",
      label: "No Trade",
      rationale: "Session environment is unstable or event-driven — observation only.",
    });
    return windows;
  }

  if (phase === "Trend Continuation" || phase === "Trend Expansion") {
    windows.push({
      kind: "Trend continuation",
      label: "Trend continuation",
      rationale: `Session phase ${phase} with ${bias.toLowerCase()} bias — educational continuation watch only.`,
    });
  }

  if (phase === "Range Rotation" || phase === "Consolidation") {
    windows.push({
      kind: "Range rotation",
      label: "Range rotation",
      rationale: "Price is rotating inside a balance — wait for edges, not mid-range force.",
    });
  }

  if (
    input.context.distanceFromSupport != null &&
    input.context.distanceFromSupport < 0.012 &&
    bias !== "Bearish"
  ) {
    windows.push({
      kind: "Pullback",
      label: "Pullback",
      rationale: "Price is near support — pullback observation if structure holds.",
    });
  }

  if ((input.reasoning.marketStructure ?? "") === "Breakout") {
    windows.push({
      kind: "Breakout watch",
      label: "Breakout watch",
      rationale: "Structure breakout attempt — confirmation and participation still required.",
    });
  }

  if (
    (input.reasoning.marketStructure ?? "").includes("Lower") &&
    input.context.candleTrend === "Bullish"
  ) {
    windows.push({
      kind: "Reversal watch",
      label: "Reversal watch",
      rationale: "Mixed structure vs short-term impulse — reversal is unconfirmed.",
    });
  }

  if (windows.length === 0) {
    windows.push({
      kind: opportunityState === "Waiting" ? "No Trade" : "Pullback",
      label: opportunityState === "Waiting" ? "No Trade" : "Observe",
      rationale:
        opportunityState === "Waiting"
          ? "No clear session trigger yet — patience is the lesson."
          : "Session is still forming; keep observation primary.",
    });
  }

  // Cap educational windows
  return windows.slice(0, 3);
}
