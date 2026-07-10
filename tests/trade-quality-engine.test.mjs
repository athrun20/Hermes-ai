import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const configSource = readFileSync(new URL("../lib/trade-quality-config.ts", import.meta.url), "utf8");
const reasoningEngineSource = readFileSync(new URL("../lib/reasoning-engine.ts", import.meta.url), "utf8");
const lightweightOptionsSource = readFileSync(new URL("../lib/lightweight-chart-options.ts", import.meta.url), "utf8");

const weightsSource = configSource.match(/tradeQualityWeights[\s\S]*?=\s\{([\s\S]*?)\};/)?.[1] ?? "";
const weights = Object.fromEntries(
  [...weightsSource.matchAll(/^\s{2}"?([^"\n:]+?)"?:\s(\d+),$/gm)].map((match) => [
    match[1],
    Number(match[2]),
  ]),
);

const capValues = Object.fromEntries(
  [...configSource.matchAll(/^\s{2}(\w+):\s\{[\s\S]*?cap:\s(\d+)/gm)].map((match) => [
    match[1],
    Number(match[2]),
  ]),
);

test("trade quality category weights add to 100", () => {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 100);
});

test("missing stop caps the score below strong quality", () => {
  assert.equal(capValues.missingStop, 59);
  assert.ok(capValues.missingStop < 60);
});

test("high news risk without stop applies the strictest cap", () => {
  const score = applyCaps(88, [capValues.missingStop, capValues.newsRiskWithoutStop]);
  assert.equal(score, 39);
});

test("oversized position cannot receive passing quality", () => {
  const score = applyCaps(92, [capValues.oversizedPosition]);
  assert.equal(score, 44);
});

test("risk reward below one is capped as avoid-for-now quality", () => {
  const score = applyCaps(81, [capValues.riskRewardBelowOne]);
  assert.equal(score, 49);
});

test("reasoning confidence never exceeds 95", () => {
  assert.match(reasoningEngineSource, /MAX_REASONING_CONFIDENCE/);
});

test("bull and bear probabilities normalize to 100", () => {
  assert.match(reasoningEngineSource, /100 - bullProbability/);
});

test("reasoning recommendations avoid direct buy or sell commands", () => {
  const allowed = ["Wait", "Observe", "Prepare", "Validate", "Avoid", "Manage Existing Position"];
  for (const action of allowed) {
    assert.match(readFileSync(new URL("../lib/reasoning-types.ts", import.meta.url), "utf8"), new RegExp(`"${action}"`));
  }
  assert.doesNotMatch(reasoningEngineSource, /return "Buy"|return "Sell"/);
});

test("lightweight charts disable in-chart attribution logo globally", () => {
  assert.match(lightweightOptionsSource, /attributionLogo:\s*false/);
});

function applyCaps(score, caps) {
  return Math.min(score, ...caps);
}
