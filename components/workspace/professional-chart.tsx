"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { RotateCcw, Ruler, SlidersHorizontal } from "lucide-react";
import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
import { formatCurrency, formatPercent, type AssetQuote, type Candle } from "@/lib/market-data";
import { type WorkspaceTimeframe } from "@/lib/market-universe";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { Panel, StatusPill } from "@/components/ui";

export type IndicatorVisibility = {
  volume: boolean;
  rsi: boolean;
  macd: boolean;
  ema20: boolean;
  ema50: boolean;
  vwap: boolean;
};

const timeframes: WorkspaceTimeframe[] = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];
const indicatorLabels: Array<[keyof IndicatorVisibility, string]> = [
  ["volume", "Volume"],
  ["rsi", "RSI"],
  ["macd", "MACD"],
  ["ema20", "EMA 20"],
  ["ema50", "EMA 50"],
  ["vwap", "VWAP"],
];

export function ProfessionalChart({
  quote,
  candles,
  timeframe,
  indicators,
  drawings,
  tradeLevels,
  selectedTool,
  analysis,
  onTimeframeChange,
  onToggleIndicator,
  onToolChange,
  onChartPriceSelect,
  onClearDrawings,
}: {
  quote: AssetQuote;
  candles: Candle[];
  timeframe: WorkspaceTimeframe;
  indicators: IndicatorVisibility;
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  selectedTool: ChartDrawingTool;
  analysis: SymbolAnalysis;
  onTimeframeChange: (timeframe: WorkspaceTimeframe) => void;
  onToggleIndicator: (indicator: keyof IndicatorVisibility) => void;
  onToolChange: (tool: ChartDrawingTool) => void;
  onChartPriceSelect: (price: number) => void;
  onClearDrawings: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);
  const priceRange = useMemo(() => getPriceRange(candles, tradeLevels, drawings), [candles, drawings, tradeLevels]);
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
  const rsiSeries = useMemo(() => buildRsiSeries(candles), [candles]);
  const macdSeries = useMemo(() => buildMacdSeries(candles), [candles]);
  const volumeSeries = useMemo(() => buildVolumeSeries(candles), [candles]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#070A0F" },
        textColor: "#8A96A8",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.035)" },
        horzLines: { color: "rgba(255,255,255,0.055)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(245,184,75,0.22)" },
        horzLine: { color: "rgba(245,184,75,0.22)" },
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#33D99B",
      downColor: "#FB7185",
      borderUpColor: "#79F2C0",
      borderDownColor: "#FDA4AF",
      wickUpColor: "#79F2C0",
      wickDownColor: "#FDA4AF",
      priceLineColor: "#F5B84B",
      priceLineWidth: 1,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => chart.remove();
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

  const handleChartClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === "none" || !plotRef.current) return;

    const rect = plotRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const price = priceRange.max - ratio * (priceRange.max - priceRange.min);
    onChartPriceSelect(price);
  };

  return (
    <Panel className="min-h-[860px]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-300/75">
              Chart Workspace
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-white">{quote.symbol}</h2>
              <p className="pb-1 text-sm text-slate-500">{quote.name}</p>
              <StatusPill tone={quote.change24h >= 0 ? "mint" : "danger"}>
                {formatCurrency(quote.price)} / {formatPercent(quote.change24h)}
              </StatusPill>
              <StatusPill tone="muted">{timeframe}</StatusPill>
              <StatusPill tone={analysis.marketBias === "Bullish" ? "mint" : analysis.marketBias === "Bearish" ? "danger" : "gold"}>
                {analysis.marketBias} / {analysis.confidence}%
              </StatusPill>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1">
              {timeframes.map((frame) => (
                <button
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    timeframe === frame ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"
                  }`}
                  key={frame}
                  onClick={() => onTimeframeChange(frame)}
                  type="button"
                >
                  {frame}
                </button>
              ))}
            </div>
            <div className="relative">
              <ChartTool label="Indicators" icon={<SlidersHorizontal className="size-4" />} onClick={() => setIndicatorMenuOpen((open) => !open)} />
              {indicatorMenuOpen ? (
                <ToggleMenu>
                  {indicatorLabels.map(([key, label]) => (
                    <MenuToggle
                      active={indicators[key]}
                      key={key}
                      label={label}
                      onClick={() => onToggleIndicator(key)}
                    />
                  ))}
                </ToggleMenu>
              ) : null}
            </div>
            <div className="relative">
              <ChartTool label="Drawings" icon={<Ruler className="size-4" />} onClick={() => setDrawingMenuOpen((open) => !open)} />
              {drawingMenuOpen ? (
                <ToggleMenu>
                  {[
                    ["horizontal-line", "Horizontal Line"],
                    ["trend-line", "Trend Line"],
                    ["support-zone", "Support Zone"],
                    ["resistance-zone", "Resistance Zone"],
                    ["entry", "Set Entry"],
                    ["stop", "Set Stop"],
                    ["target", "Set Target"],
                  ].map(([tool, label]) => (
                    <MenuToggle
                      active={selectedTool === tool}
                      key={tool}
                      label={label}
                      onClick={() => onToolChange(tool as ChartDrawingTool)}
                    />
                  ))}
                  <button
                    className="mt-2 w-full rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-left text-xs font-semibold text-rose-200"
                    onClick={onClearDrawings}
                    type="button"
                  >
                    Clear Drawings
                  </button>
                </ToggleMenu>
              ) : null}
            </div>
            <ChartTool label="Reset" icon={<RotateCcw className="size-4" />} onClick={() => chartRef.current?.timeScale().fitContent()} />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div
          className="relative h-[620px] overflow-hidden rounded-lg border border-white/10 bg-[#070A0F]"
          onClick={handleChartClick}
          ref={plotRef}
        >
          <div ref={containerRef} className="absolute inset-0" />
          <HermesChartOverlay analysis={analysis} />
          <ChartLevelOverlay
            drawings={drawings}
            priceRange={priceRange}
            tradeLevels={tradeLevels}
          />
          {selectedTool !== "none" ? (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-amberline/25 bg-surface-950/85 px-3 py-2 text-xs font-semibold text-amberline">
              Click chart to place {toolLabel(selectedTool)}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {indicators.volume ? <VolumePanel data={volumeSeries} /> : null}
          {indicators.rsi ? <RsiPanel data={rsiSeries} /> : null}
          {indicators.macd ? <MacdPanel data={macdSeries} /> : null}
        </div>
      </div>
    </Panel>
  );
}

function ChartLevelOverlay({
  drawings,
  tradeLevels,
  priceRange,
}: {
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  priceRange: { min: number; max: number };
}) {
  const levels = [
    ...drawings.map((drawing) => ({
      id: drawing.id,
      label: drawing.type === "support-zone" ? "Support Zone" : drawing.type === "resistance-zone" ? "Resistance Zone" : drawing.type === "trend-line" ? "Trend" : "Line",
      price: drawing.price,
      tone: drawing.type === "resistance-zone" ? "rose" : drawing.type === "support-zone" ? "mint" : "gold",
      zone: drawing.type === "support-zone" || drawing.type === "resistance-zone",
    })),
    tradeLevels.entry ? { id: "entry", label: "Entry", price: tradeLevels.entry, tone: "mint", zone: false } : null,
    tradeLevels.stop ? { id: "stop", label: "Stop", price: tradeLevels.stop, tone: "rose", zone: false } : null,
    tradeLevels.target ? { id: "target", label: "Target", price: tradeLevels.target, tone: "gold", zone: false } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; price: number; tone: string; zone: boolean }>;

  return (
    <div className="pointer-events-none absolute inset-0">
      {levels.map((level) => {
        const top = `${priceToY(level.price, priceRange)}%`;
        const color = level.tone === "mint" ? "border-mint-300 text-mint-200 bg-mint-300/10" : level.tone === "rose" ? "border-rose-300 text-rose-200 bg-rose-400/10" : "border-amberline text-amber-100 bg-amberline/10";
        return (
          <div className="absolute left-0 right-0" key={level.id} style={{ top }}>
            {level.zone ? <div className={`h-10 -translate-y-5 border-y ${color}`} /> : <div className={`border-t ${color}`} />}
            <span className={`absolute right-3 -translate-y-1/2 rounded-md border px-2 py-1 text-[11px] font-semibold ${color}`}>
              {level.label} {formatCurrency(level.price)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HermesChartOverlay({ analysis }: { analysis: SymbolAnalysis }) {
  const signal =
    analysis.riskLevel === "High"
      ? "Risk Elevated"
      : analysis.marketBias === "Bullish"
        ? "Confirmation Area"
        : analysis.marketBias === "Bearish"
          ? "Wait"
          : "Study Zone";

  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
      <span className="rounded-md border border-amberline/25 bg-surface-950/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amberline">
        {signal}
      </span>
      <span className="w-fit rounded-md border border-mint-300/20 bg-surface-950/80 px-3 py-1.5 text-xs font-semibold text-mint-200">
        {analysis.suggestedAction}
      </span>
    </div>
  );
}

function VolumePanel({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <IndicatorShell title="Volume" value="Mock participation">
      <div className="flex h-24 items-end gap-1">
        {data.map((value, index) => (
          <div
            className="flex-1 rounded-t bg-mint-300/45"
            key={index}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        ))}
      </div>
    </IndicatorShell>
  );
}

function RsiPanel({ data }: { data: number[] }) {
  const current = data[data.length - 1] ?? 50;
  return (
    <IndicatorShell title="RSI" value={current.toFixed(1)}>
      <MiniLineChart data={data} min={0} max={100} reference={[70, 30]} color="#F5B84B" />
    </IndicatorShell>
  );
}

function MacdPanel({ data }: { data: { macd: number; signal: number; histogram: number }[] }) {
  const current = data[data.length - 1] ?? { macd: 0, signal: 0, histogram: 0 };
  return (
    <IndicatorShell title="MACD" value={`${current.macd.toFixed(2)} / ${current.signal.toFixed(2)}`}>
      <div className="relative h-28">
        <div className="absolute inset-x-0 top-1/2 border-t border-white/10" />
        <div className="absolute inset-0 flex items-center gap-1">
          {data.map((point, index) => (
            <div
              className={`flex-1 rounded-sm ${point.histogram >= 0 ? "bg-mint-300/45" : "bg-rose-300/45"}`}
              key={index}
              style={{
                height: `${Math.max(6, Math.abs(point.histogram) * 28)}px`,
                transform: point.histogram >= 0 ? "translateY(-35%)" : "translateY(35%)",
              }}
            />
          ))}
        </div>
        <MiniLineChart data={data.map((point) => point.macd)} min={-2.5} max={2.5} color="#79F2C0" overlay />
        <MiniLineChart data={data.map((point) => point.signal)} min={-2.5} max={2.5} color="#F5B84B" overlay />
      </div>
    </IndicatorShell>
  );
}

function MiniLineChart({
  data,
  min,
  max,
  color,
  reference = [],
  overlay = false,
}: {
  data: number[];
  min: number;
  max: number;
  color: string;
  reference?: number[];
  overlay?: boolean;
}) {
  const points = data
    .map((value, index) => {
      const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / (max - min)) * 100;
      return `${x},${Math.max(0, Math.min(100, y))}`;
    })
    .join(" ");

  return (
    <svg className={overlay ? "absolute inset-0 h-full w-full" : "h-28 w-full"} preserveAspectRatio="none" viewBox="0 0 100 100">
      {reference.map((value) => {
        const y = 100 - ((value - min) / (max - min)) * 100;
        return <line key={value} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 4" />;
      })}
      <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function IndicatorShell({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#070A0F] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        <p className="text-sm font-semibold text-slate-200">{value}</p>
      </div>
      {children}
    </section>
  );
}

function ToggleMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-0 top-11 z-20 w-52 rounded-lg border border-white/10 bg-surface-950 p-2 shadow-2xl shadow-black/40">
      {children}
    </div>
  );
}

function MenuToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition ${
        active ? "bg-mint-300/10 text-mint-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
      <span className={active ? "text-mint-300" : "text-slate-600"}>{active ? "On" : "Off"}</span>
    </button>
  );
}

function ChartTool({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function getPriceRange(candles: Candle[], tradeLevels: ChartTradeLevels, drawings: ChartDrawing[]) {
  const values = [
    ...candles.flatMap((candle) => [candle.high, candle.low]),
    ...drawings.map((drawing) => drawing.price),
    tradeLevels.entry,
    tradeLevels.stop,
    tradeLevels.target,
  ].filter((value): value is number => Number.isFinite(value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.08 || max * 0.01;
  return { min: min - padding, max: max + padding };
}

function priceToY(price: number, range: { min: number; max: number }) {
  return 100 - ((price - range.min) / (range.max - range.min)) * 100;
}

function buildVolumeSeries(candles: Candle[]) {
  return candles.map((candle, index) => Math.abs(candle.close - candle.open) * 1000 + 40 + (index % 7) * 12);
}

function buildRsiSeries(candles: Candle[]) {
  return candles.map((candle, index) => {
    const pulse = Math.sin(index * 0.35) * 12;
    const direction = candle.close >= candle.open ? 5 : -5;
    return Math.max(18, Math.min(82, 52 + pulse + direction));
  });
}

function buildMacdSeries(candles: Candle[]) {
  return candles.map((_, index) => {
    const macd = Math.sin(index * 0.22) * 1.4;
    const signal = Math.sin(index * 0.22 - 0.5) * 1.1;
    return { macd, signal, histogram: macd - signal };
  });
}

function toolLabel(tool: ChartDrawingTool) {
  if (tool === "horizontal-line") return "Horizontal Line";
  if (tool === "trend-line") return "Trend Line";
  if (tool === "support-zone") return "Support Zone";
  if (tool === "resistance-zone") return "Resistance Zone";
  if (tool === "entry") return "Entry";
  if (tool === "stop") return "Stop";
  if (tool === "target") return "Target";
  return "Tool";
}
