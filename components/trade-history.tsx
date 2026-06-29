import { formatCurrency } from "@/lib/market-data";
import { getDurationLabel, type ClosedTrade } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function TradeHistory({ history }: { history: ClosedTrade[] }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Trade History"
        title="Completed Paper Trades"
        action={<span className="text-xs text-slate-500">{history.length} closed</span>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-surface-950/55 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {["Symbol", "Side", "Entry", "Exit", "P/L", "Return", "Duration"].map((head) => (
                <th className="border-b border-white/10 px-5 py-3 font-semibold" key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                  Close a paper position to create trade history.
                </td>
              </tr>
            ) : (
              history.map((trade) => (
                <tr className="text-slate-300 transition hover:bg-white/[0.025]" key={trade.id}>
                  <td className="border-b border-white/10 px-5 py-4 font-semibold text-white">
                    {trade.symbol}/USD
                  </td>
                  <td className={trade.side === "Long" ? "border-b border-white/10 px-5 py-4 text-mint-300" : "border-b border-white/10 px-5 py-4 text-rose-300"}>
                    {trade.side}
                  </td>
                  <td className="border-b border-white/10 px-5 py-4">{formatCurrency(trade.entryPrice)}</td>
                  <td className="border-b border-white/10 px-5 py-4">{formatCurrency(trade.exitPrice)}</td>
                  <td className={`border-b border-white/10 px-5 py-4 font-semibold ${trade.pnl >= 0 ? "text-mint-300" : "text-rose-300"}`}>
                    {formatCurrency(trade.pnl)}
                  </td>
                  <td className={`border-b border-white/10 px-5 py-4 ${trade.returnPct >= 0 ? "text-mint-300" : "text-rose-300"}`}>
                    {trade.returnPct >= 0 ? "+" : ""}
                    {trade.returnPct.toFixed(2)}%
                  </td>
                  <td className="border-b border-white/10 px-5 py-4">
                    {getDurationLabel(trade.openedAt, trade.closedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
