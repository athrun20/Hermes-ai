"use client";

import { Search, Plus } from "lucide-react";
import { formatCurrency, formatPercent, type CoinSymbol } from "@/lib/market-data";
import { searchMarketAssets, type MarketAsset } from "@/lib/market-universe";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";
import { useMemo, useState } from "react";

export function MarketSearch({
  onSelect,
  onAdd,
}: {
  onSelect: (symbol: CoinSymbol) => void;
  onAdd: (symbol: CoinSymbol) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchMarketAssets(query), [query]);

  return (
    <Panel>
      <PanelHeader eyebrow="Markets" title="Search" />
      <div className="p-4">
        <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-surface-950/60 px-3 text-sm text-slate-400 focus-within:border-mint-300/35">
          <Search className="size-4" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ticker, name, or type"
            value={query}
          />
        </label>
        <div className="mt-3 grid gap-2">
          {results.map((asset) => (
            <SearchResult
              asset={asset}
              key={asset.symbol}
              onAdd={() => onAdd(asset.symbol)}
              onSelect={() => onSelect(asset.symbol)}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SearchResult({
  asset,
  onSelect,
  onAdd,
}: {
  asset: MarketAsset;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <button className="text-left" onClick={onSelect} type="button">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white">{asset.symbol}</p>
          <StatusPill tone="muted">{asset.assetType}</StatusPill>
        </div>
        <p className="mt-1 text-xs text-slate-500">{asset.name}</p>
        <p className="mt-2 text-xs text-slate-400">
          {formatCurrency(asset.price)} / {formatPercent(asset.change24h)}
        </p>
      </button>
      <button
        className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white"
        onClick={onAdd}
        type="button"
        title="Add to watchlist"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
