/**
 * Phase 4 — Hermes Judgment (pure, internal).
 *
 * Answers: given thesis Confidence, Trade Readiness, regime, blockers,
 * trader profile, and plan completeness — would Hermes take this trade?
 *
 * Interprets existing outputs only. Does NOT calculate:
 * - Confidence
 * - Trade Readiness
 * - Trade Quality
 * - position size
 * - Buy/Sell signals
 *
 * High Confidence is never automatically actionable.
 * Low Readiness is never treated as a bearish thesis.
 */

import type {
  DataQuality,
  HermesJudgment,
  HermesJudgmentStance,
  JudgmentRegimeEffect,
  JudgmentTraderFitEffect,
  MarketRegime,
} from "@/lib/intelligence-v2/types";
import type {
  ReadinessState,
  ReasoningRecommendedAction,
  ReasoningResult,
  ReasoningRiskQuality,
} from "@/lib/reasoning-types";

/** Coaching-only profile signals (never override objective market risk). */
export type JudgmentProfileInput = {
  traderDnaFit?: string;
  personality?: string;
  /** Memory discipline score 0–100 when available */
  disciplineScore?: number;
  /** Optional habit / lesson notes from memory */
  notes?: string[];
};

/** Plan completeness flags — interpreted, not graded as Trade Quality. */
export type JudgmentPlanInput = {
  hasEntry?: boolean;
  hasStop?: boolean;
  hasTarget?: boolean;
  riskReward?: number | null;
  /** True when plan levels are structurally invalid (e.g. stop on wrong side). */
  planInvalid?: boolean;
};

export type BuildHermesJudgmentInput = {
  regime: MarketRegime;
  /**
   * Preferred: full reasoning result. Values are read as-is and never recomputed.
   */
  reasoning?: Pick<
    ReasoningResult,
    | "confidenceScore"
    | "tradeReadinessScore"
    | "readinessState"
    | "readinessBlockers"
    | "recommendedAction"
    | "traderFit"
    | "riskQuality"
    | "confirmationConditions"
    | "invalidationConditions"
    | "dataState"
    | "coachingMessage"
    | "reasoningSummary"
  >;
  /** Flat alternative when reasoning is not fully assembled */
  confidence?: number;
  readiness?: number;
  readinessState?: ReadinessState;
  readinessBlockers?: string[];
  recommendedAction?: ReasoningRecommendedAction;
  traderFit?: string;
  riskQuality?: ReasoningRiskQuality;
  confirmationConditions?: string[];
  invalidationConditions?: string[];
  dataState?: ReasoningResult["dataState"];
  profile?: JudgmentProfileInput;
  plan?: JudgmentPlanInput;
  /** When true, primary decision is management, not a new entry. */
  hasOpenPosition?: boolean;
  /** Explicit event-risk flag when not already on regime */
  eventRiskActive?: boolean;
  sourceTimestamp?: number;
};

type Resolved = {
  confidence: number | undefined;
  readiness: number | undefined;
  readinessState: ReadinessState | undefined;
  readinessBlockers: string[];
  recommendedAction: ReasoningRecommendedAction | undefined;
  traderFit: string | undefined;
  riskQuality: ReasoningRiskQuality | undefined;
  confirmationConditions: string[];
  invalidationConditions: string[];
  dataState: ReasoningResult["dataState"] | undefined;
  disciplineScore: number | undefined;
  personality: string | undefined;
  profileNotes: string[];
  plan: RequiredPlanFlags;
  hasOpenPosition: boolean;
  eventRiskActive: boolean;
  regime: MarketRegime;
  sourceTimestamp: number;
};

type RequiredPlanFlags = {
  hasEntry: boolean | undefined;
  hasStop: boolean | undefined;
  hasTarget: boolean | undefined;
  riskReward: number | null | undefined;
  planInvalid: boolean;
};

type StanceDecision = {
  stance: HermesJudgmentStance;
  wouldTakeTrade: boolean | "Conditional";
  primaryReason: string;
  supportingReasons: string[];
  blockingReasons: string[];
  conditionsToProceed: string[];
  conditionsToAvoid: string[];
};

const CONFIDENCE_STRONG = 72;
const CONFIDENCE_WEAK = 40;
const READINESS_HIGH = 85;
const READINESS_ACTIONABLE = 70;
const READINESS_DEVELOPING = 50;
const READINESS_NOT_READY = 30;

/**
 * Build Hermes Judgment from existing reasoning + regime + profile + plan flags.
 * Pure and deterministic for identical inputs.
 */
export function buildHermesJudgment(input: BuildHermesJudgmentInput): HermesJudgment {
  const signals = resolveSignals(input);
  const regimeEffect = buildRegimeEffect(signals.regime, signals.eventRiskActive);
  const traderFitEffect = buildTraderFitEffect(signals);
  const decision = decideStance(signals, regimeEffect, traderFitEffect);

  return {
    kind: "hermes-judgment-v1",
    stance: decision.stance,
    wouldTakeTrade: decision.wouldTakeTrade,
    summary: buildSummary(decision, signals, regimeEffect, traderFitEffect),
    primaryReason: decision.primaryReason,
    supportingReasons: unique(decision.supportingReasons).slice(0, 6),
    blockingReasons: unique(decision.blockingReasons).slice(0, 6),
    conditionsToProceed: unique(decision.conditionsToProceed).slice(0, 8),
    conditionsToAvoid: unique(decision.conditionsToAvoid).slice(0, 8),
    regimeEffect,
    traderFitEffect,
    sourceTimestamp: signals.sourceTimestamp,
  };
}

function resolveSignals(input: BuildHermesJudgmentInput): Resolved {
  const r = input.reasoning;
  const plan = input.plan ?? {};

  return {
    confidence: r?.confidenceScore ?? input.confidence,
    readiness: r?.tradeReadinessScore ?? input.readiness,
    readinessState: r?.readinessState ?? input.readinessState,
    readinessBlockers: r?.readinessBlockers ?? input.readinessBlockers ?? [],
    recommendedAction: r?.recommendedAction ?? input.recommendedAction,
    traderFit: input.profile?.traderDnaFit ?? r?.traderFit ?? input.traderFit,
    riskQuality: r?.riskQuality ?? input.riskQuality,
    confirmationConditions: r?.confirmationConditions ?? input.confirmationConditions ?? [],
    invalidationConditions: r?.invalidationConditions ?? input.invalidationConditions ?? [],
    dataState: r?.dataState ?? input.dataState,
    disciplineScore: input.profile?.disciplineScore,
    personality: input.profile?.personality,
    profileNotes: input.profile?.notes ?? [],
    plan: {
      hasEntry: plan.hasEntry,
      hasStop: plan.hasStop,
      hasTarget: plan.hasTarget,
      riskReward: plan.riskReward,
      planInvalid: Boolean(plan.planInvalid),
    },
    hasOpenPosition: Boolean(input.hasOpenPosition),
    eventRiskActive:
      Boolean(input.eventRiskActive) ||
      input.regime.eventRegime === "Event Driven" ||
      input.regime.eventRegime === "Elevated Event Risk",
    regime: input.regime,
    sourceTimestamp: input.sourceTimestamp ?? input.regime.sourceTimestamp,
  };
}

function decideStance(
  signals: Resolved,
  regimeEffect: JudgmentRegimeEffect,
  traderFitEffect: JudgmentTraderFitEffect,
): StanceDecision {
  const blockers = collectBlockingReasons(signals, regimeEffect, traderFitEffect);
  const critical = blockers.filter((b) => b.critical).map((b) => b.reason);
  const moderate = blockers.filter((b) => !b.critical).map((b) => b.reason);
  const support = collectSupportingReasons(signals, regimeEffect, traderFitEffect);

  // 1) Insufficient Data — missing required inputs or unusable quality
  if (isInsufficientData(signals)) {
    return {
      stance: "Insufficient Data",
      wouldTakeTrade: false,
      primaryReason:
        "Required judgment inputs are missing or data quality is too poor for a reliable personal stance.",
      supportingReasons: support,
      blockingReasons: critical.length
        ? critical
        : [
            describeDataGap(signals),
            "Hermes will not invent a personal take from incomplete tape or missing readiness context.",
          ],
      conditionsToProceed: [
        "Restore market data quality to Adequate or better.",
        "Provide thesis Confidence and Trade Readiness from Reasoning.",
        "Define entry, stop, and target before asking for a personal take.",
      ],
      conditionsToAvoid: [
        "Do not force a Take stance from partial inputs.",
        "Do not treat missing data as a bearish or bullish thesis.",
      ],
    };
  }

  // 2) Manage Existing Position — management, not entry
  if (signals.hasOpenPosition) {
    return {
      stance: "Manage Existing Position",
      wouldTakeTrade: "Conditional",
      primaryReason:
        "A position is already open — Hermes would manage risk and invalidation, not open a fresh thesis entry.",
      supportingReasons: [
        ...support,
        formatScoreContext(signals),
        regimeEffect.level === "Hostile" || regimeEffect.level === "Cautionary"
          ? `Regime effect while managing: ${regimeEffect.summary}`
          : "Regime does not force immediate liquidation language; management remains process-driven.",
      ],
      blockingReasons: critical.length ? critical : moderate.slice(0, 3),
      conditionsToProceed: [
        "Respect planned invalidation and stop discipline.",
        "Scale or exit only with plan-consistent reasons — Judgment is not a size calculator.",
        ...signals.confirmationConditions.slice(0, 2),
      ],
      conditionsToAvoid: [
        "Do not average into a broken thesis.",
        "Do not treat management as permission for a new unplanned entry.",
        ...signals.invalidationConditions.slice(0, 2).map((c) => `Watch: ${c}`),
      ],
    };
  }

  const conf = signals.confidence as number;
  const ready = signals.readiness as number;
  const state = signals.readinessState ?? inferReadinessState(ready);
  const planComplete = isPlanComplete(signals);
  const planInvalid = isPlanInvalid(signals);
  const hostile = regimeEffect.level === "Hostile";
  const cautionary = regimeEffect.level === "Cautionary" || regimeEffect.level === "Hostile";
  const dnaConflict = traderFitEffect.level === "Conflict";
  const hasCriticalBlocker =
    critical.length > 0 ||
    planInvalid ||
    signals.riskQuality === "Unacceptable" ||
    (signals.plan.riskReward !== undefined &&
      signals.plan.riskReward !== null &&
      signals.plan.riskReward < 1) ||
    hasCriticalReadinessBlocker(signals.readinessBlockers);

  // 3) Avoid — material refusal
  if (
    shouldAvoid({
      conf,
      ready,
      state,
      hostile,
      planInvalid,
      hasCriticalBlocker,
      riskQuality: signals.riskQuality,
      recommendedAction: signals.recommendedAction,
      eventDriven: signals.regime.eventRegime === "Event Driven",
      dnaConflict,
    })
  ) {
    const primary =
      critical[0] ??
      (hostile
        ? `Regime is hostile (${regimeEffect.summary}) — Hermes would personally pass.`
        : planInvalid
          ? "The plan is invalid — Hermes would not take unplanned personal risk."
          : state === "Not Ready" || ready < READINESS_NOT_READY
            ? `Trade Readiness is ${ready} (${state}) — not actionable; this is not a bearish thesis claim.`
            : conf < CONFIDENCE_WEAK
              ? `Thesis Confidence is ${conf} — too weak for Hermes to personally take risk.`
              : "Hermes would personally Avoid this trade given current constraints.");

    return {
      stance: "Avoid",
      wouldTakeTrade: false,
      primaryReason: primary,
      supportingReasons: support,
      blockingReasons: unique([...critical, ...moderate]).slice(0, 6),
      conditionsToProceed: buildProceedConditions(signals, {
        needRegimeImprove: hostile || cautionary,
        needPlan: !planComplete || planInvalid,
        needConfirmation: true,
      }),
      conditionsToAvoid: [
        "Do not treat high Confidence alone as permission to enter.",
        "Do not collapse Avoid into a market-direction prediction.",
        ...signals.invalidationConditions.slice(0, 2).map((c) => `Stay flat if: ${c}`),
      ],
    };
  }

  // 4) Take — strict
  const takeOk =
    ready >= READINESS_HIGH &&
    state === "High-Quality Setup" &&
    conf >= CONFIDENCE_STRONG &&
    !hasCriticalBlocker &&
    !hostile &&
    planComplete &&
    !planInvalid &&
    isDataQualityAcceptable(signals.regime.dataQuality) &&
    signals.riskQuality !== "Poor" &&
    signals.riskQuality !== "Unacceptable" &&
    !dnaConflict &&
    !(signals.eventRiskActive && signals.regime.eventRegime === "Event Driven") &&
    (signals.recommendedAction === undefined ||
      signals.recommendedAction === "Validate" ||
      signals.recommendedAction === "Prepare");

  if (takeOk && !cautionary && traderFitEffect.level !== "Conflict") {
    return {
      stance: "Take",
      wouldTakeTrade: true,
      primaryReason: `Hermes would personally take this trade: readiness ${ready} (${state}) with thesis Confidence ${conf}, complete plan, and non-hostile regime.`,
      supportingReasons: [
        ...support,
        formatScoreContext(signals),
        `Regime effect: ${regimeEffect.summary}`,
        `Trader fit effect: ${traderFitEffect.summary}`,
      ],
      blockingReasons: moderate.slice(0, 2),
      conditionsToProceed: [
        "Keep paper size consistent with discipline — Judgment does not size positions.",
        "Validate stop and target once more before execution review.",
        ...signals.confirmationConditions.slice(0, 2),
      ],
      conditionsToAvoid: [
        ...signals.invalidationConditions.slice(0, 3).map((c) => `Exit thesis if: ${c}`),
        "Do not expand size because stance is Take — Conviction is a later internal stage.",
      ],
    };
  }

  // 5) Take With Caution — actionable but moderate residual risk
  const cautionTakeOk =
    ready >= READINESS_ACTIONABLE &&
    (state === "High-Quality Setup" || state === "Ready With Caution") &&
    conf >= CONFIDENCE_STRONG &&
    !hasCriticalBlocker &&
    !hostile &&
    !planInvalid &&
    planComplete &&
    isDataQualityAcceptable(signals.regime.dataQuality) &&
    signals.riskQuality !== "Unacceptable" &&
    !(signals.regime.eventRegime === "Event Driven");

  if (cautionTakeOk) {
    const residual = [
      ...moderate,
      ...(cautionary ? [`Regime remains ${regimeEffect.level.toLowerCase()}: ${regimeEffect.summary}`] : []),
      ...(dnaConflict
        ? [`Trader fit conflict is a coaching caution: ${traderFitEffect.summary}`]
        : traderFitEffect.level === "Neutral"
          ? ["Trader fit is neutral — do not force size from DNA alone."]
          : []),
      ...(signals.eventRiskActive
        ? ["Event risk is still elevated — keep risk conservative."]
        : []),
      ...(state === "Ready With Caution" ? ["Readiness state is Ready With Caution, not High-Quality Setup."] : []),
      ...(signals.riskQuality === "Poor" || signals.riskQuality === "Average"
        ? [`Risk quality is ${signals.riskQuality}.`]
        : []),
    ];

    // DNA conflict alone under otherwise actionable setup → caution, not Take
    // (objective market risk still gates Avoid above)
    return {
      stance: "Take With Caution",
      wouldTakeTrade: "Conditional",
      primaryReason:
        residual[0] !== undefined
          ? `Setup is actionable enough for a cautious personal take, but residual risk remains: ${residual[0]}`
          : `Setup is actionable (readiness ${ready}) with strong Confidence ${conf}, but Hermes would proceed only with caution.`,
      supportingReasons: [
        ...support,
        formatScoreContext(signals),
        `Regime effect: ${regimeEffect.summary}`,
        `Trader fit effect: ${traderFitEffect.summary}`,
      ],
      blockingReasons: unique(residual).slice(0, 6),
      conditionsToProceed: [
        "Keep position sizing conservative — Judgment is not a size engine.",
        "Require confirmation conditions before increasing risk.",
        ...signals.confirmationConditions.slice(0, 3),
        ...buildProceedConditions(signals, {
          needRegimeImprove: cautionary,
          needPlan: false,
          needConfirmation: true,
        }).slice(0, 2),
      ],
      conditionsToAvoid: [
        "Do not treat Take With Caution as a full Take.",
        "Do not ignore moderate blockers because Confidence is high.",
        ...signals.invalidationConditions.slice(0, 2).map((c) => `Abort if: ${c}`),
      ],
    };
  }

  // 6) Wait — default when thesis may be valid but not personally ready
  const waitBlockers = unique([...critical, ...moderate, ...signals.readinessBlockers]).slice(0, 6);
  const primaryWait =
    conf >= CONFIDENCE_STRONG && ready < READINESS_ACTIONABLE
      ? `Thesis Confidence is ${conf} (a “good idea” may exist) but Trade Readiness is ${ready} (${state}) — not ready now. Judgment does not merge these.`
      : signals.eventRiskActive && !hostile
        ? `Event risk is unresolved (${signals.regime.eventRegime}) — Hermes would wait for clearer conditions.`
        : !planComplete
          ? "Plan completeness is insufficient for a personal take — wait until levels are defined."
          : `Hermes would wait: readiness ${ready} (${state}) with Confidence ${conf} does not yet support a personal take.`;

  return {
    stance: "Wait",
    wouldTakeTrade: "Conditional",
    primaryReason: primaryWait,
    supportingReasons: [
      ...support,
      formatScoreContext(signals),
      `Regime effect: ${regimeEffect.summary}`,
      `Trader fit effect: ${traderFitEffect.summary}`,
    ],
    blockingReasons: waitBlockers,
    conditionsToProceed: buildProceedConditions(signals, {
      needRegimeImprove: cautionary,
      needPlan: !planComplete,
      needConfirmation: true,
    }),
    conditionsToAvoid: [
      "Do not enter early because Confidence is high.",
      "Do not treat Wait as a bearish thesis — low readiness is not directional.",
      "Do not skip confirmation to force actionability.",
    ],
  };
}

function shouldAvoid(args: {
  conf: number;
  ready: number;
  state: ReadinessState;
  hostile: boolean;
  planInvalid: boolean;
  hasCriticalBlocker: boolean;
  riskQuality: ReasoningRiskQuality | undefined;
  recommendedAction: ReasoningRecommendedAction | undefined;
  eventDriven: boolean;
  dnaConflict: boolean;
}): boolean {
  if (args.recommendedAction === "Avoid") return true;
  if (args.planInvalid) return true;
  if (args.riskQuality === "Unacceptable") return true;
  if (args.state === "Not Ready" || args.ready < READINESS_NOT_READY) return true;
  if (args.conf < CONFIDENCE_WEAK) return true;
  // Hostile regime (event-driven, dislocated liquidity, extreme+unclear, etc.)
  // refuses new personal risk even when Confidence/Readiness look strong.
  if (args.hostile) return true;
  if (args.eventDriven) return true;
  if (args.hasCriticalBlocker && args.ready < READINESS_ACTIONABLE) return true;
  // DNA conflict never alone forces Avoid when market is fine and readiness high —
  // that becomes Take With Caution. Only pair with weak readiness / critical path.
  if (args.dnaConflict && args.ready < READINESS_ACTIONABLE) return true;
  return false;
}

function isInsufficientData(signals: Resolved): boolean {
  if (signals.regime.dataQuality === "Poor") return true;
  if (signals.dataState === "Insufficient Data" || signals.dataState === "Stale") return true;
  if (signals.confidence === undefined || signals.readiness === undefined) return true;
  // No readiness state and no way to infer (readiness missing already covered)
  if (
    signals.regime.dataQuality === "Limited" &&
    signals.confidence === undefined
  ) {
    return true;
  }
  return false;
}

function describeDataGap(signals: Resolved): string {
  if (signals.regime.dataQuality === "Poor") {
    return `Regime data quality is Poor (${signals.regime.summary}).`;
  }
  if (signals.dataState === "Insufficient Data" || signals.dataState === "Stale") {
    return `Reasoning data state is ${signals.dataState}.`;
  }
  if (signals.confidence === undefined && signals.readiness === undefined) {
    return "Both Confidence and Trade Readiness are missing from inputs.";
  }
  if (signals.confidence === undefined) return "Thesis Confidence is missing from inputs.";
  if (signals.readiness === undefined) return "Trade Readiness is missing from inputs.";
  return "Required judgment inputs are incomplete.";
}

function isPlanComplete(signals: Resolved): boolean {
  const { hasEntry, hasStop, hasTarget } = signals.plan;
  // If plan flags omitted, infer from readiness blockers
  if (hasEntry === undefined && hasStop === undefined && hasTarget === undefined) {
    const blockers = signals.readinessBlockers.map((b) => b.toLowerCase());
    const missingEntry = blockers.some((b) => b.includes("entry is not defined"));
    const missingStop = blockers.some((b) => b.includes("stop loss is not defined"));
    const missingTarget = blockers.some((b) => b.includes("take profit is not defined"));
    // If no plan-related blockers, treat as complete enough for judgment gates
    if (!missingEntry && !missingStop && !missingTarget) return true;
    return !missingEntry && !missingStop && !missingTarget;
  }
  return Boolean(hasEntry) && Boolean(hasStop) && Boolean(hasTarget);
}

function isPlanInvalid(signals: Resolved): boolean {
  if (signals.plan.planInvalid) return true;
  if (
    signals.plan.riskReward !== undefined &&
    signals.plan.riskReward !== null &&
    signals.plan.riskReward < 1
  ) {
    return true;
  }
  return signals.readinessBlockers.some((b) => b.toLowerCase().includes("below 1:1"));
}

function hasCriticalReadinessBlocker(blockers: string[]): boolean {
  return blockers.some((b) => {
    const x = b.toLowerCase();
    return (
      x.includes("entry is not defined") ||
      x.includes("stop loss is not defined") ||
      x.includes("below 1:1") ||
      x.includes("high-urgency news")
    );
  });
}

function isDataQualityAcceptable(q: DataQuality): boolean {
  return q === "Adequate" || q === "Good";
}

function collectBlockingReasons(
  signals: Resolved,
  regimeEffect: JudgmentRegimeEffect,
  traderFitEffect: JudgmentTraderFitEffect,
): Array<{ reason: string; critical: boolean }> {
  const out: Array<{ reason: string; critical: boolean }> = [];

  for (const b of signals.readinessBlockers) {
    out.push({ reason: b, critical: isCriticalBlockerText(b) });
  }
  if (signals.plan.planInvalid) {
    out.push({ reason: "Plan is marked invalid.", critical: true });
  }
  if (
    signals.plan.riskReward !== undefined &&
    signals.plan.riskReward !== null &&
    signals.plan.riskReward < 1
  ) {
    out.push({
      reason: `Plan risk/reward is ${signals.plan.riskReward.toFixed(2)}:1 (below 1:1).`,
      critical: true,
    });
  }
  if (signals.plan.hasStop === false) {
    out.push({ reason: "Stop loss is not defined on the plan.", critical: true });
  }
  if (signals.plan.hasEntry === false) {
    out.push({ reason: "Entry is not defined on the plan.", critical: true });
  }
  if (signals.plan.hasTarget === false) {
    out.push({ reason: "Take profit is not defined on the plan.", critical: false });
  }
  if (signals.riskQuality === "Unacceptable") {
    out.push({ reason: "Risk quality is Unacceptable.", critical: true });
  } else if (signals.riskQuality === "Poor") {
    out.push({ reason: "Risk quality is Poor.", critical: false });
  }
  if (regimeEffect.level === "Hostile") {
    out.push({ reason: `Hostile regime: ${regimeEffect.summary}`, critical: true });
  } else if (regimeEffect.level === "Cautionary") {
    out.push({ reason: `Cautionary regime: ${regimeEffect.summary}`, critical: false });
  }
  if (signals.regime.eventRegime === "Event Driven") {
    out.push({ reason: "Event regime is Event Driven.", critical: true });
  } else if (signals.eventRiskActive) {
    out.push({ reason: `Event risk active (${signals.regime.eventRegime}).`, critical: false });
  }
  if (traderFitEffect.level === "Conflict") {
    out.push({
      reason: `Trader fit conflict (coaching): ${traderFitEffect.summary}`,
      critical: false,
    });
  }
  if (signals.regime.dataQuality === "Limited") {
    out.push({ reason: "Regime data quality is Limited.", critical: false });
  }
  if (signals.confidence !== undefined && signals.confidence < CONFIDENCE_WEAK) {
    out.push({
      reason: `Thesis Confidence ${signals.confidence} is below Hermes' personal threshold.`,
      critical: true,
    });
  }
  if (signals.readiness !== undefined && signals.readiness < READINESS_NOT_READY) {
    out.push({
      reason: `Trade Readiness ${signals.readiness} is Not Ready — incomplete actionability, not a bearish thesis.`,
      critical: true,
    });
  }

  return out;
}

function collectSupportingReasons(
  signals: Resolved,
  regimeEffect: JudgmentRegimeEffect,
  traderFitEffect: JudgmentTraderFitEffect,
): string[] {
  const out: string[] = [];
  if (signals.confidence !== undefined && signals.confidence >= CONFIDENCE_STRONG) {
    out.push(
      `Thesis Confidence ${signals.confidence} is sufficiently strong (thesis quality only — not automatic permission to act).`,
    );
  }
  if (signals.readiness !== undefined && signals.readiness >= READINESS_ACTIONABLE) {
    out.push(`Trade Readiness ${signals.readiness} indicates the setup is approaching actionability.`);
  }
  if (regimeEffect.level === "Supportive") {
    out.push(`Regime is supportive: ${regimeEffect.summary}`);
  } else if (regimeEffect.level === "Neutral") {
    out.push(`Regime is neutral: ${regimeEffect.summary}`);
  }
  if (traderFitEffect.level === "Aligned") {
    out.push(`Trader fit is aligned: ${traderFitEffect.summary}`);
  }
  if (signals.riskQuality === "Excellent" || signals.riskQuality === "Good") {
    out.push(`Risk quality is ${signals.riskQuality}.`);
  }
  if (isPlanComplete(signals) && !isPlanInvalid(signals)) {
    out.push("Plan completeness flags indicate entry, stop, and target are available.");
  }
  for (const note of signals.profileNotes.slice(0, 2)) {
    out.push(`Profile note: ${note}`);
  }
  return out.slice(0, 6);
}

function buildProceedConditions(
  signals: Resolved,
  flags: { needRegimeImprove: boolean; needPlan: boolean; needConfirmation: boolean },
): string[] {
  const out: string[] = [];
  if (flags.needPlan) {
    if (signals.plan.hasEntry === false || signals.readinessBlockers.some((b) => /entry is not defined/i.test(b))) {
      out.push("Define a clear entry.");
    }
    if (signals.plan.hasStop === false || signals.readinessBlockers.some((b) => /stop loss is not defined/i.test(b))) {
      out.push("Define a stop loss / invalidation.");
    }
    if (signals.plan.hasTarget === false || signals.readinessBlockers.some((b) => /take profit is not defined/i.test(b))) {
      out.push("Define a take-profit target.");
    }
    if (!out.length) out.push("Complete the trade plan levels before a personal take.");
  }
  if (flags.needConfirmation) {
    out.push(...signals.confirmationConditions.slice(0, 3));
    for (const b of signals.readinessBlockers.slice(0, 3)) {
      out.push(`Resolve: ${b}`);
    }
  }
  if (flags.needRegimeImprove) {
    out.push("Wait for regime hostility / elevated event risk to cool.");
  }
  if (signals.readiness !== undefined && signals.readiness < READINESS_ACTIONABLE) {
    out.push("Improve Trade Readiness into Ready With Caution or High-Quality Setup.");
  }
  return unique(out).slice(0, 8);
}

function buildSummary(
  decision: StanceDecision,
  signals: Resolved,
  regimeEffect: JudgmentRegimeEffect,
  traderFitEffect: JudgmentTraderFitEffect,
): string {
  const conf =
    signals.confidence === undefined ? "n/a" : String(signals.confidence);
  const ready =
    signals.readiness === undefined ? "n/a" : String(signals.readiness);
  const state = signals.readinessState ?? "n/a";
  return [
    `Judgment: ${decision.stance}.`,
    `Would take trade: ${String(decision.wouldTakeTrade)}.`,
    `Confidence ${conf} · Readiness ${ready} (${state}).`,
    `Regime: ${regimeEffect.level}. Trader fit: ${traderFitEffect.level}.`,
    decision.primaryReason,
  ].join(" ");
}

function formatScoreContext(signals: Resolved): string {
  const conf = signals.confidence ?? "n/a";
  const ready = signals.readiness ?? "n/a";
  const state = signals.readinessState ?? inferReadinessState(Number(ready) || 0);
  return `Existing scores (unchanged): Confidence ${conf}, Readiness ${ready} (${state}).`;
}

export function buildRegimeEffect(
  regime: MarketRegime,
  eventRiskActive = false,
): JudgmentRegimeEffect {
  const factors: string[] = [];
  let level: JudgmentRegimeEffect["level"] = "Neutral";

  if (regime.dataQuality === "Poor") {
    return {
      level: "Unknown",
      summary: "Data quality is too poor to rely on regime for personal judgment.",
      factors: [`dataQuality=${regime.dataQuality}`],
    };
  }

  if (regime.structureRegime === "Trending") {
    factors.push("Structure is Trending — directional context can support disciplined continuation ideas.");
  } else if (regime.structureRegime === "Range") {
    factors.push("Structure is Range — breakout enthusiasm should be discounted until edges prove.");
  } else if (regime.structureRegime === "Transition") {
    factors.push("Structure is Transition — mixed structure reduces personal aggressiveness.");
    level = "Cautionary";
  } else if (regime.structureRegime === "Unclear") {
    factors.push("Structure is Unclear — Hermes reduces personal willingness to take new risk.");
    level = "Cautionary";
  }

  if (regime.volatilityRegime === "Extreme") {
    factors.push("Volatility is Extreme — execution quality and slippage risk rise.");
    level = escalateRegimeLevel(level, "Hostile");
  } else if (regime.volatilityRegime === "High") {
    factors.push("Volatility is High — prefer confirmation and conservative risk.");
    level = escalateRegimeLevel(level, "Cautionary");
  } else if (regime.volatilityRegime === "Low") {
    factors.push("Volatility is Low — ranges may dominate; do not force momentum.");
  } else {
    factors.push("Volatility is Normal.");
  }

  if (regime.liquidityRegime === "Dislocated") {
    factors.push("Liquidity is Dislocated — hostile for new personal risk.");
    level = escalateRegimeLevel(level, "Hostile");
  } else if (regime.liquidityRegime === "Thin") {
    factors.push("Liquidity is Thin — fills and stops may be less reliable.");
    level = escalateRegimeLevel(level, "Cautionary");
  } else if (regime.liquidityRegime === "Healthy") {
    factors.push("Liquidity is Healthy.");
  } else {
    factors.push("Liquidity is Unknown.");
    level = escalateRegimeLevel(level, "Cautionary");
  }

  if (regime.eventRegime === "Event Driven") {
    factors.push("Event regime is Event Driven — hostile for fresh personal entries.");
    level = escalateRegimeLevel(level, "Hostile");
  } else if (regime.eventRegime === "Elevated Event Risk" || eventRiskActive) {
    factors.push("Elevated event risk — confirmation and patience preferred.");
    level = escalateRegimeLevel(level, "Cautionary");
  } else {
    factors.push("Event regime is Normal.");
  }

  if (regime.directionalBias === "Mixed") {
    factors.push("Directional bias is Mixed — mixed regime reduces clean personal takes.");
    level = escalateRegimeLevel(level, "Cautionary");
  } else {
    factors.push(`Directional bias is ${regime.directionalBias}.`);
  }

  if (
    level === "Neutral" &&
    regime.structureRegime === "Trending" &&
    (regime.volatilityRegime === "Normal" || regime.volatilityRegime === "Low") &&
    regime.liquidityRegime === "Healthy" &&
    regime.eventRegime === "Normal"
  ) {
    level = "Supportive";
  }

  return {
    level,
    summary: `${regime.structureRegime} / ${regime.volatilityRegime} vol / ${regime.liquidityRegime} liquidity / ${regime.eventRegime} — ${regime.summary}`,
    factors: factors.slice(0, 8),
  };
}

export function buildTraderFitEffect(signals: {
  traderFit: string | undefined;
  disciplineScore: number | undefined;
  personality: string | undefined;
  profileNotes: string[];
}): JudgmentTraderFitEffect {
  const fit = signals.traderFit ?? "";
  const lower = fit.toLowerCase();
  const notes: string[] = [...signals.profileNotes];

  let level: JudgmentTraderFitEffect["level"] = "Unknown";
  if (!fit) {
    level = "Unknown";
  } else if (lower.includes("poor") || lower.includes("conflict") || lower.includes("mismatch")) {
    level = "Conflict";
  } else if (lower.includes("align") || lower.includes("strong fit") || lower === "good") {
    level = "Aligned";
  } else {
    level = "Neutral";
  }

  if (signals.disciplineScore !== undefined && signals.disciplineScore < 45) {
    notes.push(
      `Recent discipline score ${signals.disciplineScore} suggests the trader may enter before confirmation — coaching caution only.`,
    );
    if (level === "Aligned") level = "Neutral";
  } else if (signals.disciplineScore !== undefined && signals.disciplineScore >= 70) {
    notes.push(`Discipline score ${signals.disciplineScore} supports process-aligned practice.`);
  }

  if (signals.personality) {
    notes.push(`Personality context: ${signals.personality}.`);
  }

  if (level === "Conflict") {
    notes.push(
      "Setup conflicts with the trader’s risk or style profile — coaching modifier only; market risk still dominates.",
    );
  } else if (level === "Aligned") {
    notes.push("Setup matches the trader’s stronger pattern family — still subordinate to regime and plan risk.");
  }

  const summary =
    level === "Unknown"
      ? "Trader fit is unknown — no DNA override applied."
      : level === "Aligned"
        ? `Trader DNA fit is supportive (${fit || "Aligned"}).`
        : level === "Conflict"
          ? `Trader DNA fit conflicts (${fit || "Poor Fit"}).`
          : `Trader DNA fit is neutral (${fit || "Neutral"}).`;

  return {
    level,
    summary,
    notes: unique(notes).slice(0, 6),
  };
}

function isCriticalBlockerText(blocker: string): boolean {
  const b = blocker.toLowerCase();
  return (
    b.includes("entry is not defined") ||
    b.includes("stop loss is not defined") ||
    b.includes("below 1:1") ||
    b.includes("high-urgency news") ||
    b.includes("unacceptable")
  );
}

function inferReadinessState(score: number): ReadinessState {
  if (score >= READINESS_HIGH) return "High-Quality Setup";
  if (score >= READINESS_ACTIONABLE) return "Ready With Caution";
  if (score >= READINESS_DEVELOPING) return "Developing";
  if (score >= READINESS_NOT_READY) return "Incomplete";
  return "Not Ready";
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

const REGIME_LEVEL_RANK: Record<JudgmentRegimeEffect["level"], number> = {
  Supportive: 0,
  Neutral: 1,
  Unknown: 2,
  Cautionary: 3,
  Hostile: 4,
};

/** Never de-escalate a more severe regime effect once set. */
function escalateRegimeLevel(
  current: JudgmentRegimeEffect["level"],
  next: JudgmentRegimeEffect["level"],
): JudgmentRegimeEffect["level"] {
  return REGIME_LEVEL_RANK[next] > REGIME_LEVEL_RANK[current] ? next : current;
}

/** @deprecated Prefer buildRegimeEffect(...).level === "Hostile" */
export function isRegimeHostile(regime: MarketRegime): boolean {
  return buildRegimeEffect(regime).level === "Hostile";
}

/** @deprecated Prefer buildRegimeEffect(...).level === "Cautionary" | "Hostile" */
export function isRegimeCaution(regime: MarketRegime): boolean {
  const level = buildRegimeEffect(regime).level;
  return level === "Cautionary" || level === "Hostile";
}
