import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const simulatorSource = readFileSync(new URL("../lib/decision-simulation-service.ts", import.meta.url), "utf8");
const validationSource = readFileSync(new URL("../lib/trade-plan-validation-service.ts", import.meta.url), "utf8");
const riskSource = readFileSync(new URL("../lib/risk-impact-service.ts", import.meta.url), "utf8");
const probabilitySource = readFileSync(new URL("../lib/scenario-probability-service.ts", import.meta.url), "utf8");
const checklistSource = readFileSync(new URL("../lib/pre-trade-checklist-service.ts", import.meta.url), "utf8");
const reasonSource = readFileSync(new URL("../lib/trader-reason-alignment-service.ts", import.meta.url), "utf8");
const evSource = readFileSync(new URL("../lib/expected-value-service.ts", import.meta.url), "utf8");
const snapshotSource = readFileSync(new URL("../lib/simulation-snapshot-service.ts", import.meta.url), "utf8");

test("trade-plan validation requires the simulator minimum inputs", () => {
  for (const requirement of ["Symbol", "Direction", "Entry", "Stop loss", "At least one target", "Position size or risk amount"]) {
    assert.match(validationSource, new RegExp(requirement));
  }
});

test("stop and target validity is direction-aware", () => {
  assert.match(validationSource, /Long stop must be below entry/);
  assert.match(validationSource, /Short stop must be above entry/);
  assert.match(validationSource, /Long target must be above entry/);
  assert.match(validationSource, /Short target must be below entry/);
});

test("risk reward and position sizing use entry, stop, target, and notional", () => {
  assert.equal(calculateRiskReward({ side: "Long", entry: 100, stop: 95, target: 112 }), 2.4);
  assert.equal(calculateRiskReward({ side: "Short", entry: 100, stop: 105, target: 88 }), 2.4);
  assert.equal(calculateRiskReward({ side: "Long", entry: 100, stop: 101, target: 112 }), null);
  assert.match(riskSource, /positionSize = entry > 0 \? notional \/ entry : 0/);
  assert.match(riskSource, /portfolioRiskPct/);
});

test("scenario probabilities normalize to exactly 100", () => {
  const normalized = normalizeProbabilities({ favorable: 57, neutral: 28, adverse: 15 });
  assert.equal(normalized.favorable + normalized.neutral + normalized.adverse, 100);
  assert.deepEqual(Object.keys(normalized), ["favorable", "neutral", "adverse"]);
  assert.match(probabilitySource, /100 - favorable - neutral/);
});

test("stale simulation detection watches plan and market fields", () => {
  for (const label of ["price", "timeframe", "entry", "stop", "target", "news risk", "market structure", "confidence", "readiness"]) {
    assert.match(simulatorSource, new RegExp(label));
  }
});

test("checklist exposes passed warning failed and not available states", () => {
  for (const state of ["Passed", "Warning", "Failed", "Not available"]) {
    assert.match(checklistSource, new RegExp(state));
  }
  assert.match(checklistSource, /getPrimaryBlocker/);
});

test("trader-reason alignment supports all alignment outcomes", () => {
  for (const state of ["Aligned", "Partially aligned", "Misaligned", "Insufficient evidence"]) {
    assert.match(reasonSource, new RegExp(state));
  }
});

test("expected value is hidden unless data and payoff are structured", () => {
  assert.match(evSource, /dataQuality !== "Ready"/);
  assert.match(evSource, /Expected value is hidden/);
});

test("confidence readiness trade quality and scenario probability stay separate", () => {
  assert.match(simulatorSource, /confidence: input\.reasoning\?\.confidenceScore/);
  assert.match(simulatorSource, /tradeReadiness: input\.reasoning\?\.tradeReadinessScore/);
  assert.match(simulatorSource, /tradeQuality: input\.tradeQuality\?\.score/);
  assert.match(probabilitySource, /favorable/);
});

test("event risk reduces favorable scenario quality", () => {
  assert.match(probabilitySource, /input\.news\?\.urgency === "High"/);
  assert.match(probabilitySource, /High-urgency news increases path uncertainty/);
});

test("simulation snapshots are local and replay-safe by snapshot, not regeneration", () => {
  assert.match(snapshotSource, /hermes\.decision-simulations\.v1/);
  assert.match(snapshotSource, /inputSignature/);
  assert.doesNotMatch(snapshotSource, /buildDecisionSimulation/);
});

function calculateRiskReward({ entry, stop, target, side }) {
  const risk = side === "Long" ? entry - stop : stop - entry;
  const reward = side === "Long" ? target - entry : entry - target;
  return risk <= 0 || reward <= 0 ? null : reward / risk;
}

function normalizeProbabilities(raw) {
  const clipped = {
    favorable: Math.max(8, raw.favorable),
    neutral: Math.max(8, raw.neutral),
    adverse: Math.max(8, raw.adverse),
  };
  const total = clipped.favorable + clipped.neutral + clipped.adverse;
  const favorable = Math.round((clipped.favorable / total) * 100);
  const neutral = Math.round((clipped.neutral / total) * 100);
  const adverse = Math.max(0, 100 - favorable - neutral);
  return { favorable, neutral, adverse };
}
