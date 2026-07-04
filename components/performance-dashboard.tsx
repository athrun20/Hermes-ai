import { formatCurrency } from "@/lib/market-data";
import type { PerformanceStats } from "@/lib/paper-trading";
import { MetricCard, Panel, PanelHeader } from "./ui";

export function PerformanceDashboard({ stats }: { stats: PerformanceStats }) {
  const metrics = [
    ["Win Rate", `${stats.winRate.toFixed(0)}%`, tone(stats.winRate)],
    ["Total Trades", String(stats.totalTrades), "neutral"],
    ["Average Win", formatCurrency(stats.averageWin), "mint"],
    ["Average Loss", formatCurrency(stats.averageLoss), stats.averageLoss < 0 ? "danger" : "muted"],
    ["Largest Win", formatCurrency(stats.largestWin), "mint"],
    ["Largest Loss", formatCurrency(stats.largestLoss), stats.largestLoss < 0 ? "danger" : "muted"],
    ["Avg Risk/Reward", stats.averageRiskReward > 0 ? `${stats.averageRiskReward.toFixed(2)}R` : "0.00R", "gold"],
  ];

  return (
    <Panel>
      <PanelHeader eyebrow="Performance" title="Paper Trading Stats" />
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, color]) => (
          <MetricCard
            key={label}
            label={label}
            tone={color as "neutral" | "mint" | "gold" | "danger" | "muted"}
            value={value}
          />
        ))}
      </div>
    </Panel>
  );
}

function tone(winRate: number) {
  if (winRate >= 55) {
    return "mint";
  }

  if (winRate > 0) {
    return "gold";
  }

  return "muted";
}
