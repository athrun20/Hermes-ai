import { Plus } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  type AssetQuote,
  type CoinSymbol,
} from "@/lib/market-data";
import { Panel, PanelHeader } from "./ui";

export function Watchlist({
  quotes,
  selectedSymbol,
  onSelect,
}: {
  quotes: AssetQuote[];
  selectedSymbol: CoinSymbol;
  onSelect: (symbol: CoinSymbol) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Markets"
        title="Watchlist"
        action={
          <button
            className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
            type="button"
            title="Add symbol"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        }
      />
      <div className="divide-y divide-white/10">
        {quotes.map((quote) => {
          const up = quote.change24h >= 0;
          const selected = quote.symbol === selectedSymbol;
          return (
            <button
              className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-white/[0.025] ${
                selected ? "bg-mint-300/[0.04]" : ""
              }`}
              key={quote.pair}
              onClick={() => onSelect(quote.symbol)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`size-2 rounded-full ${up ? "bg-mint-300" : "bg-rose-300"}`}
                />
                <div>
                  <p className="font-semibold text-white">{quote.pair}</p>
                  <p className="text-xs text-slate-500">{quote.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-200">
                  {formatCurrency(quote.price)}
                </p>
                <p className={up ? "text-sm text-mint-300" : "text-sm text-rose-300"}>
                  {formatPercent(quote.change24h)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
