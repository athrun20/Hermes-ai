import type {
  DecisionChecklistItem,
  DecisionQuality,
  DecisionRecommendation,
} from "@/lib/decision-types";

export function calculateDecisionConfidence(checklist: DecisionChecklistItem[]) {
  if (checklist.length === 0) return 50;

  const passed = checklist.filter((item) => item.passed).length;
  return clamp(Math.round((passed / checklist.length) * 100));
}

export function calculateDisciplineImpact({
  confidence,
  riskReward,
}: {
  confidence: number;
  riskReward: number | null;
}) {
  const riskRewardAdjustment = riskReward === null ? -8 : riskReward >= 2 ? 8 : riskReward >= 1 ? -2 : -10;
  return Math.max(-20, Math.min(15, Math.round((confidence - 70) / 4 + riskRewardAdjustment)));
}

export function getDecisionQuality(confidence: number): DecisionQuality {
  if (confidence >= 86) return "Excellent";
  if (confidence >= 72) return "Good";
  if (confidence >= 55) return "Developing";
  return "Needs Patience";
}

export function getDecisionRecommendation({
  confidence,
  riskReward,
  positionSizePassed,
  beginnerFitPassed,
}: {
  confidence: number;
  riskReward: number | null;
  positionSizePassed: boolean;
  beginnerFitPassed: boolean;
}): DecisionRecommendation {
  if (!beginnerFitPassed) return "Not Beginner Friendly";
  if (!positionSizePassed) return "Reduce Position Size";
  if (riskReward !== null && riskReward < 1.2) return "Observe Instead";
  if (confidence >= 78 && (riskReward ?? 0) >= 2) return "Ready to Practice";
  if (confidence >= 60) return "Wait for Pullback";
  return "Observe Instead";
}

export function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
