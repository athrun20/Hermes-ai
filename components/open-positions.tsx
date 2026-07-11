import { X } from "lucide-react";
import { formatCurrency } from "@/lib/market-data";
import {
  getDurationLabel,
  getPositionPnl,
  type PaperPosition,
} from "@/lib/paper-trading";
import type { CoinSymbol } from "@/lib/market-data";
import { DataTable, IconButton, Panel, PanelHeader, Td, Th, Tooltip, Tr } from "./ui";

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
        eyebrow="Positions"
        title="Open paper trades"
        action={<span className="text-xs text-slate-500">{positions.length}</span>}
      />
      <DataTable minWidth="min-w-[640px] md:min-w-[720px]">
        <thead className="bg-surface-950/55">
          <tr>
            {["Symbol", "Entry", "Current", "Size", "P/L", "Duration", ""].map((head) => (
              <Th key={head || "actions"}>{head}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={7}>
                No open paper positions yet.
              </Td>
            </tr>
          ) : (
            positions.map((position) => {
              const currentPrice = prices[position.symbol] ?? position.entryPrice;
              const pnl = getPositionPnl(position, currentPrice);
              return (
                <Tr key={position.id}>
                  <Td>
                    <div>
                      <p className="font-semibold text-white">{position.symbol}/USD</p>
                      <p
                        className={
                          position.side === "Long" ? "text-xs text-mint-300" : "text-xs text-rose-300"
                        }
                      >
                        {position.side}
                      </p>
                    </div>
                  </Td>
                  <Td className="tabular-nums">{formatCurrency(position.entryPrice)}</Td>
                  <Td className="tabular-nums">{formatCurrency(currentPrice)}</Td>
                  <Td className="tabular-nums">{formatCurrency(position.notional)}</Td>
                  <Td
                    className={`font-semibold tabular-nums ${pnl >= 0 ? "text-mint-300" : "text-rose-300"}`}
                  >
                    {formatCurrency(pnl)}
                  </Td>
                  <Td>{getDurationLabel(position.openedAt)}</Td>
                  <Td className="text-right">
                    <Tooltip content="Close paper position">
                      <IconButton label="Close paper position" onClick={() => onClose(position.id)}>
                        <X className="size-4" aria-hidden="true" />
                      </IconButton>
                    </Tooltip>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </DataTable>
    </Panel>
  );
}
