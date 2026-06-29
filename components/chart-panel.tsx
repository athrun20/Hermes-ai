"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { Activity } from "lucide-react";
import {
  formatCurrency,
  type AssetQuote,
  type Candle,
  type Timeframe,
} from "@/lib/market-data";
import { Panel, PanelHeader } from "./ui";

export function ChartPanel({
  quote,
  candles,
  timeframe,
  onTimeframeChange,
}: {
  quote: AssetQuote;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const chartData = useMemo<CandlestickData<Time>[]>(
    () =>
      candles.map((candle) => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [candles],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#070A0F" },
        textColor: "#6B7A90",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.045)" },
        horzLines: { color: "rgba(255,255,255,0.055)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.10)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.10)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#33D99B",
      downColor: "#FB7185",
      borderUpColor: "#79F2C0",
      borderDownColor: "#FDA4AF",
      wickUpColor: "#79F2C0",
      wickDownColor: "#FDA4AF",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

  const stats = useMemo(() => {
    const first = candles[0];
    const last = candles[candles.length - 1];
    if (!first || !last) {
      return [
        ["Open", formatCurrency(quote.price)],
        ["High", formatCurrency(quote.price)],
        ["Low", formatCurrency(quote.price)],
        ["Last", formatCurrency(quote.price)],
      ];
    }

    return [
      ["Open", formatCurrency(first.open)],
      ["High", formatCurrency(Math.max(...candles.map((candle) => candle.high)))],
      ["Low", formatCurrency(Math.min(...candles.map((candle) => candle.low)))],
      ["Last", formatCurrency(last.close)],
    ];
  }, [candles, quote.price]);

  return (
    <Panel className="min-h-[520px]">
      <PanelHeader
        eyebrow={quote.pair}
        title="Live Candlestick Chart"
        action={
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1 sm:flex">
              {(["1H", "4H", "1D"] as const).map((frame) => (
                <button
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    timeframe === frame
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                  key={frame}
                  onClick={() => onTimeframeChange(frame)}
                  type="button"
                >
                  {frame}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-mint-300" aria-hidden="true" />
              Public feed
            </div>
          </div>
        }
      />
      <div className="p-5">
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2" key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-semibold text-slate-100">{value}</p>
            </div>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1 sm:hidden">
          {(["1H", "4H", "1D"] as const).map((frame) => (
            <button
              className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                timeframe === frame
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"
              }`}
              key={frame}
              onClick={() => onTimeframeChange(frame)}
              type="button"
            >
              {frame}
            </button>
          ))}
        </div>
        <div className="relative h-[380px] overflow-hidden rounded-lg border border-white/10 bg-[#070A0F]">
          <div ref={containerRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-mint-300/20 bg-surface-950/80 px-3 py-2 text-sm font-semibold text-mint-300">
            {formatCurrency(quote.price)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
