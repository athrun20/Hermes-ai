import { formatCurrency } from "@/lib/market-data";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

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
      <div className="grid gap-3 p-5 sm:grid-cols-2 2xl:grid-cols-3">
        {rows.map(([label, value, color]) => (
          <PortfolioMetric
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

function PortfolioMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "mint" | "gold" | "danger" | "muted";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-3.5">
      <p className="truncate text-xs text-slate-500">{label}</p>
      <p
        className={`mt-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[clamp(1rem,1.45vw,1.35rem)] font-semibold leading-tight tabular-nums tracking-[-0.01em] ${toneText(tone)}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function toneText(toneValue: "neutral" | "mint" | "gold" | "danger" | "muted") {
  if (toneValue === "mint") return "text-mint-300";
  if (toneValue === "gold") return "text-amberline";
  if (toneValue === "danger") return "text-rose-300";
  if (toneValue === "muted") return "text-slate-300";
  return "text-white";
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
