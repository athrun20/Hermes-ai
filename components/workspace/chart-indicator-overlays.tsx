import type { IndicatorVisibility } from "@/components/workspace/professional-chart";

const overlayLegend = [
  { key: "ema20", label: "EMA 20", className: "bg-mint-300" },
  { key: "ema50", label: "EMA 50", className: "bg-amberline" },
  { key: "vwap", label: "VWAP", className: "bg-sky-300" },
] as const;

export function ChartIndicatorLegend({
  indicators,
}: {
  indicators: IndicatorVisibility;
}) {
  const active = overlayLegend.filter((item) => indicators[item.key]);

  if (active.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-4 top-24 z-20 flex flex-wrap gap-2">
      {active.map((item) => (
        <span
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-surface-950/85 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 shadow-lg shadow-black/20"
          key={item.key}
        >
          <span className={`h-0.5 w-5 rounded-full ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
