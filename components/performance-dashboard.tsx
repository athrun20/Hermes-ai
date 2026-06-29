import { formatCurrency } from "@/lib/market-data";
import type { PerformanceStats } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function PerformanceDashboard({ stats }: { stats: PerformanceStats }) {
  const metrics = [
    ["Win Rate", `${stats.winRate.toFixed(0)}%`, tone(stats.winRate)],
    ["Total Trades", String(stats.totalTrades), "text-white"],
    ["Average Win", formatCurrency(stats.averageWin), "text-mint-300"],
    ["Average Loss", formatCurrency(stats.averageLoss), stats.averageLoss < 0 ? "text-rose-300" : "text-slate-300"],
    ["Largest Win", formatCurrency(stats.largestWin), "text-mint-300"],
    ["Largest Loss", formatCurrency(stats.largestLoss), stats.largestLoss < 0 ? "text-rose-300" : "text-slate-300"],
    ["Avg Risk/Reward", stats.averageRiskReward > 0 ? `${stats.averageRiskReward.toFixed(2)}R` : "0.00R", "text-amberline"],
  ];

  return (
    <Panel>
      <PanelHeader eyebrow="Performance" title="Paper Trading Stats" />
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, color]) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4" key={label}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-2 text-lg font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function tone(winRate: number) {
  if (winRate >= 55) {
    return "text-mint-300";
  }

  if (winRate > 0) {
    return "text-amberline";
  }

  return "text-slate-300";
}
