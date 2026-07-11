import type { PositionSide } from "@/lib/paper-trading";
import type { RiskImpact } from "@/lib/decision-simulator-types";

export function calculateRiskReward({
  entry,
  stop,
  target,
  side,
}: {
  entry: number;
  stop: number;
  target: number;
  side: PositionSide;
}): number | null {
  const risk = side === "Long" ? entry - stop : stop - entry;
  const reward = side === "Long" ? target - entry : entry - target;

  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

export function calculateRiskImpact({
  entry,
  stop,
  target,
  notional,
  equity,
  side,
}: {
  entry: number;
  stop: number;
  target: number;
  notional: number;
  equity: number;
  side: PositionSide;
}): RiskImpact {
  const positionSize = entry > 0 ? notional / entry : 0;
  const riskPerUnit = side === "Long" ? entry - stop : stop - entry;
  const rewardPerUnit = side === "Long" ? target - entry : entry - target;
  const dollarRisk = Math.max(0, riskPerUnit * positionSize);
  const portfolioRiskPct = equity > 0 ? (dollarRisk / equity) * 100 : 0;
  const riskReward = calculateRiskReward({ entry, stop, target, side });
  const targetDistancePct = entry > 0 ? (Math.abs(rewardPerUnit) / entry) * 100 : null;
  const invalidationDistancePct = entry > 0 ? (Math.abs(riskPerUnit) / entry) * 100 : null;
  const riskStatus =
    riskReward === null
      ? "Invalid"
      : portfolioRiskPct > 2
        ? "Exceeds plan"
        : portfolioRiskPct > 1
          ? "Elevated"
          : "Within plan";

  return {
    positionSize,
    dollarRisk,
    portfolioRiskPct,
    riskReward,
    targetDistancePct,
    invalidationDistancePct,
    riskStatus,
    note:
      riskStatus === "Within plan"
        ? "Paper risk remains inside a disciplined practice range."
        : riskStatus === "Elevated"
          ? "Risk is elevated. Smaller size may keep the lesson cleaner."
          : riskStatus === "Exceeds plan"
            ? "This size exceeds a conservative per-trade risk limit."
            : "Stop, target, and direction do not create a valid risk plan.",
  };
}
