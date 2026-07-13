"use client";

import { Search, Plus } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  type AssetQuote,
  type CoinSymbol,
} from "@/lib/market-data";
import {
  getMarketAsset,
  searchMarketAssets,
  type MarketAsset,
} from "@/lib/market-universe";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";
import { useMemo, useState } from "react";

export function MarketSearch({
  onSelect,
  onAdd,
  quotes,
}: {
  onSelect: (symbol: CoinSymbol) => void;
  onAdd: (symbol: CoinSymbol) => void;
  /** Step E: service-backed quotes for consistent marks. */
  quotes?: AssetQuote[];
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchMarketAssets(query), [query]);
  const quoteBySymbol = useMemo(() => indexQuotes(quotes), [quotes]);

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
              asset={mergeAssetQuote(asset, quoteBySymbol.get(asset.symbol))}
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

export function WorkspaceMarketsPanel({
  symbols,
  selectedSymbol,
  onSelect,
  onAdd,
  onRemove,
  quotes,
}: {
  symbols: CoinSymbol[];
  selectedSymbol: CoinSymbol;
  onSelect: (symbol: CoinSymbol) => void;
  onAdd: (symbol: CoinSymbol) => void;
  onRemove: (symbol: CoinSymbol) => void;
  /** Step E: MarketDataService-backed quotes (same as workspace priceMap). */
  quotes?: AssetQuote[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const quoteBySymbol = useMemo(() => indexQuotes(quotes), [quotes]);
  const results = useMemo(() => {
    const base = searchMarketAssets(query).slice(0, 6);
    return base.map((asset) => mergeAssetQuote(asset, quoteBySymbol.get(asset.symbol)));
  }, [query, quoteBySymbol]);

  const selectSymbol = (symbol: CoinSymbol) => {
    onAdd(symbol);
    onSelect(symbol);
    setQuery("");
    setOpen(false);
  };

  return (
    <Panel className="overflow-visible">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/75">
          Markets
        </p>
        <div className="relative mt-3">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-surface-950/65 px-3 text-sm text-slate-400 transition focus-within:border-mint-300/35">
            <Search className="size-4" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search symbol"
              value={query}
            />
          </label>
          {open && query.trim().length > 0 ? (
            <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-white/10 bg-surface-950 shadow-2xl shadow-black/45">
              {results.length > 0 ? (
                results.map((asset) => (
                  <button
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-white/10 px-3 py-2.5 text-left last:border-b-0 hover:bg-white/[0.04]"
                    key={asset.symbol}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectSymbol(asset.symbol);
                    }}
                    type="button"
                  >
                    <span>
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{asset.symbol}</span>
                        <span className="text-[11px] text-slate-500">{asset.assetType}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {asset.name}
                      </span>
                    </span>
                    <span className={asset.change24h >= 0 ? "text-xs font-semibold text-mint-300" : "text-xs font-semibold text-rose-300"}>
                      {formatPercent(asset.change24h)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-xs text-slate-500">No matching markets.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Watchlist
          </p>
          <span className="text-xs text-slate-600">{symbols.length}</span>
        </div>
        <div className="space-y-1.5">
          {symbols.map((symbol) => {
            const catalog = getMarketAsset(symbol);
            const asset = mergeAssetQuote(catalog, quoteBySymbol.get(symbol));
            const selected = selectedSymbol === symbol;
            return (
              <div
                className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border px-3 py-2.5 transition ${
                  selected
                    ? "border-mint-300/20 bg-mint-300/[0.07]"
                    : "border-white/10 bg-white/[0.025] hover:bg-white/[0.04]"
                }`}
                key={symbol}
              >
                <button className="min-w-0 text-left" onClick={() => onSelect(symbol)} type="button">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${asset.change24h >= 0 ? "bg-mint-300" : "bg-rose-300"}`} />
                    <span className="text-sm font-semibold text-white">{asset.symbol}</span>
                    <span className="truncate text-xs text-slate-500">{asset.name}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-300">{formatCurrency(asset.price)}</span>
                    <span className={asset.change24h >= 0 ? "text-mint-300" : "text-rose-300"}>
                      {formatPercent(asset.change24h)}
                    </span>
                  </div>
                </button>
                <button
                  className="grid size-7 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-500 transition hover:text-white"
                  onClick={() => onRemove(symbol)}
                  title="Remove from watchlist"
                  type="button"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function indexQuotes(quotes?: AssetQuote[]) {
  const map = new Map<string, AssetQuote>();
  for (const quote of quotes ?? []) {
    map.set(quote.symbol, quote);
  }
  return map;
}

function mergeAssetQuote(
  asset: MarketAsset,
  quote?: AssetQuote,
): MarketAsset {
  if (!quote) return asset;
  return {
    ...asset,
    price: quote.price,
    change24h: quote.change24h,
    lastUpdated: quote.lastUpdated,
  };
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
