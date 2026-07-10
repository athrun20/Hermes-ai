import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";

export function buildTimeframeMentorSummary(
  pattern: MultiTimeframeIntelligence["pattern"],
  warning: string | null,
) {
  if (warning) return warning;

  if (pattern === "Full bullish alignment") {
    return "Short-term and higher-timeframe structures are aligned bullish. Hermes still wants a defined plan before risk.";
  }
  if (pattern === "Full bearish alignment") {
    return "Short-term and higher-timeframe structures are aligned bearish. Long plans carry obvious trend risk.";
  }
  if (pattern === "Higher-timeframe bullish / lower-timeframe bearish pullback") {
    return "Higher timeframes remain bullish, but the lower timeframe is pulling back. This favors patience over chasing.";
  }
  if (pattern === "Higher-timeframe bearish / lower-timeframe bullish bounce") {
    return "Short-term momentum is improving, but higher timeframes remain bearish. This setup carries countertrend risk.";
  }
  if (pattern === "Mixed conditions") {
    return "Timeframes are mixed. Hermes reduces conviction until structure becomes cleaner.";
  }
  return "No clear multi-timeframe alignment is present yet. Wait for the chart to organize.";
}
