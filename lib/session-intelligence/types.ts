/**
 * Hermes Session Intelligence v1 — contracts.
 *
 * Explains how today's session is evolving (educational context).
 * Separate from Market Intelligence (what is happening) and product scores.
 * Not inside intelligence-v2. Does not change Confidence / Readiness / TQ.
 */

import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { SmartChartIntelligenceResult } from "@/lib/smart-chart-intelligence-types";
import type { Candle } from "@/lib/market-data";

export type SessionPhase =
  | "Opening Drive"
  | "Opening Balance"
  | "Trend Expansion"
  | "Trend Continuation"
  | "Range Rotation"
  | "Consolidation"
  | "Distribution"
  | "Accumulation"
  | "Late Session"
  | "Closing Rotation"
  | "Unknown";

export type SessionBias = "Bullish" | "Bearish" | "Neutral" | "Mixed";

/** How healthy is today's trading environment? Not product Confidence. */
export type MarketHealth =
  | "Excellent"
  | "Healthy"
  | "Mixed"
  | "Weak"
  | "Unstable";

/** Independent of product Confidence — setup environment readiness. */
export type OpportunityState =
  | "Excellent Opportunity"
  | "Developing"
  | "Waiting"
  | "Weak"
  | "Avoid";

export type VolatilityState = "Compressed" | "Normal" | "Elevated" | "Extreme";
export type LiquidityState = "Healthy" | "Thin" | "Dislocated" | "Unknown";
export type MomentumState = "Accelerating" | "Steady" | "Fading" | "Unclear";
export type ParticipationState = "Strong" | "Normal" | "Weak" | "Absent";

export type OpportunityWindowKind =
  | "Trend continuation"
  | "Pullback"
  | "Breakout watch"
  | "Reversal watch"
  | "Range rotation"
  | "No Trade";

export type OpportunityWindow = {
  kind: OpportunityWindowKind;
  label: string;
  rationale: string;
};

export type SessionStoryEvent = {
  id: string;
  timestamp: number;
  sequence: number;
  /** Display clock label when available (e.g. 09:42). */
  clockLabel: string;
  title: string;
  detail: string;
  tone: "mint" | "gold" | "danger" | "muted";
  source: string;
};

export type SessionIntelligence = {
  kind: "hermes-session-intelligence-v1";
  sessionPhase: SessionPhase;
  sessionBias: SessionBias;
  marketHealth: MarketHealth;
  opportunityState: OpportunityState;
  volatilityState: VolatilityState;
  liquidityState: LiquidityState;
  momentumState: MomentumState;
  participationState: ParticipationState;
  sessionSummary: string;
  sessionStory: SessionStoryEvent[];
  opportunityWindows: OpportunityWindow[];
  currentRisks: string[];
  currentStrengths: string[];
  /**
   * Clarity of the session classification (0–100).
   * Educational only — not product Confidence, Readiness, or Trade Quality.
   */
  sessionConfidence: number;
  generatedAt: number;
};

export type SessionIntelligenceInput = {
  candles: Candle[];
  context: HermesVisionContext;
  vision: HermesVisionResult;
  reasoning: ReasoningResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  news: NewsIntelligenceResult;
  /** Optional smart-chart v2 story for richer session chronology. */
  smartChart?: SmartChartIntelligenceResult | null;
  /** Optional mirrored product confidence for opportunity contrast only (never mutated). */
  productConfidence?: number;
  /** Optional mirrored readiness for opportunity contrast only. */
  productReadiness?: number;
  now?: number;
};

export const SESSION_STORY_MAX = 10;
export const SESSION_RISKS_MAX = 3;
export const SESSION_STRENGTHS_MAX = 3;
