import { formatCurrency } from "@/lib/market-data";
import { getDurationLabel, type ClosedTrade } from "@/lib/paper-trading";
import { DataTable, Panel, PanelHeader, Td, Th, Tr } from "./ui";

export function TradeHistory({ history }: { history: ClosedTrade[] }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="History"
        title="Completed trades"
        action={<span className="text-xs text-slate-500">{history.length}</span>}
      />
      <DataTable minWidth="min-w-[640px] md:min-w-[760px]">
        <thead className="bg-surface-950/55">
          <tr>
            {["Symbol", "Side", "Entry", "Exit", "P/L", "Return", "Duration"].map((head) => (
              <Th key={head}>{head}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={7}>
                Close a paper position to create trade history.
              </Td>
            </tr>
          ) : (
            history.map((trade) => (
              <Tr key={trade.id}>
                <Td className="font-semibold text-white">{trade.symbol}/USD</Td>
                <Td className={trade.side === "Long" ? "text-mint-300" : "text-rose-300"}>
                  {trade.side}
                </Td>
                <Td className="tabular-nums">{formatCurrency(trade.entryPrice)}</Td>
                <Td className="tabular-nums">{formatCurrency(trade.exitPrice)}</Td>
                <Td
                  className={`font-semibold tabular-nums ${trade.pnl >= 0 ? "text-mint-300" : "text-rose-300"}`}
                >
                  {formatCurrency(trade.pnl)}
                </Td>
                <Td
                  className={`tabular-nums ${trade.returnPct >= 0 ? "text-mint-300" : "text-rose-300"}`}
                >
                  {trade.returnPct >= 0 ? "+" : ""}
                  {trade.returnPct.toFixed(2)}%
                </Td>
                <Td>{getDurationLabel(trade.openedAt, trade.closedAt)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </DataTable>
    </Panel>
  );
}
