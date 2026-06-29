import { X } from "lucide-react";
import { formatCurrency } from "@/lib/market-data";
import {
  getDurationLabel,
  getPositionPnl,
  type PaperPosition,
} from "@/lib/paper-trading";
import type { CoinSymbol } from "@/lib/market-data";
import { Panel, PanelHeader } from "./ui";

export function OpenPositions({
  positions,
  prices,
  onClose,
}: {
  positions: PaperPosition[];
  prices: Partial<Record<CoinSymbol, number>>;
  onClose: (positionId: string) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Open Positions"
        title="Active Paper Trades"
        action={<span className="text-xs text-slate-500">{positions.length} open</span>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-surface-950/55 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {["Symbol", "Entry", "Current Price", "Position Size", "P/L", "Duration", ""].map((head) => (
                <th className="border-b border-white/10 px-5 py-3 font-semibold" key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                  No open paper positions yet.
                </td>
              </tr>
            ) : (
              positions.map((position) => {
                const currentPrice = prices[position.symbol] ?? position.entryPrice;
                const pnl = getPositionPnl(position, currentPrice);
                return (
                  <tr className="text-slate-300 transition hover:bg-white/[0.025]" key={position.id}>
                    <td className="border-b border-white/10 px-5 py-4">
                      <div>
                        <p className="font-semibold text-white">{position.symbol}/USD</p>
                        <p className={position.side === "Long" ? "text-xs text-mint-300" : "text-xs text-rose-300"}>
                          {position.side}
                        </p>
                      </div>
                    </td>
                    <td className="border-b border-white/10 px-5 py-4">{formatCurrency(position.entryPrice)}</td>
                    <td className="border-b border-white/10 px-5 py-4">{formatCurrency(currentPrice)}</td>
                    <td className="border-b border-white/10 px-5 py-4">{formatCurrency(position.notional)}</td>
                    <td className={`border-b border-white/10 px-5 py-4 font-semibold ${pnl >= 0 ? "text-mint-300" : "text-rose-300"}`}>
                      {formatCurrency(pnl)}
                    </td>
                    <td className="border-b border-white/10 px-5 py-4">{getDurationLabel(position.openedAt)}</td>
                    <td className="border-b border-white/10 px-5 py-4 text-right">
                      <button
                        className="inline-grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white"
                        onClick={() => onClose(position.id)}
                        title="Close paper position"
                        type="button"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
