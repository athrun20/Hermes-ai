import type {
  ChartIntelligenceContextV1,
  ChartIntelligenceLabel,
  ChartIntelligenceResult,
  ChartSuggestedAction,
} from "@/lib/chart-intelligence-types";

export function analyzeChartIntelligence(
  context: ChartIntelligenceContextV1,
): ChartIntelligenceResult {
  const reasons: string[] = [];
  const labels: ChartIntelligenceLabel[] = [];
  const nearestSupport = nearestBelow(context.supportLines, context.currentPrice);
  const nearestResistance = nearestAbove(context.resistanceLines, context.currentPrice);
  const entry = context.tradeLevels.entry;
  const stop = context.tradeLevels.stop;
  const target = context.tradeLevels.target;
  const entryExtended =
    Boolean(entry && context.vwap) && Math.abs(entry! - context.vwap!) / context.vwap! > 0.012;
  const targetNearResistance =
    Boolean(target && nearestResistance) &&
    Math.abs(target! - nearestResistance!.price) / context.currentPrice < 0.012;
  const stopInsideSupport =
    Boolean(stop && nearestSupport) &&
    Math.abs(stop! - nearestSupport!.price) / context.currentPrice < 0.006;
  const trendAligned =
    context.ema20 && context.ema50
      ? context.trendDirection === "Bullish"
        ? context.ema20 >= context.ema50
        : context.trendDirection === "Bearish"
          ? context.ema20 <= context.ema50
          : true
      : true;

  if (nearestSupport && context.ema20 && isNear(nearestSupport.price, context.ema20, context.currentPrice, 0.012)) {
    reasons.push("Support aligns near EMA 20. This improves structure.");
    labels.push({
      id: "support-confirmed",
      text: "Support confirmed",
      tone: "mint",
      price: nearestSupport.price,
    });
  }

  if (targetNearResistance && nearestResistance) {
    reasons.push("Resistance sits close to target. Reward may be limited.");
    labels.push({
      id: "target-resistance",
      text: "Target near resistance",
      tone: "gold",
      price: nearestResistance.price,
    });
  }

  if (stopInsideSupport && nearestSupport) {
    reasons.push("Your stop is inside normal structure. Consider placing it beyond support.");
    labels.push({
      id: "stop-tight",
      text: "Risk too tight",
      tone: "danger",
      price: stop,
    });
  }

  if (entryExtended) {
    reasons.push("Entry is extended from VWAP. Waiting for a pullback may improve the plan.");
    labels.push({
      id: "entry-extended",
      text: "Entry extended",
      tone: "gold",
      price: entry,
    });
  }

  if (context.riskReward !== null && context.riskReward < 2) {
    reasons.push("Target produces less than 2:1 reward. The plan needs a better entry, stop, or target.");
    labels.push({
      id: "rr-low",
      text: "Improve R/R",
      tone: "danger",
      price: target ?? entry,
    });
  }

  if (context.rsi && context.rsi > 70) {
    reasons.push("RSI is elevated. Confirmation matters more than chasing momentum.");
  } else if (context.rsi && context.rsi < 30) {
    reasons.push("RSI is compressed. Let price reclaim structure before assuming strength.");
  }

  if (context.volume.status === "Rising") {
    reasons.push("Volume is improving, which supports a cleaner study setup.");
  }

  if (!trendAligned) {
    reasons.push("EMA structure does not fully support the current directional read.");
    labels.push({
      id: "wait-confirmation",
      text: "Wait for confirmation",
      tone: "gold",
      price: context.currentPrice,
    });
  }

  if (reasons.length === 0) {
    reasons.push("Structure is readable. Keep the plan defined before moving to Decision Review.");
  }

  const structureQuality = getStructureQuality({
    supportCount: context.supportLines.length,
    resistanceCount: context.resistanceLines.length,
    trendAligned,
    entryExtended,
  });
  const riskQuality = getRiskQuality(context.riskReward);
  const confirmationStatus = getConfirmationStatus({
    trendAligned,
    volumeStatus: context.volume.status,
    macdHistogram: context.macd?.histogram ?? 0,
    rsi: context.rsi ?? 50,
  });
  const suggestedAction = getSuggestedAction({
    entry,
    stop,
    target,
    riskReward: context.riskReward,
    stopInsideSupport,
    entryExtended,
    confirmationStatus,
    structureQuality,
  });

  return {
    kind: "chart-intelligence",
    symbol: context.symbol,
    currentInsight: buildCurrentInsight({
      context,
      suggestedAction,
      primaryReason: reasons[0],
    }),
    structureQuality,
    riskQuality,
    confirmationStatus,
    suggestedAction,
    labels: labels.slice(0, 3),
    reasons: reasons.slice(0, 5),
  };
}

function getStructureQuality({
  supportCount,
  resistanceCount,
  trendAligned,
  entryExtended,
}: {
  supportCount: number;
  resistanceCount: number;
  trendAligned: boolean;
  entryExtended: boolean;
}): ChartIntelligenceResult["structureQuality"] {
  if (trendAligned && supportCount > 0 && resistanceCount > 0 && !entryExtended) return "Strong";
  if (trendAligned && (supportCount > 0 || resistanceCount > 0)) return "Developing";
  return "Weak";
}

function getRiskQuality(riskReward: number | null): ChartIntelligenceResult["riskQuality"] {
  if (riskReward === null) return "Undefined";
  if (riskReward >= 2.5) return "Strong";
  if (riskReward >= 2) return "Acceptable";
  return "Needs Work";
}

function getConfirmationStatus({
  trendAligned,
  volumeStatus,
  macdHistogram,
  rsi,
}: {
  trendAligned: boolean;
  volumeStatus: "Rising" | "Normal" | "Fading";
  macdHistogram: number;
  rsi: number;
}): ChartIntelligenceResult["confirmationStatus"] {
  if (trendAligned && volumeStatus === "Rising" && Math.abs(macdHistogram) > 0.2 && rsi > 38 && rsi < 68) {
    return "Confirmed";
  }

  if (trendAligned && volumeStatus !== "Fading") return "Developing";
  return "Missing";
}

function getSuggestedAction({
  entry,
  stop,
  target,
  riskReward,
  stopInsideSupport,
  entryExtended,
  confirmationStatus,
  structureQuality,
}: {
  entry?: number;
  stop?: number;
  target?: number;
  riskReward: number | null;
  stopInsideSupport: boolean;
  entryExtended: boolean;
  confirmationStatus: ChartIntelligenceResult["confirmationStatus"];
  structureQuality: ChartIntelligenceResult["structureQuality"];
}): ChartSuggestedAction {
  if (!entry && !stop && !target) return "Study Setup";
  if (stopInsideSupport) return "Move Stop Below Support";
  if (riskReward !== null && riskReward < 2) return "Improve Risk/Reward";
  if (entryExtended || confirmationStatus === "Missing") return "Wait for Confirmation";
  if (entry && stop && target && riskReward !== null && riskReward >= 2 && structureQuality !== "Weak") {
    return "Ready for Decision Review";
  }
  return "Observe Only";
}

function buildCurrentInsight({
  context,
  suggestedAction,
  primaryReason,
}: {
  context: ChartIntelligenceContextV1;
  suggestedAction: ChartSuggestedAction;
  primaryReason: string;
}) {
  if (suggestedAction === "Ready for Decision Review") {
    return `Your ${context.symbol} plan is defined and respects risk. ${primaryReason}`;
  }

  if (context.dailyGoal.toLowerCase().includes("confirmation")) {
    return `${primaryReason} Today's goal favors patience before execution.`;
  }

  if (context.traderDna.toLowerCase().includes("trend")) {
    return `${primaryReason} This should fit your trend process only if structure confirms.`;
  }

  return primaryReason;
}

function nearestBelow(drawings: Array<{ price: number }>, price: number) {
  return drawings
    .filter((drawing) => drawing.price <= price)
    .sort((a, b) => b.price - a.price)[0];
}

function nearestAbove(drawings: Array<{ price: number }>, price: number) {
  return drawings
    .filter((drawing) => drawing.price >= price)
    .sort((a, b) => a.price - b.price)[0];
}

function isNear(a: number, b: number, reference: number, tolerance: number) {
  return Math.abs(a - b) / reference <= tolerance;
}
