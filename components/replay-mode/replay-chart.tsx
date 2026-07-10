"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { RotateCcw } from "lucide-react";
import { LightweightChartsAttribution } from "@/components/chart-attribution";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";
import { createHermesLightweightChartOptions } from "@/lib/lightweight-chart-options";
import { formatCurrency } from "@/lib/market-data";
import type { ReplaySession } from "@/lib/replay-engine";

export function ReplayChart({ session }: { session: ReplaySession }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [visibleCount, setVisibleCount] = useState(1);
  const chartData = useMemo<CandlestickData<Time>[]>(
    () =>
      session.candles.map((candle) => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [session.candles],
  );
  const visibleData = chartData.slice(0, visibleCount);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, createHermesLightweightChartOptions());
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
    setVisibleCount(1);
  }, [session.trade.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, chartData.length));
    }, 140);

    return () => window.clearInterval(interval);
  }, [chartData.length, session.trade.id]);

  useEffect(() => {
    seriesRef.current?.setData(visibleData);
    chartRef.current?.timeScale().fitContent();
  }, [visibleData]);

  const progress = Math.round((visibleCount / chartData.length) * 100);

  return (
    <Panel className="min-h-[560px]">
      <PanelHeader
        eyebrow="Chart Replay"
        title="Trade Film Room"
        action={<StatusPill tone="gold">{progress}% replayed</StatusPill>}
      />
      <div className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <LevelPill label="Entry" value={session.trade.entryPrice} tone="mint" />
          {session.trade.stopLoss ? (
            <LevelPill label="Stop" value={session.trade.stopLoss} tone="danger" />
          ) : null}
          {session.trade.takeProfit ? (
            <LevelPill label="Target" value={session.trade.takeProfit} tone="gold" />
          ) : null}
          <LevelPill label="Exit" value={session.trade.exitPrice} tone="muted" />
        </div>
        <div className="relative h-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#070A0F]">
          <div ref={containerRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-4 top-4 grid gap-2 text-xs font-semibold md:grid-cols-4">
            <ReplayMarker label="Entry" tone="mint" />
            <ReplayMarker label="Stop" tone="danger" />
            <ReplayMarker label="Target" tone="gold" />
            <ReplayMarker label="Exit" tone="muted" />
          </div>
        </div>
        <LightweightChartsAttribution />
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-amberline/30 hover:bg-amberline/10 hover:text-white"
          onClick={() => setVisibleCount(1)}
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Replay Again
        </button>
      </div>
    </Panel>
  );
}

function LevelPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "mint" | "gold" | "danger" | "muted";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`ml-2 font-semibold ${getToneText(tone)}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function ReplayMarker({
  label,
  tone,
}: {
  label: string;
  tone: "mint" | "gold" | "danger" | "muted";
}) {
  return (
    <div className={`rounded-md border px-2 py-1 ${getMarkerTone(tone)}`}>
      {label}
    </div>
  );
}

function getToneText(tone: "mint" | "gold" | "danger" | "muted") {
  if (tone === "mint") return "text-mint-300";
  if (tone === "gold") return "text-amberline";
  if (tone === "danger") return "text-rose-300";
  return "text-slate-300";
}

function getMarkerTone(tone: "mint" | "gold" | "danger" | "muted") {
  if (tone === "mint") return "border-mint-300/25 bg-mint-300/10 text-mint-200";
  if (tone === "gold") return "border-amberline/25 bg-amberline/10 text-amber-100";
  if (tone === "danger") return "border-rose-300/25 bg-rose-400/10 text-rose-200";
  return "border-white/10 bg-surface-950/70 text-slate-300";
}
