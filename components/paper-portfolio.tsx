import { formatCurrency } from "@/lib/market-data";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function PaperPortfolio({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const rows = [
    ["Starting Balance", snapshot.startingBalance, "text-slate-200"],
    ["Buying Power", snapshot.buyingPower, "text-mint-300"],
    ["Equity", snapshot.equity, "text-white"],
    ["Unrealized P/L", snapshot.unrealizedPnl, tone(snapshot.unrealizedPnl)],
    ["Realized P/L", snapshot.realizedPnl, tone(snapshot.realizedPnl)],
    ["Daily P/L", snapshot.dailyPnl, tone(snapshot.dailyPnl)],
  ];

  return (
    <Panel>
      <PanelHeader eyebrow="Paper Portfolio" title="Account Overview" />
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value, color]) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4" key={label}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-2 text-xl font-semibold tracking-tight ${color}`}>
              {formatCurrency(value as number)}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function tone(value: number) {
  if (value > 0) {
    return "text-mint-300";
  }

  if (value < 0) {
    return "text-rose-300";
  }

  return "text-slate-200";
}
