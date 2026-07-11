import { formatCurrency } from "@/lib/market-data";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import { MetricCard, Panel, PanelHeader } from "./ui";

export function PaperPortfolio({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const rows = [
    ["Starting balance", snapshot.startingBalance, "muted"],
    ["Buying power", snapshot.buyingPower, "mint"],
    ["Equity", snapshot.equity, "neutral"],
    ["Unrealized P/L", snapshot.unrealizedPnl, tone(snapshot.unrealizedPnl)],
    ["Realized P/L", snapshot.realizedPnl, tone(snapshot.realizedPnl)],
    ["Daily P/L", snapshot.dailyPnl, tone(snapshot.dailyPnl)],
  ] as const;

  return (
    <Panel>
      <PanelHeader eyebrow="Portfolio" title="Account overview" />
      <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {rows.map(([label, value, color]) => (
          <MetricCard
            key={label}
            label={label}
            tone={color}
            value={formatCurrency(value)}
          />
        ))}
      </div>
    </Panel>
  );
}

function tone(value: number) {
  if (value > 0) return "mint";
  if (value < 0) return "danger";
  return "muted";
}
