/**
 * Intelligence v3 Phase 1 — silent shadow mode tests.
 * Product pipeline remains sole authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildIntelligenceV3,
  clearIntelligenceV3Shadows,
  getRecentIntelligenceV3Shadows,
  isIntelligenceV3ShadowEnabled,
  runIntelligenceV3Shadow,
  runIntelligenceV3ShadowWithBuilder,
  toV3Input,
  V3_SHADOW_RING_BUFFER_CAPACITY,
} from "../lib/intelligence-v3";
import { buildWorkspaceDataQuality } from "../lib/market-data";

function fixtureQuality() {
  return buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "1H",
    quoteQuality: "Fixture",
    candleQuality: "Fixture",
    provider: "fixture",
    liveMarketDataEnabled: false,
  });
}

function delayedQuality() {
  return buildWorkspaceDataQuality({
    symbol: "ETH",
    timeframe: "1H",
    quoteQuality: "Delayed",
    candleQuality: "Delayed",
    provider: "coingecko",
    liveMarketDataEnabled: true,
  });
}

function unsupportedQuality() {
  return buildWorkspaceDataQuality({
    symbol: "BTC",
    timeframe: "5m",
    quoteQuality: "Delayed",
    candleQuality: "Unavailable",
    provider: "coingecko",
    error: {
      code: "UNSUPPORTED",
      message: "Phase 1 live crypto does not support 1m–30m.",
      retryable: false,
      provider: "coingecko",
    },
    liveMarketDataEnabled: true,
  });
}

const productSnapshot = {
  confidence: 85,
  readiness: 40,
  tradeQuality: 80,
  hermesScore: 80,
};

function productClone() {
  return {
    confidence: productSnapshot.confidence,
    readiness: productSnapshot.readiness,
    tradeQuality: productSnapshot.tradeQuality,
    hermesScore: productSnapshot.hermesScore,
  };
}

test("feature flag: explicit off/on and default env behavior", () => {
  assert.equal(
    isIntelligenceV3ShadowEnabled({
      NODE_ENV: "production",
      HERMES_INTELLIGENCE_V3_SHADOW: "0",
    }),
    false,
  );
  assert.equal(
    isIntelligenceV3ShadowEnabled({
      NODE_ENV: "production",
      HERMES_INTELLIGENCE_V3_SHADOW: "1",
    }),
    true,
  );
  assert.equal(
    isIntelligenceV3ShadowEnabled({ NODE_ENV: "development" }),
    true,
  );
  assert.equal(
    isIntelligenceV3ShadowEnabled({ NODE_ENV: "test" }),
    true,
  );
  assert.equal(
    isIntelligenceV3ShadowEnabled({
      NODE_ENV: "production",
      NEXT_PUBLIC_HERMES_INTELLIGENCE_V3_SHADOW: "1",
    }),
    true,
  );
});

test("shadow on/off leaves product scores identical (no mutation)", () => {
  clearIntelligenceV3Shadows();
  const before = productClone();
  const inputScores = {
    confidence: { score: before.confidence },
    tradeReadiness: {
      score: before.readiness,
      state: "Not Ready",
      blockers: ["Await trigger"],
    },
    tradeQuality: { score: before.tradeQuality, grade: "B+" },
  };

  // Shadow on
  const record = runIntelligenceV3Shadow({
    symbol: "BTC",
    timeframe: "1H",
    ...inputScores,
    dataQuality: fixtureQuality(),
    skipRecord: false,
    silent: true,
    timestamp: 1_700_000_000_000,
  });
  assert.equal(record.ok, true);
  assert.equal(record.authority, "current-pipeline");

  // Product snapshot unchanged
  const after = productClone();
  assert.deepEqual(after, before);
  assert.equal(inputScores.confidence.score, before.confidence);
  assert.equal(inputScores.tradeReadiness.score, before.readiness);
  assert.equal(inputScores.tradeQuality.score, before.tradeQuality);

  // Shadow off path simply does not run — product still identical
  assert.equal(
    isIntelligenceV3ShadowEnabled({
      NODE_ENV: "production",
      HERMES_INTELLIGENCE_V3_SHADOW: "0",
    }),
    false,
  );
  assert.deepEqual(productClone(), before);
});

test("v3 builder failure cannot break shadow host (try/catch isolation)", () => {
  clearIntelligenceV3Shadows();
  const record = runIntelligenceV3ShadowWithBuilder(
    {
      symbol: "BTC",
      timeframe: "1H",
      confidence: { score: 70 },
      tradeReadiness: { score: 60 },
      tradeQuality: { score: 70 },
      dataQuality: fixtureQuality(),
      silent: true,
      timestamp: 1_700_000_000_000,
    },
    () => {
      throw new Error("forced v3 failure");
    },
  );
  assert.equal(record.ok, false);
  assert.equal(record.authority, "current-pipeline");
  assert.match(record.error ?? "", /forced v3 failure/);
  assert.ok(record.warnings.some((w) => /remains authoritative/i.test(w)));
  // Host continues — product numbers untouched
  assert.equal(productSnapshot.confidence, 85);
  assert.equal(getRecentIntelligenceV3Shadows().length, 1);
});

test("mirrored scores remain identical to product inputs", () => {
  clearIntelligenceV3Shadows();
  const record = runIntelligenceV3Shadow({
    symbol: "BTC",
    timeframe: "1H",
    confidence: { score: 85, thesisSummary: "Constructive structure" },
    tradeReadiness: {
      score: 40,
      state: "Not Ready",
      blockers: ["No confirmation"],
    },
    tradeQuality: { score: 80, grade: "B+" },
    dataQuality: fixtureQuality(),
    silent: true,
    timestamp: 1_700_000_000_000,
  });
  assert.equal(record.ok, true);
  assert.equal(record.mirrored?.confidenceScore, 85);
  assert.equal(record.mirrored?.tradeReadinessScore, 40);
  assert.equal(record.mirrored?.tradeQualityScore, 80);
});

test("fixture / delayed / unsupported produce expected v3 package signals", () => {
  clearIntelligenceV3Shadows();

  const fixture = runIntelligenceV3Shadow({
    symbol: "BTC",
    timeframe: "1H",
    confidence: { score: 70 },
    tradeReadiness: { score: 60 },
    tradeQuality: { score: 70 },
    dataQuality: fixtureQuality(),
    silent: true,
    timestamp: 1,
  });
  assert.equal(fixture.ok, true);
  assert.equal(fixture.flags?.isFixturePractice, true);
  assert.equal(fixture.flags?.isLiveFeed, false);
  assert.equal(fixture.severity, "info");
  assert.match(fixture.headlineCaveat ?? "", /Practice fixtures/i);
  assert.ok(fixture.caveatIds?.includes("dq-fixture"));

  const delayed = runIntelligenceV3Shadow({
    symbol: "ETH",
    timeframe: "1H",
    confidence: { score: 70 },
    tradeReadiness: { score: 60 },
    tradeQuality: { score: 70 },
    dataQuality: delayedQuality(),
    silent: true,
    timestamp: 2,
  });
  assert.equal(delayed.flags?.isDelayedFeed, true);
  assert.equal(delayed.severity, "caution");
  assert.match(delayed.headlineCaveat ?? "", /Delayed public data/i);

  const unsupported = runIntelligenceV3Shadow({
    symbol: "BTC",
    timeframe: "5m",
    confidence: { score: 70 },
    tradeReadiness: { score: 60 },
    tradeQuality: { score: 70 },
    dataQuality: unsupportedQuality(),
    silent: true,
    timestamp: 3,
  });
  assert.equal(unsupported.flags?.isTimeframeUnsupported, true);
  assert.equal(unsupported.severity, "block-process");
  assert.match(
    unsupported.headlineCaveat ?? "",
    /additional confirmation before relying/i,
  );
  // Process caution only — scores still mirrored
  assert.equal(unsupported.mirrored?.confidenceScore, 70);
});

test("shadow record stores only debug fields (no trades/positions)", () => {
  clearIntelligenceV3Shadows();
  const record = runIntelligenceV3Shadow({
    symbol: "BTC",
    timeframe: "1H",
    confidence: { score: 70 },
    tradeReadiness: { score: 60 },
    tradeQuality: { score: 70 },
    dataQuality: fixtureQuality(),
    silent: true,
  });
  const json = JSON.stringify(record);
  assert.doesNotMatch(json, /"positions"|"openPosition"|"journalEntries"|"cash"|userEmail/i);
  assert.ok(record.deterministicKey);
  assert.ok(Array.isArray(record.caveatIds));
  assert.ok(record.flags);
  assert.ok(record.severity);
  assert.ok(record.headlineCaveat);
});

test("ring buffer capacity is bounded", () => {
  clearIntelligenceV3Shadows();
  for (let i = 0; i < V3_SHADOW_RING_BUFFER_CAPACITY + 5; i += 1) {
    runIntelligenceV3Shadow({
      symbol: "BTC",
      timeframe: "1H",
      confidence: { score: 50 + (i % 10) },
      tradeReadiness: { score: 50 },
      tradeQuality: { score: 50 },
      dataQuality: fixtureQuality(),
      silent: true,
      timestamp: i,
    });
  }
  assert.equal(
    getRecentIntelligenceV3Shadows().length,
    V3_SHADOW_RING_BUFFER_CAPACITY,
  );
});

test("toV3Input does not share mutable blocker arrays with caller", () => {
  const blockers = ["A"];
  const input = toV3Input({
    symbol: "BTC",
    timeframe: "1H",
    confidence: { score: 70 },
    tradeReadiness: { score: 40, blockers },
    tradeQuality: { score: 70 },
  });
  blockers.push("B");
  assert.deepEqual(input.tradeReadiness.blockers, ["A"]);
});

test("direct buildIntelligenceV3 parity with shadow path", () => {
  const shadowInput = {
    symbol: "BTC" as const,
    timeframe: "1H",
    confidence: { score: 72, thesisSummary: "Range" },
    tradeReadiness: { score: 55, state: "Developing" as string },
    tradeQuality: { score: 68, grade: "B" },
    dataQuality: fixtureQuality(),
    multiTimeframe: {
      alignmentScore: 40,
      status: "Conflict",
      countertrendWarning: "HTF conflict",
    },
    silent: true as const,
    skipRecord: true as const,
    timestamp: 99,
  };
  const viaShadow = runIntelligenceV3Shadow(shadowInput);
  const viaBuild = buildIntelligenceV3(toV3Input(shadowInput));
  assert.equal(viaShadow.mirrored?.confidenceScore, viaBuild.mirrored.confidenceScore);
  assert.equal(viaShadow.deterministicKey, viaBuild.deterministicKey);
  assert.equal(viaShadow.severity, viaBuild.severity);
  assert.deepEqual(viaShadow.caveatIds, viaBuild.caveats.map((c) => c.id));
});

test("shadow-mode and dashboard hook isolation from frozen engines", async () => {
  const shadowSrc = await fs.promises.readFile(
    path.join(process.cwd(), "lib", "intelligence-v3", "shadow-mode.ts"),
    "utf8",
  );
  assert.doesNotMatch(shadowSrc, /reasoning-engine|trade-quality-engine|hermes-score-engine|confidence-engine/);
  assert.doesNotMatch(shadowSrc, /paper-trading|learning-engine|CryptoMarketDataProvider|coingecko\.com/);
  assert.doesNotMatch(shadowSrc, /from ["']@\/components\//);

  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  assert.match(dash, /intelligence-v3\/shadow-mode/);
  assert.match(dash, /runIntelligenceV3Shadow/);
  assert.match(dash, /workspaceDataQuality/);
  // Still does not statically import scoring engines for v3
  assert.doesNotMatch(
    dash,
    /from ["']@\/lib\/intelligence-v3\/build-intelligence-v3/,
  );
});

test("dashboard still does not render v3 package fields", async () => {
  const dash = await fs.promises.readFile(
    path.join(process.cwd(), "components", "hermes-dashboard.tsx"),
    "utf8",
  );
  assert.doesNotMatch(dash, /headlineCaveat=\{|severity=\{.*v3|IntelligenceV3Package/);
  assert.doesNotMatch(dash, /getRecentIntelligenceV3Shadows/);
});
