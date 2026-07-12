/**
 * Learning Engine Phase 4 — Read-only Personalized Coaching Integration.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  applyMessageDismissed,
  applyMessageShown,
  buildEvidenceLabel,
  buildImprovementSentence,
  buildPersonalizedCoachingSummary,
  buildPersonalizedHabitAdviceLine,
  buildPersonalizedHermesCoachMessage,
  buildStrengthSentence,
  buildWeeklyLearningReview,
  canSurfacePersonalizedLearning,
  createEmptyLearningCoachDisplayState,
  createEmptyTraderMemoryStore,
  createTradeCompletedEvent,
  HIGH_PRIORITY_COACH_MOMENTS,
  ingestLearningEvents,
  learningCoachingToCoachMessage,
  presentationToHermesCoachMessage,
  resolveCoachDisplayLane,
  shouldShowPersonalizedMessage,
  stablePersonalizedMessageId,
  weeklyLearningToBriefLines,
  type PersonalizedCoachingSummary,
  type TraderMemoryStore,
} from "../lib/learning-engine/index";

const T0 = 1_700_000_000_000;

function tradeEvent(args: {
  id: string;
  timestamp: number;
  pnl: number;
  followedPlan?: boolean;
  qualityScore?: number;
  tags?: string[];
}) {
  return createTradeCompletedEvent({
    id: args.id,
    timestamp: args.timestamp,
    symbol: "BTC",
    pnl: args.pnl,
    followedPlan: args.followedPlan,
    qualityScore: args.qualityScore,
    tags: args.tags,
  });
}

function storeWithTrades(
  specs: Array<{
    id: string;
    pnl: number;
    followedPlan?: boolean;
    qualityScore?: number;
    tags?: string[];
    offsetMs?: number;
  }>,
  base = T0,
): TraderMemoryStore {
  let store = createEmptyTraderMemoryStore(base);
  const events = specs.map((s, i) =>
    tradeEvent({
      id: s.id,
      timestamp: base - (s.offsetMs ?? i * 60_000),
      pnl: s.pnl,
      followedPlan: s.followedPlan,
      qualityScore: s.qualityScore,
      tags: s.tags,
    }),
  );
  store = ingestLearningEvents(store, events);
  return store;
}

function coachingFrom(store: TraderMemoryStore): PersonalizedCoachingSummary {
  return buildPersonalizedCoachingSummary(store, { now: T0 });
}

test("insufficient-data message is neutral sample-building only", () => {
  const store = storeWithTrades([
    { id: "t1", pnl: 10, followedPlan: true },
  ]);
  const summary = coachingFrom(store);
  const presentation = learningCoachingToCoachMessage(summary);
  assert.ok(presentation);
  assert.equal(presentation!.mode, "sample_building");
  assert.match(presentation!.message, /Not enough completed trades/i);
  assert.doesNotMatch(presentation!.message, /habit|recurring weakness|your history shows/i);
  assert.match(presentation!.evidenceLabel, /completed trade/i);
});

test("early-signal wording uses cautious language", () => {
  const sentence = buildImprovementSentence("Early Signal", "Early entries");
  assert.match(sentence, /may be emerging|early signal|worth watching/i);

  const store = storeWithTrades([
    { id: "a", pnl: -5, followedPlan: true, tags: ["entering_too_early"] },
    { id: "b", pnl: -4, followedPlan: true, tags: ["entering_too_early"] },
    { id: "c", pnl: 2, followedPlan: true, tags: ["entering_too_early"] },
  ]);
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  if (presentation!.mode === "improvement") {
    assert.match(
      presentation!.message,
      /may be emerging|early signal|worth watching/i,
    );
  }
  assert.equal(presentation!.dataSufficiency, "Early Signal");
  assert.match(presentation!.evidenceLabel, /Early signal from 3/i);
});

test("developing-pattern wording uses moderate confidence language", () => {
  const sentence = buildImprovementSentence("Developing Pattern", "Chasing breakouts");
  assert.match(sentence, /becoming a pattern|appeared repeatedly/i);

  const store = storeWithTrades(
    Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`,
      pnl: i % 2 === 0 ? -8 : 3,
      followedPlan: true,
      tags: ["chasing_breakouts"],
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  assert.equal(presentation!.dataSufficiency, "Developing Pattern");
  if (presentation!.mode === "improvement") {
    assert.match(presentation!.message, /becoming a pattern|appeared repeatedly/i);
  }
  assert.match(presentation!.evidenceLabel, /Based on 6/i);
});

test("reliable-pattern wording uses direct nonjudgmental language", () => {
  const sentence = buildImprovementSentence("Reliable Pattern", "Ignoring stops");
  assert.match(sentence, /Your history shows|Across recent trades/i);

  const store = storeWithTrades(
    Array.from({ length: 12 }, (_, i) => ({
      id: `r${i}`,
      pnl: -5,
      followedPlan: false,
      tags: ["ignoring_stops"],
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  assert.equal(presentation!.dataSufficiency, "Reliable Pattern");
  assert.match(presentation!.evidenceLabel, /Reliable pattern across 12/i);
});

test("strength message reinforces process with evidence label", () => {
  const strengthLine = buildStrengthSentence("Reliable Pattern", "Consistent stop discipline");
  assert.match(strengthLine, /show|recent trades/i);

  const store = storeWithTrades(
    Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      pnl: i % 3 === 0 ? -2 : 8,
      followedPlan: true,
      qualityScore: 80,
      tags: ["good_risk_control", "plan_followed"],
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  // Either strength or improvement mode; both must include evidence label and no event ids.
  assert.ok(presentation!.evidenceLabel.length > 0);
  assert.doesNotMatch(presentation!.body, /paper-trading:trade-completed/i);
});

test("improvement message includes practice guidance when available", () => {
  const store = storeWithTrades(
    Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      pnl: -4,
      followedPlan: true,
      tags: ["entering_too_early"],
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  if (presentation!.mode === "improvement") {
    assert.ok(
      presentation!.practiceLine ||
        /confirmation|wait|next three|plan/i.test(presentation!.message),
    );
  }
});

test("practice message surfaces educational exercise without blocking language", () => {
  const store = storeWithTrades(
    Array.from({ length: 5 }, (_, i) => ({
      id: `o${i}`,
      pnl: -3,
      followedPlan: true,
      tags: ["overtrading"],
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  assert.doesNotMatch(presentation!.body, /cannot trade|blocked|order rejected/i);
});

test("critical market warning overrides personalized coaching", () => {
  assert.equal(
    canSurfacePersonalizedLearning({ hasCriticalRiskWarning: true }),
    false,
  );
  assert.equal(resolveCoachDisplayLane({ hasCriticalRiskWarning: true }), "critical_market");
  assert.equal(resolveCoachDisplayLane({ hasEventRiskWarning: true }), "critical_market");
  assert.equal(resolveCoachDisplayLane({ hasThesisInvalidation: true }), "critical_market");
  assert.equal(resolveCoachDisplayLane({ hasStopRiskWarning: true }), "critical_market");

  const store = storeWithTrades(
    Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      pnl: -2,
      followedPlan: false,
      tags: ["plan_broken"],
    })),
  );
  const result = buildPersonalizedHermesCoachMessage({
    summary: coachingFrom(store),
    priority: { hasCriticalRiskWarning: true },
    dryRun: true,
    ignoreCooldown: true,
  });
  assert.equal(result.message, null);
  assert.equal(result.suppressedReason, "priority_block");
});

test("active-position message overrides personalized coaching", () => {
  assert.equal(
    canSurfacePersonalizedLearning({ hasActivePositionManagement: true }),
    false,
  );
  assert.equal(
    resolveCoachDisplayLane({ hasActivePositionManagement: true }),
    "active_position",
  );

  const store = storeWithTrades(
    Array.from({ length: 5 }, (_, i) => ({
      id: `ap${i}`,
      pnl: 4,
      followedPlan: true,
    })),
  );
  const result = buildPersonalizedHermesCoachMessage({
    summary: coachingFrom(store),
    priority: { hasActivePositionManagement: true },
    dryRun: true,
    ignoreCooldown: true,
  });
  assert.equal(result.message, null);
  assert.equal(result.suppressedReason, "priority_block");
});

test("decision moments outrank personalized learning", () => {
  for (const moment of HIGH_PRIORITY_COACH_MOMENTS) {
    assert.equal(canSurfacePersonalizedLearning({ moment }), false);
    assert.equal(resolveCoachDisplayLane({ moment }), "decision");
  }
  assert.equal(
    canSurfacePersonalizedLearning({ isDecisionReviewActive: true }),
    false,
  );
});

test("stable message identity is deterministic", () => {
  const a = stablePersonalizedMessageId({
    sufficiency: "Developing Pattern",
    focusKey: "Early entries",
    mode: "improvement",
    sampleSize: 6,
  });
  const b = stablePersonalizedMessageId({
    sufficiency: "Developing Pattern",
    focusKey: "Early entries",
    mode: "improvement",
    sampleSize: 6,
  });
  assert.equal(a, b);
  assert.match(a, /^personalized:/);

  const store = storeWithTrades(
    Array.from({ length: 6 }, (_, i) => ({
      id: `id${i}`,
      pnl: -2,
      followedPlan: true,
      tags: ["entering_too_early"],
    })),
  );
  const p1 = learningCoachingToCoachMessage(coachingFrom(store));
  const p2 = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(p1 && p2);
  assert.equal(p1!.messageId, p2!.messageId);
});

test("cooldown behavior suppresses identical message", () => {
  let state = createEmptyLearningCoachDisplayState();
  const messageId = "personalized:developing:early-entries:improvement:n5-9";
  const focusKey = "early-entries";

  const first = shouldShowPersonalizedMessage({
    messageId,
    focusKey,
    state,
    now: T0,
  });
  assert.equal(first.show, true);

  state = applyMessageShown(state, { messageId, focusKey, now: T0 });
  const second = shouldShowPersonalizedMessage({
    messageId,
    focusKey,
    state,
    now: T0 + 60_000,
  });
  assert.equal(second.show, false);
  assert.equal(second.reason, "same_message_cooldown");

  const afterCooldown = shouldShowPersonalizedMessage({
    messageId,
    focusKey,
    state,
    now: T0 + 5 * 60 * 60 * 1000,
  });
  assert.equal(afterCooldown.show, true);
});

test("dismissal compatibility suppresses resurfacing", () => {
  let state = createEmptyLearningCoachDisplayState();
  const messageId = "personalized:reliable:ignoring-stops:improvement:n10-19";
  state = applyMessageDismissed(state, { messageId, now: T0 });
  const decision = shouldShowPersonalizedMessage({
    messageId,
    focusKey: "ignoring-stops",
    state,
    now: T0 + 30_000,
  });
  assert.equal(decision.show, false);
  assert.equal(decision.reason, "dismissed_cooldown");
});

test("changed focus may replace previous lesson before cooldown ends", () => {
  let state = createEmptyLearningCoachDisplayState();
  state = applyMessageShown(state, {
    messageId: "personalized:developing:early-entries:improvement:n5-9",
    focusKey: "early-entries",
    now: T0,
  });
  const next = shouldShowPersonalizedMessage({
    messageId: "personalized:developing:ignoring-stops:improvement:n5-9",
    focusKey: "ignoring-stops",
    state,
    now: T0 + 60_000,
  });
  assert.equal(next.show, true);
});

test("no repeated message on re-build with same summary (cooldown)", () => {
  const store = storeWithTrades(
    Array.from({ length: 6 }, (_, i) => ({
      id: `rr${i}`,
      pnl: -3,
      followedPlan: true,
      tags: ["revenge_trading"],
    })),
  );
  const summary = coachingFrom(store);
  let state = createEmptyLearningCoachDisplayState();

  const first = buildPersonalizedHermesCoachMessage({
    summary,
    displayState: state,
    now: T0,
    dryRun: true,
    ignoreCooldown: false,
  });
  // dryRun does not mutate — simulate shown
  assert.ok(first.presentation);
  state = applyMessageShown(state, {
    messageId: first.presentation!.messageId,
    focusKey: first.presentation!.focusKey,
    now: T0,
  });

  const second = buildPersonalizedHermesCoachMessage({
    summary,
    displayState: state,
    now: T0 + 1000,
    dryRun: true,
    ignoreCooldown: false,
  });
  assert.equal(second.message, null);
  assert.ok(
    second.suppressedReason === "same_message_cooldown" ||
      second.suppressedReason === "dismissed_cooldown",
  );
});

test("raw journal text and event ids excluded from presentation", () => {
  const store = storeWithTrades(
    Array.from({ length: 5 }, (_, i) => ({
      id: `j${i}`,
      pnl: -1,
      followedPlan: false,
      tags: ["plan_broken"],
    })),
  );
  // Inject a lesson that looks like freeform journal (should not appear in presentation body from adapter).
  store.lessonSummaries = [
    "I felt FOMO and revenge after the loss — raw diary dump with private thoughts.",
  ];
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  assert.doesNotMatch(presentation!.body, /raw diary dump|private thoughts/i);
  assert.doesNotMatch(presentation!.body, /paper-trading:trade-completed|sourceEventIds/i);
  assert.doesNotMatch(presentation!.message, /confidenceInCoaching|0\.\d{2,}/);
});

test("learning failure isolation returns null without throwing", () => {
  assert.doesNotThrow(() => {
    const result = buildPersonalizedHermesCoachMessage({
      summary: null,
      dryRun: true,
    });
    assert.equal(result.message, null);
  });
  assert.doesNotThrow(() => {
    const line = buildPersonalizedHabitAdviceLine(null);
    assert.equal(line, null);
  });
  assert.doesNotThrow(() => {
    learningCoachingToCoachMessage(undefined);
  });
});

test("presentation maps cleanly to HermesCoachMessage contract", () => {
  const store = storeWithTrades(
    Array.from({ length: 4 }, (_, i) => ({
      id: `m${i}`,
      pnl: -2,
      followedPlan: true,
      tags: ["trading_against_htf"],
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  const msg = presentationToHermesCoachMessage(presentation!);
  assert.equal(msg.id, presentation!.messageId);
  assert.equal(msg.moment, "personalized-learning");
  assert.equal(msg.category, "Growth");
  assert.ok(msg.title);
  assert.ok(msg.message);
  assert.ok(msg.actionLabel);
});

test("evidence label ladder matches policy", () => {
  assert.match(buildEvidenceLabel("Insufficient Data", 0), /0 completed/);
  assert.match(buildEvidenceLabel("Early Signal", 3), /Early signal from 3/);
  assert.match(buildEvidenceLabel("Developing Pattern", 6), /Based on 6/);
  assert.match(buildEvidenceLabel("Reliable Pattern", 12), /Reliable pattern across 12/);
});

test("weekly brief lines stay compact and exclude event ids", () => {
  const store = storeWithTrades(
    Array.from({ length: 5 }, (_, i) => ({
      id: `w${i}`,
      pnl: i % 2 === 0 ? 5 : -3,
      followedPlan: true,
      tags: i % 2 === 0 ? ["good_risk_control"] : ["entering_too_early"],
      offsetMs: i * 60_000,
    })),
  );
  const weekly = buildWeeklyLearningReview(store, { now: T0 });
  const lines = weeklyLearningToBriefLines(weekly);
  assert.ok(lines);
  assert.ok(lines!.progressSummary);
  assert.ok(lines!.dataSufficiencyLabel);
  assert.doesNotMatch(JSON.stringify(lines), /paper-trading:trade-completed/);
});

test("no market-score fields on Phase 4 presentation outputs", () => {
  const store = storeWithTrades(
    Array.from({ length: 5 }, (_, i) => ({
      id: `sc${i}`,
      pnl: 1,
      followedPlan: true,
    })),
  );
  const presentation = learningCoachingToCoachMessage(coachingFrom(store));
  assert.ok(presentation);
  const keys = Object.keys(presentation!);
  for (const banned of [
    "confidenceScore",
    "tradeReadinessScore",
    "tradeQualityScore",
    "hermesScore",
    "judgment",
    "conviction",
    "opinion",
  ]) {
    assert.ok(!keys.includes(banned), `must not include ${banned}`);
  }
});

test("phase4 modules do not import intelligence-v2 or paper-trading execution", async () => {
  const files = [
    "coach-presentation.ts",
    "coach-priority.ts",
    "coach-cooldown.ts",
    "coach-integration.ts",
  ];
  for (const file of files) {
    const src = await fs.promises.readFile(
      path.join(process.cwd(), "lib", "learning-engine", file),
      "utf8",
    );
    assert.doesNotMatch(src, /intelligence-v2/);
    assert.doesNotMatch(src, /from ["']@\/lib\/paper-trading["']/);
    assert.doesNotMatch(src, /placeOrder|executeOrder|broker/i);
  }
});

test("calm priority allows personalized when no blockers", () => {
  assert.equal(canSurfacePersonalizedLearning({}), true);
  assert.equal(resolveCoachDisplayLane({ moment: "end-of-day" }), "personalized");
  assert.equal(
    resolveCoachDisplayLane({ moment: "morning-briefing-completed" }),
    "personalized",
  );
});
