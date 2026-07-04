import { formatCurrency } from "@/lib/market-data";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import { MetricCard, Panel, PanelHeader } from "./ui";

export function PaperPortfolio({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const rows = [
    ["Starting Balance", snapshot.startingBalance, "muted"],
    ["Buying Power", snapshot.buyingPower, "mint"],
    ["Equity", snapshot.equity, "neutral"],
    ["Unrealized P/L", snapshot.unrealizedPnl, tone(snapshot.unrealizedPnl)],
    ["Realized P/L", snapshot.realizedPnl, tone(snapshot.realizedPnl)],
    ["Daily P/L", snapshot.dailyPnl, tone(snapshot.dailyPnl)],
  ];

  return (
    <Panel>
      <PanelHeader eyebrow="Paper Portfolio" title="Account Overview" />
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value, color]) => (
          <MetricCard
            key={label}
            label={label as string}
            tone={color as "neutral" | "mint" | "gold" | "danger" | "muted"}
            value={formatCurrency(value as number)}
          />
        ))}
      </div>
    </Panel>
  );
}

function tone(value: number) {
  if (value > 0) {
    return "mint";
  }

  if (value < 0) {
    return "danger";
  }

  return "muted";
}
