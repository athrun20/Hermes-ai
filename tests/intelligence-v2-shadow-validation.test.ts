/**
 * Shadow validation utility tests (developer-only reporting).
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  SHADOW_RING_BUFFER_CAPACITY,
  buildShadowValidationReport,
  clearShadowComparisons,
  formatShadowValidationMarkdown,
  getRecentShadowComparisons,
  recordShadowComparison,
  withShadowStoreReset,
  type HermesShadowComparison,
} from "../lib/intelligence-v2/index";

function sampleComparison(
  overrides: Partial<HermesShadowComparison> = {},
): HermesShadowComparison {
  return {
    kind: "hermes-shadow-comparison-v1",
    authority: "current-pipeline",
    symbol: "BTC",
    timeframe: "1H",
    timestamp: 1_700_000_000_000,
    currentSnapshot: {
      symbol: "BTC",
      timeframe: "1H",
      confidence: 70,
      readiness: 55,
      tradeQualityScore: 77,
      hermesScore: 77,
      hasOpenPosition: false,
      coachMessage: "Stay patient and wait for confirmation.",
    },
    v2Snapshot: {
      confidence: 70,
      readiness: 55,
      tradeQualityScore: 77,
      hermesScore: 77,
      judgmentStance: "Wait",
      convictionLevel: "Low",
      coachExplanation: "Hermes would wait for confirmation before acting.",
      degraded: false,
    },
    comparisons: [
      {
        field: "confidence",
        currentValue: 70,
        v2Value: 70,
        comparableStatus: "Comparable",
        difference: 0,
        tolerance: 0,
        passed: true,
        explanation: "match",
      },
      {
        field: "readiness",
        currentValue: 55,
        v2Value: 55,
        comparableStatus: "Comparable",
        difference: 0,
        tolerance: 0,
        passed: true,
        explanation: "match",
      },
      {
        field: "tradeQualityScore",
        currentValue: 77,
        v2Value: 77,
        comparableStatus: "Comparable",
        difference: 0,
        tolerance: 0,
        passed: true,
        explanation: "match",
      },
      {
        field: "hermesScore",
        currentValue: 77,
        v2Value: 77,
        comparableStatus: "Comparable",
        difference: 0,
        tolerance: 0,
        passed: true,
        explanation: "match",
      },
      {
        field: "judgmentStance",
        currentValue: null,
        v2Value: "Wait",
        comparableStatus: "Not Comparable",
        difference: null,
        tolerance: null,
        passed: null,
        explanation: "internal",
      },
    ],
    parityStatus: "Pass",
    warnings: [],
    missingInputs: ["decision"],
    degraded: false,
    durationMs: 3,
    ...overrides,
  };
}

test("validation report summarizes parity and recommends controlled cutover when clean", () => {
  const report = buildShadowValidationReport(
    [sampleComparison(), sampleComparison({ symbol: "ETH", timeframe: "15m" })],
    { generatedAt: 1_700_000_000_000 },
  );
  assert.equal(report.kind, "hermes-shadow-validation-report-v1");
  assert.equal(report.comparisonCount, 2);
  assert.equal(report.summary.pass, 2);
  assert.equal(report.summary.blockerCount, 0);
  assert.equal(report.recommendation, "Ready for controlled cutover");
  assert.ok(report.summary.uniqueSymbols.includes("BTC"));
  assert.ok(report.summary.uniqueSymbols.includes("ETH"));
});

test("numeric mismatch is classified as Blocker and blocks cutover", () => {
  const bad = sampleComparison({
    parityStatus: "Fail",
    comparisons: [
      {
        field: "confidence",
        currentValue: 70,
        v2Value: 65,
        comparableStatus: "Comparable",
        difference: 5,
        tolerance: 0,
        passed: false,
        explanation: "mismatch",
      },
    ],
  });
  const report = buildShadowValidationReport([bad], { generatedAt: 1 });
  assert.equal(report.summary.blockerCount, 1);
  assert.equal(report.recommendation, "Not ready for cutover");
  assert.ok(report.classifiedDifferences.some((d) => d.class === "Blocker"));
});

test("ring buffer capacity constant is 25", () => {
  assert.equal(SHADOW_RING_BUFFER_CAPACITY, 25);
});

test("ring buffer drops oldest beyond capacity", () => {
  withShadowStoreReset(() => {
    clearShadowComparisons();
    for (let i = 0; i < SHADOW_RING_BUFFER_CAPACITY + 5; i += 1) {
      recordShadowComparison(
        sampleComparison({
          timestamp: 1_700_000_000_000 + i,
          symbol: i % 2 === 0 ? "BTC" : "ETH",
        }),
      );
    }
    assert.equal(getRecentShadowComparisons().length, SHADOW_RING_BUFFER_CAPACITY);
  });
});

test("markdown report includes recommendation", () => {
  const report = buildShadowValidationReport([sampleComparison()], { generatedAt: 1 });
  const md = formatShadowValidationMarkdown(report);
  assert.match(md, /Recommendation/);
  assert.match(md, /Ready for controlled cutover|Continue Shadow Mode|Not ready/);
});
