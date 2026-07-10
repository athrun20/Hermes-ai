import { tradingViewAttributionHref } from "@/lib/lightweight-chart-options";

export function LightweightChartsAttribution() {
  return (
    <p className="mt-2 text-[10px] leading-4 text-slate-600">
      Lightweight Charts provided by{" "}
      <a
        className="underline decoration-slate-700 underline-offset-2 transition hover:text-slate-400"
        href={tradingViewAttributionHref}
        rel="noreferrer"
        target="_blank"
      >
        TradingView
      </a>
      .
    </p>
  );
}
