import type { LessonGenerator, MarketCandidate } from "@/lib/opportunity-types";

export const ruleBasedLessonGenerator: LessonGenerator = {
  generateReasons: (candidate) => generateReasons(candidate),
  generateCautions: (candidate) => generateCautions(candidate),
  generateLesson: (candidate) => generateLesson(candidate),
  generateVerdict: (candidate, confidence, match) =>
    generateVerdict(candidate, confidence, match),
};

function generateReasons(candidate: MarketCandidate) {
  const reasons: string[] = [];

  if (candidate.aboveMovingAverages) {
    reasons.push("Price remains above major moving averages.");
  } else {
    reasons.push("Price is below key averages, so confirmation matters more.");
  }

  if (candidate.volumeTrend === "Increasing") {
    reasons.push("Volume is increasing into the setup area.");
  } else if (candidate.volumeTrend === "Stable") {
    reasons.push("Volume is stable enough to study without urgency.");
  } else {
    reasons.push("Volume is fading, which lowers conviction.");
  }

  if (candidate.supportHeld) {
    reasons.push("Support recently held and gives the setup a clearer invalidation area.");
  }

  if (candidate.momentumScore >= 70) {
    reasons.push("Momentum favors buyers, but entry still needs confirmation.");
  } else {
    reasons.push("Momentum is mixed, so the setup is educational rather than urgent.");
  }

  return reasons.slice(0, 4);
}

function generateLesson(candidate: MarketCandidate) {
  if (candidate.setupType === "Breakout") {
    return "Breakouts are study-worthy only when invalidation is nearby and obvious.";
  }

  if (candidate.setupType === "Support Bounce") {
    return "Support bounces teach traders to define risk before looking for reward.";
  }

  if (candidate.setupType === "Range Reversal") {
    return "High reward does not mean high quality unless risk is controlled first.";
  }

  if (candidate.setupType === "Pullback") {
    return "Professional traders wait for confirmation instead of chasing green candles.";
  }

  return "Quiet strength is often more useful to study than dramatic price movement.";
}

function generateCautions(candidate: MarketCandidate) {
  const cautions: string[] = [];

  if (candidate.priceExtended) {
    cautions.push("Price may be extended above key averages.");
  }

  if (candidate.earningsSoon) {
    cautions.push("Earnings are approaching.");
  }

  if (candidate.volumeTrend !== "Increasing") {
    cautions.push("Volume confirmation is still developing.");
  }

  if (candidate.riskLevel === "High" || candidate.potentialRewardPct < 4) {
    cautions.push("Reward may not justify the risk yet.");
  }

  cautions.push("Setup requires patience before entry.");
  return cautions.slice(0, 4);
}

function generateVerdict(
  candidate: MarketCandidate,
  confidence: number,
  match: "Excellent Match" | "Moderate Match" | "Poor Match",
) {
  if (candidate.riskLevel === "High") {
    return "Not Beginner Friendly";
  }

  if (confidence >= 82 && match === "Excellent Match") {
    return "Excellent Practice Setup";
  }

  if (candidate.priceExtended) {
    return "Wait for Pullback";
  }

  if (confidence >= 70) {
    return "Worth Studying";
  }

  return "Observe Only";
}
