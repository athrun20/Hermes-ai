/**
 * Intelligence v3 Phase 0 — pure interpretation package tests.
 * No UI, no score engines, no paper trading.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildIntelligenceV3,
  FORBIDDEN_PHRASES,
  findForbiddenPhrases,
  type IntelligenceV3Input,
  type IntelligenceV3Package,
} from "../lib/intelligence-v3";
import { buildWorkspaceDataQuality } from "../lib/market-data";

function baseInput(
  overrides: Partial<IntelligenceV3Input> = {},
): IntelligenceV3Input {
  return {
    symbol: "BTC",
    timeframe: "1H",
    confidence: { score: 70, thesisSummary: "Structure constructive" },
    tradeReadiness: { score: 60, state: "Developing", blockers: [] },
    tradeQuality: { score: 72, grade: "B", notes: ["Stop defined"] },
    ...overrides,
  };
}

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

function collectPackageText(pkg: IntelligenceV3Package): string[] {
  return [
    pkg.headlineCaveat,
    pkg.uncertainty.summary,
    ...pkg.uncertainty.drivers,
    ...pkg.uncertainty.whatWouldReduceUncertainty,
    ...pkg.caveats.flatMap((c) => [c.title, c.detail, c.processGuidance]),
    ...pkg.missingConfirmations.flatMap((m) => [m.label, m.whyItMatters]),
    ...pkg.contextNotes.map((n) => n.text),
    ...pkg.warnings,
  ];
}

test("same input always produces same package (determinism)", () => {
  const input = baseInput({ dataQuality: fixtureQuality() });
  const a = buildIntelligenceV3(input);
  const b = buildIntelligenceV3(input);
  assert.deepEqual(a, b);
  assert.equal(a.deterministicKey, b.deterministicKey);
  assert.equal(a.kind, "hermes-intelligence-v3");
});

test("mirrored scores equal input scores exactly", () => {
  const input = baseInput({
    confidence: { score: 85 },
    tradeReadiness: { score: 42, state: "Not Ready", blockers: ["No trigger"] },
    tradeQuality: { score: 80, grade: "B+" },
    dataQuality: fixtureQuality(),
  });
  const pkg = buildIntelligenceV3(input);
  assert.equal(pkg.mirrored.confidenceScore, 85);
  assert.equal(pkg.mirrored.tradeReadinessScore, 42);
  assert.equal(pkg.mirrored.tradeQualityScore, 80);
  // Must not invent a "lowered confidence"
  assert.notEqual(pkg.mirrored.confidenceScore, 42);
});

test("no new scoring fields on package", () => {
  const pkg = buildIntelligenceV3(baseInput({ dataQuality: fixtureQuality() }));
  const json = JSON.stringify(pkg);
  assert.doesNotMatch(json, /"convictionScore"|"judgmentScore"|"accuracyScore"|"newConfidence"/i);
  assert.equal("conviction" in pkg, false);
  assert.equal("judgment" in pkg, false);
  assert.equal("accuracy" in pkg, false);
  // Only mirrored product scores
  assert.ok("confidenceScore" in pkg.mirrored);
  assert.ok("tradeReadinessScore" in pkg.mirrored);
});

test("fixture data is never labeled live", () => {
  const pkg = buildIntelligenceV3(
    baseInput({ dataQuality: fixtureQuality() }),
  );
  assert.equal(pkg.flags.isFixturePractice, true);
  assert.equal(pkg.flags.isLiveFeed, false);
  assert.equal(pkg.severity, "info");
  assert.match(
    pkg.headlineCaveat,
    /Practice fixtures — treat levels as teaching context, not live market marks/i,
  );
  assert.equal(pkg.flags.isFixturePractice && pkg.flags.isLiveFeed, false);
});

test("delayed data creates caution context", () => {
  const pkg = buildIntelligenceV3(
    baseInput({
      symbol: "ETH",
      dataQuality: delayedQuality(),
    }),
  );
  assert.equal(pkg.flags.isDelayedFeed, true);
  assert.equal(pkg.flags.isFixturePractice, false);
  assert.equal(pkg.severity, "caution");
  assert.match(
    pkg.headlineCaveat,
    /Delayed public data — interpretation should account for feed limitations/i,
  );
});

test("unsupported timeframe creates block-process warning", () => {
  const pkg = buildIntelligenceV3(
    baseInput({
      timeframe: "5m",
      dataQuality: unsupportedQuality(),
    }),
  );
  assert.equal(pkg.flags.isTimeframeUnsupported, true);
  assert.equal(pkg.severity, "block-process");
  assert.match(
    pkg.headlineCaveat,
    /This timeframe requires additional confirmation before relying on the analysis/i,
  );
  assert.ok(
    pkg.missingConfirmations.some((m) => m.id === "mc-supported-series"),
  );
  // Scores still mirrored unchanged
  assert.equal(pkg.mirrored.confidenceScore, 70);
});

test("high confidence + low readiness keeps scores and separates concepts", () => {
  const pkg = buildIntelligenceV3(
    baseInput({
      confidence: { score: 85, thesisSummary: "Bullish structure" },
      tradeReadiness: {
        score: 35,
        state: "Not Ready",
        blockers: ["Await trigger"],
      },
      tradeQuality: { score: 80, grade: "B+" },
      dataQuality: fixtureQuality(),
    }),
  );
  assert.equal(pkg.mirrored.confidenceScore, 85);
  assert.equal(pkg.mirrored.tradeReadinessScore, 35);
  assert.equal(pkg.mirrored.tradeQualityScore, 80);
  assert.ok(
    pkg.caveats.some((c) => c.id === "rd-high-conf-low-ready") ||
      /additional confirmation|not execution readiness|Strong analytical thesis/i.test(
        pkg.headlineCaveat + pkg.caveats.map((c) => c.detail).join(" "),
      ),
  );
  // Incorrect behavior would lower confidence
  assert.notEqual(pkg.mirrored.confidenceScore, 35);
});

test("MTF conflicts create confirmation notes only", () => {
  const pkg = buildIntelligenceV3(
    baseInput({
      dataQuality: fixtureQuality(),
      multiTimeframe: {
        alignmentScore: 30,
        status: "Conflict",
        pattern: "Mixed conditions",
        countertrendWarning: "Lower TF opposes higher TF bias.",
      },
    }),
  );
  assert.equal(pkg.flags.hasMtfConflict, true);
  assert.ok(pkg.missingConfirmations.some((m) => m.relatedMetric === "mtf"));
  assert.ok(pkg.caveats.some((c) => c.category === "alignment"));
  // Confidence unchanged
  assert.equal(pkg.mirrored.confidenceScore, 70);
});

test("missing optional inputs fail softly", () => {
  const pkg = buildIntelligenceV3({
    symbol: "BTC",
    timeframe: "1H",
    confidence: { score: 55 },
    tradeReadiness: { score: 50 },
    // no dataQuality, mtf, tq, shadow
  });
  assert.equal(pkg.kind, "hermes-intelligence-v3");
  assert.equal(pkg.mirrored.confidenceScore, 55);
  assert.equal(pkg.mirrored.tradeReadinessScore, 50);
  assert.equal(pkg.mirrored.tradeQualityScore, undefined);
  assert.ok(pkg.warnings.length > 0);
  assert.ok(
    pkg.warnings.some((w) => /missing|omitted|degraded/i.test(w)),
  );
});

test("forbidden trading language never appears", () => {
  const cases: IntelligenceV3Input[] = [
    baseInput({ dataQuality: fixtureQuality() }),
    baseInput({ dataQuality: delayedQuality() }),
    baseInput({ timeframe: "5m", dataQuality: unsupportedQuality() }),
    baseInput({
      confidence: { score: 90 },
      tradeReadiness: { score: 20, blockers: ["No confirmation"] },
      multiTimeframe: { status: "Conflict", alignmentScore: 20 },
    }),
  ];
  for (const input of cases) {
    const pkg = buildIntelligenceV3(input);
    const text = collectPackageText(pkg).join(" \n ");
    for (const phrase of FORBIDDEN_PHRASES) {
      assert.equal(
        findForbiddenPhrases(text).includes(phrase),
        false,
        `found forbidden phrase "${phrase}"`,
      );
    }
    assert.doesNotMatch(text, /\bbuy now\b|\bsell now\b|\benter trade\b/i);
    assert.doesNotMatch(text, /\bguaranteed\b|\bprofit likely\b/i);
  }
});

test("module isolation: intelligence-v3 does not import frozen engines", async () => {
  const dir = path.join(process.cwd(), "lib", "intelligence-v3");
  const files = await walkTs(dir);
  for (const file of files) {
    const src = await fs.promises.readFile(file, "utf8");
    assert.doesNotMatch(src, /from ["']@\/lib\/reasoning-engine/);
    assert.doesNotMatch(src, /from ["']@\/lib\/trade-quality-engine/);
    assert.doesNotMatch(src, /from ["']@\/lib\/hermes-score-engine/);
    assert.doesNotMatch(src, /from ["']@\/lib\/confidence-engine/);
    assert.doesNotMatch(src, /from ["']@\/lib\/paper-trading/);
    assert.doesNotMatch(src, /from ["']@\/lib\/paper-trading-market-authority/);
    assert.doesNotMatch(src, /from ["']@\/lib\/learning-engine/);
    assert.doesNotMatch(src, /CryptoMarketDataProvider|api\.coingecko/);
    assert.doesNotMatch(src, /from ["']@\/components\//);
  }
});

test("package shape includes required Phase 0 fields", () => {
  const pkg = buildIntelligenceV3(baseInput({ dataQuality: fixtureQuality() }));
  assert.equal(pkg.kind, "hermes-intelligence-v3");
  assert.ok(typeof pkg.headlineCaveat === "string" && pkg.headlineCaveat.length > 0);
  assert.ok(["none", "info", "caution", "block-process"].includes(pkg.severity));
  assert.ok(Array.isArray(pkg.caveats));
  assert.ok(Array.isArray(pkg.missingConfirmations));
  assert.ok(Array.isArray(pkg.contextNotes));
  assert.ok(typeof pkg.uncertainty.summary === "string");
  assert.ok(Array.isArray(pkg.uncertainty.drivers));
  assert.ok(typeof pkg.deterministicKey === "string");
  assert.ok(pkg.deterministicKey.startsWith("v3-"));
});

async function walkTs(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkTs(full)));
    else if (entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}
