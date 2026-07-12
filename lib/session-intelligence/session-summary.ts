/**
 * Deterministic session summary templates — no generative AI.
 */

import type {
  MarketHealth,
  OpportunityState,
  SessionBias,
  SessionPhase,
  SessionStoryEvent,
  VolatilityState,
} from "@/lib/session-intelligence/types";

export function buildSessionSummary(args: {
  phase: SessionPhase;
  bias: SessionBias;
  health: MarketHealth;
  opportunityState: OpportunityState;
  volatility: VolatilityState;
  story: SessionStoryEvent[];
  risks: string[];
  strengths: string[];
}): string {
  const { phase, bias, health, opportunityState, volatility, story, risks, strengths } =
    args;

  const openBit = storyOpening(story, volatility);
  const bodyBit = phaseBody(phase, bias);
  const healthBit = healthClause(health);
  const oppBit = opportunityClause(opportunityState);
  const tail =
    risks[0] != null
      ? ` Watch: ${lowerFirst(risks[0])}.`
      : strengths[0] != null
        ? ` Supportive: ${lowerFirst(strengths[0])}.`
        : "";

  return `${openBit} ${bodyBit} ${healthBit} ${oppBit}${tail}`.replace(/\s+/g, " ").trim();
}

function storyOpening(story: SessionStoryEvent[], volatility: VolatilityState): string {
  const openVol = story.find((e) => /open|volatility/i.test(e.title));
  if (openVol) {
    return openVol.detail.endsWith(".") ? openVol.detail : `${openVol.detail}.`;
  }
  if (volatility === "Elevated" || volatility === "Extreme") {
    return "The session opened with elevated volatility.";
  }
  if (volatility === "Compressed") {
    return "The session opened with compressed ranges.";
  }
  return "The session is developing from a measured open.";
}

function phaseBody(phase: SessionPhase, bias: SessionBias): string {
  const biasWord =
    bias === "Bullish"
      ? "bullish"
      : bias === "Bearish"
        ? "bearish"
        : bias === "Mixed"
          ? "two-sided"
          : "balanced";

  switch (phase) {
    case "Opening Drive":
      return `An opening drive is in control with a ${biasWord} lean.`;
    case "Opening Balance":
      return "Price is still building an opening balance.";
    case "Trend Expansion":
      return `Trend expansion is underway with a ${biasWord} bias.`;
    case "Trend Continuation":
      return `Trend continuation conditions favor a ${biasWord} path if structure holds.`;
    case "Range Rotation":
      return "Range rotation is the dominant mode — edges matter more than mid-range activity.";
    case "Consolidation":
      return "Consolidation is compressing decision quality until a clearer break forms.";
    case "Distribution":
      return "Distribution characteristics are present near highs — patience on late chase entries.";
    case "Accumulation":
      return "Accumulation characteristics are present — confirmation still matters before expansion.";
    case "Late Session":
      return "Late-session conditions reduce room for new process risk.";
    case "Closing Rotation":
      return "Closing rotation is active — protect process over forced activity.";
    default:
      return "Session structure is still unclear.";
  }
}

function healthClause(health: MarketHealth): string {
  switch (health) {
    case "Excellent":
      return "Market health is excellent for structured study.";
    case "Healthy":
      return "Market health remains healthy.";
    case "Mixed":
      return "Market health is mixed.";
    case "Weak":
      return "Market health is weak.";
    case "Unstable":
      return "Market health is unstable.";
  }
}

function opportunityClause(state: OpportunityState): string {
  switch (state) {
    case "Excellent Opportunity":
      return "Opportunity state is excellent only if plan rules stay complete.";
    case "Developing":
      return "Opportunity state is developing — wait for confirmation.";
    case "Waiting":
      return "Opportunity state is waiting; no clean trigger yet.";
    case "Weak":
      return "Opportunity state is weak.";
    case "Avoid":
      return "Opportunity state is avoid — observation over action.";
  }
}

function lowerFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}
