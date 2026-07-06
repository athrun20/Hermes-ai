"use client";

import { X } from "lucide-react";
import { formatCurrency, formatPercent, type CoinSymbol } from "@/lib/market-data";
import { getMarketAsset } from "@/lib/market-universe";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";

export function WorkspaceWatchlistPanel({
  symbols,
  selectedSymbol,
  onSelect,
  onRemove,
}: {
  symbols: CoinSymbol[];
  selectedSymbol: CoinSymbol;
  onSelect: (symbol: CoinSymbol) => void;
  onRemove: (symbol: CoinSymbol) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Favorites"
        title="Watchlist"
        action={<span className="text-xs text-slate-500">{symbols.length} assets</span>}
      />
      <div className="divide-y divide-white/10">
        {symbols.map((symbol) => {
          const asset = getMarketAsset(symbol);
          const selected = selectedSymbol === symbol;
          return (
            <div
              className={`grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 transition ${
                selected ? "bg-mint-300/[0.055]" : "hover:bg-white/[0.025]"
              }`}
              key={symbol}
            >
              <button className="text-left" onClick={() => onSelect(symbol)} type="button">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${asset.change24h >= 0 ? "bg-mint-300" : "bg-rose-300"}`}
                  />
                  <p className="font-semibold text-white">{asset.symbol}</p>
                  <StatusPill tone="muted">{asset.assetType}</StatusPill>
                </div>
                <p className="mt-1 text-xs text-slate-500">{asset.name}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-200">{formatCurrency(asset.price)}</span>
                  <span className={asset.change24h >= 0 ? "text-mint-300" : "text-rose-300"}>
                    {formatPercent(asset.change24h)}
                  </span>
                </div>
              </button>
              <button
                className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-500 transition hover:text-white"
                onClick={() => onRemove(symbol)}
                type="button"
                title="Remove from watchlist"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
