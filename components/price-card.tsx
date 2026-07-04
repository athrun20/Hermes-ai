import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import { formatCurrency, formatPercent, type AssetQuote } from "@/lib/market-data";
import { MetricCard, PremiumButtonCard, StatusPill } from "./ui";

export function PriceCard({
  quote,
  isSelected,
  onSelect,
}: {
  quote: AssetQuote;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const positive = quote.change24h >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const accent = positive ? "from-mint-300/20" : "from-rose-300/15";
  const spark =
    quote.symbol === "BTC"
      ? "M0 34 C18 22 28 28 44 16 S72 8 92 18 S122 30 144 10"
      : quote.symbol === "ETH"
        ? "M0 28 C14 20 28 22 42 24 S64 38 82 22 S118 12 144 24"
        : quote.symbol === "SOL"
          ? "M0 24 C18 26 30 14 44 18 S70 40 88 28 S118 16 144 32"
          : "M0 32 C16 18 34 38 50 24 S78 18 94 26 S124 12 144 20";

  return (
    <PremiumButtonCard
      className={`relative overflow-hidden bg-gradient-to-br ${accent} to-surface-900/90 p-5 text-left ${
        isSelected ? "border-mint-300/45" : "border-white/10"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="absolute -right-10 -top-10 size-32 rounded-full bg-white/[0.035]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg border border-white/10 bg-surface-950/60 text-slate-200">
            <BarChart3 className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              {quote.name}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">{quote.symbol}</h3>
          </div>
        </div>
        <StatusPill tone={positive ? "mint" : "danger"} className="text-sm">
          <Icon className="size-4" aria-hidden="true" />
          {formatPercent(quote.change24h)}
        </StatusPill>
      </div>
      <p className="relative mt-6 text-3xl font-semibold tracking-tight text-white xl:text-[34px]">
        {formatCurrency(quote.price)}
      </p>
      <svg
        aria-label={`${quote.symbol} direction sparkline`}
        className="relative mt-4 h-12 w-full"
        role="img"
        viewBox="0 0 144 48"
      >
        <path
          d={spark}
          fill="none"
          stroke={positive ? "#79F2C0" : "#FDA4AF"}
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path d={`${spark} V48 H0 Z`} fill={positive ? "rgba(121,242,192,0.08)" : "rgba(253,164,175,0.08)"} />
      </svg>
      <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
        <MetricCard label="Pair" value={quote.pair} tone="muted" className="p-3" />
        <MetricCard label="Updated" value={quote.lastUpdated ?? "Live"} tone="muted" className="p-3" />
      </div>
    </PremiumButtonCard>
  );
}
