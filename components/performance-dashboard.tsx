import { formatCurrency } from "@/lib/market-data";
import type { PerformanceStats } from "@/lib/paper-trading";
import { MetricCard, Panel, PanelHeader } from "./ui";

export function PerformanceDashboard({ stats }: { stats: PerformanceStats }) {
  const metrics = [
    ["Win rate", `${stats.winRate.toFixed(0)}%`, tone(stats.winRate)],
    ["Total trades", String(stats.totalTrades), "neutral"],
    ["Average win", formatCurrency(stats.averageWin), "mint"],
    ["Average loss", formatCurrency(stats.averageLoss), stats.averageLoss < 0 ? "danger" : "muted"],
    ["Largest win", formatCurrency(stats.largestWin), "mint"],
    ["Largest loss", formatCurrency(stats.largestLoss), stats.largestLoss < 0 ? "danger" : "muted"],
    [
      "Avg R:R",
      stats.averageRiskReward > 0 ? `${stats.averageRiskReward.toFixed(2)}R` : "0.00R",
      "gold",
    ],
  ] as const;

  return (
    <Panel>
      <PanelHeader eyebrow="Performance" title="Paper stats" />
      <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-2 2xl:grid-cols-2">
        {metrics.map(([label, value, color]) => (
          <MetricCard
            key={label}
            label={label}
            tone={color}
            value={value}
          />
        ))}
      </div>
    </Panel>
  );
}

function tone(winRate: number) {
  if (winRate >= 55) return "mint";
  if (winRate > 0) return "gold";
  return "muted";
}
