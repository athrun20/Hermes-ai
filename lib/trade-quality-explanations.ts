import type { TradeQualityBreakdownItem, TradeQualityGrade } from "@/lib/trade-quality-types";

export function getTradeQualityGrade(score: number): { grade: TradeQualityGrade; label: string } {
  if (score >= 90) return { grade: "A+", label: "Elite Practice Setup" };
  if (score >= 85) return { grade: "A", label: "High Quality" };
  if (score >= 80) return { grade: "A-", label: "Strong Setup" };
  if (score >= 75) return { grade: "B+", label: "Worth Studying" };
  if (score >= 70) return { grade: "B", label: "Developing Quality" };
  if (score >= 65) return { grade: "B-", label: "Needs Confirmation" };
  if (score >= 60) return { grade: "C+", label: "Weak Structure" };
  if (score >= 50) return { grade: "C", label: "Poor Quality" };
  if (score >= 40) return { grade: "D", label: "Avoid for Now" };
  return { grade: "F", label: "Incomplete or High Risk" };
}

export function buildWhyNotAPlus(breakdown: TradeQualityBreakdownItem[]) {
  return [...breakdown]
    .filter((item) => item.percentage < 82)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 4)
    .map((item) => `${item.category}: ${item.reason}`);
}

export function buildTradeQualitySummary({
  score,
  label,
  strongest,
  weakest,
}: {
  score: number;
  label: string;
  strongest: TradeQualityBreakdownItem;
  weakest: TradeQualityBreakdownItem;
}) {
  return `Hermes scores this paper trade ${score} as ${label}. ${strongest.category} is the strongest factor, while ${weakest.category} is the main reason quality is not higher.`;
}

export function getSuggestedNextAction(score: number) {
  if (score >= 78) return "Ready for Decision Review";
  if (score >= 65) return "Wait for Confirmation";
  if (score >= 50) return "Revise Trade";
  if (score >= 40) return "Observe Only";
  return "Avoid for Now";
}
