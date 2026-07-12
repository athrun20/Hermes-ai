/**
 * Hermes Session Intelligence v1 — public surface.
 *
 * Isolated from intelligence-v2 and Learning Engine.
 * Educational session evolution only — not a trading score.
 */

export type {
  LiquidityState,
  MarketHealth,
  MomentumState,
  OpportunityState,
  OpportunityWindow,
  OpportunityWindowKind,
  ParticipationState,
  SessionBias,
  SessionIntelligence,
  SessionIntelligenceInput,
  SessionPhase,
  SessionStoryEvent,
  VolatilityState,
} from "@/lib/session-intelligence/types";

export {
  SESSION_STORY_MAX,
  SESSION_RISKS_MAX,
  SESSION_STRENGTHS_MAX,
} from "@/lib/session-intelligence/types";

export { buildSessionIntelligence } from "@/lib/session-intelligence/build-session-intelligence";

export {
  detectSessionPhase,
  detectSessionBias,
} from "@/lib/session-intelligence/session-phase";

export {
  detectMarketHealth,
  detectVolatilityState,
  detectLiquidityState,
  detectMomentumState,
  detectParticipationState,
} from "@/lib/session-intelligence/market-health";

export {
  detectOpportunityState,
  buildOpportunityWindows,
} from "@/lib/session-intelligence/opportunity-state";

export {
  buildSessionStory,
  mergeDuplicateEvents,
} from "@/lib/session-intelligence/session-story";

export { buildSessionSummary } from "@/lib/session-intelligence/session-summary";
