"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import { RotateCcw, Ruler, SlidersHorizontal } from "lucide-react";
import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
import { formatCurrency, formatPercent, type AssetQuote, type Candle } from "@/lib/market-data";
import { type WorkspaceTimeframe } from "@/lib/market-universe";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import {
  buildChartIndicatorOverlays,
  buildChartIntelligenceContext,
  type ChartOverlayPoint,
} from "@/lib/chart-overlay-engine";
import { ChartCrosshair, type ChartCrosshairState } from "@/components/workspace/chart-crosshair";
import { ChartIndicatorLegend } from "@/components/workspace/chart-indicator-overlays";
import { ChartTradeLevelsOverlay } from "@/components/workspace/chart-trade-levels";
import { HermesVisionLabels } from "@/components/workspace/hermes-vision-labels";
import { HermesVisionPanel } from "@/components/workspace/hermes-vision-panel";
import type { HermesVisionResult } from "@/lib/hermes-vision-types";
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

type IndicatorPanelState = {
  volume: IndicatorPanelSetting;
  rsi: IndicatorPanelSetting;
  macd: IndicatorPanelSetting;
};

type IndicatorPanelSetting = {
  collapsed: boolean;
  height: number;
};

const toolbarTools: Array<{
  tool: ChartDrawingTool;
  label: string;
}> = [
  { tool: "crosshair", label: "Crosshair" },
  { tool: "trend-line", label: "Trend Line" },
  { tool: "horizontal-line", label: "Horizontal Line" },
  { tool: "ray", label: "Ray" },
  { tool: "rectangle", label: "Rectangle" },
  { tool: "support-zone", label: "Support Zone" },
  { tool: "resistance-zone", label: "Resistance Zone" },
  { tool: "risk-reward", label: "Risk/Reward Tool" },
  { tool: "text-note", label: "Text Note" },
  { tool: "erase", label: "Erase Drawing" },
  { tool: "entry", label: "Set Entry" },
  { tool: "stop", label: "Set Stop" },
  { tool: "target", label: "Set Target" },
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
  vision,
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
  vision: HermesVisionResult;
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
  const ema20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);
  const [crosshair, setCrosshair] = useState<ChartCrosshairState>({
    visible: false,
    x: 0,
    y: 0,
    price: quote.price,
    timeLabel: "",
  });
  const [indicatorPanels, setIndicatorPanels] = useState<IndicatorPanelState>({
    volume: { collapsed: false, height: 118 },
    rsi: { collapsed: false, height: 142 },
    macd: { collapsed: false, height: 156 },
  });
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
  const indicatorOverlays = useMemo(() => buildChartIndicatorOverlays(candles), [candles]);
  const chartIntelligenceContext = useMemo(
    () => buildChartIntelligenceContext({ drawings, tradeLevels }),
    [drawings, tradeLevels],
  );

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
        barSpacing: 12,
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
    const ema20 = chart.addSeries(LineSeries, {
      color: "#79F2C0",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const ema50 = chart.addSeries(LineSeries, {
      color: "#F5B84B",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const vwap = chart.addSeries(LineSeries, {
      color: "#7DD3FC",
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    ema20Ref.current = ema20;
    ema50Ref.current = ema50;
    vwapRef.current = vwap;
    return () => chart.remove();
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

  useEffect(() => {
    ema20Ref.current?.setData(indicators.ema20 ? toLineData(indicatorOverlays.ema20) : []);
    ema50Ref.current?.setData(indicators.ema50 ? toLineData(indicatorOverlays.ema50) : []);
    vwapRef.current?.setData(indicators.vwap ? toLineData(indicatorOverlays.vwap) : []);
  }, [indicatorOverlays, indicators.ema20, indicators.ema50, indicators.vwap]);

  const handleChartClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (selectedTool === "none" || selectedTool === "crosshair" || !plotRef.current) return;

    const rect = plotRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const price = priceRange.max - ratio * (priceRange.max - priceRange.min);
    onChartPriceSelect(price);
  };

  const handleChartHover = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!plotRef.current) return;

    const rect = plotRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const yRatio = y / rect.height;
    const xRatio = x / Math.max(rect.width, 1);
    const price = priceRange.max - yRatio * (priceRange.max - priceRange.min);
    const candleIndex = Math.max(
      0,
      Math.min(candles.length - 1, Math.round(xRatio * Math.max(candles.length - 1, 0))),
    );

    setCrosshair({
      visible: true,
      x,
      y,
      price,
      timeLabel: formatCandleTime(candles[candleIndex]?.time),
    });
  };

  const toggleIndicatorPanel = useCallback((panel: keyof IndicatorPanelState) => {
    setIndicatorPanels((current) => ({
      ...current,
      [panel]: {
        ...current[panel],
        collapsed: !current[panel].collapsed,
      },
    }));
  }, []);

  const startIndicatorResize = useCallback(
    (panel: keyof IndicatorPanelState, event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = indicatorPanels[panel].height;

      const handleMove = (moveEvent: MouseEvent) => {
        const nextHeight = Math.max(88, Math.min(260, startHeight + moveEvent.clientY - startY));
        setIndicatorPanels((current) => ({
          ...current,
          [panel]: {
            ...current[panel],
            height: Math.round(nextHeight),
          },
        }));
      };

      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [indicatorPanels],
  );

  return (
    <Panel className="min-h-[940px] overflow-hidden">
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
                    ["crosshair", "Crosshair"],
                    ["horizontal-line", "Horizontal Line"],
                    ["trend-line", "Trend Line"],
                    ["ray", "Ray"],
                    ["rectangle", "Rectangle"],
                    ["support-zone", "Support Zone"],
                    ["resistance-zone", "Resistance Zone"],
                    ["risk-reward", "Risk/Reward Tool"],
                    ["text-note", "Text Note"],
                    ["erase", "Erase Drawing"],
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

      <div className="space-y-3 p-3 sm:p-4">
        <HermesVisionPanel vision={vision} />
        <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
          <WorkspaceToolbar
            selectedTool={selectedTool}
            onClearDrawings={onClearDrawings}
            onToolChange={onToolChange}
          />
          <div
            className="relative h-[760px] overflow-hidden rounded-lg border border-white/10 bg-[#070A0F] 2xl:h-[820px]"
            onClick={handleChartClick}
            onMouseLeave={() => setCrosshair((current) => ({ ...current, visible: false }))}
            onMouseMove={handleChartHover}
            ref={plotRef}
            data-support-count={chartIntelligenceContext.supportLines.length}
            data-resistance-count={chartIntelligenceContext.resistanceLines.length}
            data-trend-count={chartIntelligenceContext.trendLines.length}
          >
            <div ref={containerRef} className="absolute inset-0" />
            <HermesChartOverlay analysis={analysis} />
            <ChartIndicatorLegend indicators={indicators} />
            <ChartTradeLevelsOverlay
              drawings={drawings}
              priceRange={priceRange}
              tradeLevels={tradeLevels}
            />
            <HermesVisionLabels
              fallbackPrice={quote.price}
              labels={vision.labels}
              priceRange={priceRange}
            />
            <ChartCrosshair state={crosshair} />
            {selectedTool !== "none" && selectedTool !== "crosshair" ? (
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-amberline/25 bg-surface-950/85 px-3 py-2 text-xs font-semibold text-amberline">
                Click chart to place {toolLabel(selectedTool)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2.5">
          {indicators.volume ? (
            <VolumePanel
              collapsed={indicatorPanels.volume.collapsed}
              data={volumeSeries}
              height={indicatorPanels.volume.height}
              onResizeStart={(event) => startIndicatorResize("volume", event)}
              onToggle={() => toggleIndicatorPanel("volume")}
            />
          ) : null}
          {indicators.rsi ? (
            <RsiPanel
              collapsed={indicatorPanels.rsi.collapsed}
              data={rsiSeries}
              height={indicatorPanels.rsi.height}
              onResizeStart={(event) => startIndicatorResize("rsi", event)}
              onToggle={() => toggleIndicatorPanel("rsi")}
            />
          ) : null}
          {indicators.macd ? (
            <MacdPanel
              collapsed={indicatorPanels.macd.collapsed}
              data={macdSeries}
              height={indicatorPanels.macd.height}
              onResizeStart={(event) => startIndicatorResize("macd", event)}
              onToggle={() => toggleIndicatorPanel("macd")}
            />
          ) : null}
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
      label: getDrawingLabel(drawing.type),
      price: drawing.price,
      tone: getDrawingTone(drawing.type),
      zone: drawing.type === "support-zone" || drawing.type === "resistance-zone" || drawing.type === "rectangle" || drawing.type === "risk-reward",
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

function WorkspaceToolbar({
  selectedTool,
  onToolChange,
  onClearDrawings,
}: {
  selectedTool: ChartDrawingTool;
  onToolChange: (tool: ChartDrawingTool) => void;
  onClearDrawings: () => void;
}) {
  return (
    <aside className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-[#070A0F] p-1">
      {toolbarTools.map(({ tool, label }) => (
        <button
          className={`grid size-9 place-items-center rounded-md border text-slate-400 transition ${
            selectedTool === tool
              ? "border-amberline/35 bg-amberline/15 text-amberline"
              : "border-transparent hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
          }`}
          key={tool}
          onClick={() => onToolChange(selectedTool === tool ? "none" : tool)}
          title={label}
          type="button"
          aria-label={label}
        >
          <ToolIcon tool={tool} />
        </button>
      ))}
      <button
        className="mt-2 grid size-9 place-items-center rounded-md border border-rose-300/15 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15"
        onClick={onClearDrawings}
        title="Clear Drawings"
        type="button"
        aria-label="Clear Drawings"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}

function ToolIcon({ tool }: { tool: ChartDrawingTool }) {
  if (tool === "crosshair") {
    return (
      <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (tool === "trend-line" || tool === "ray") {
    return (
      <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 15L16 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        {tool === "ray" ? <path d="M13 5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
    );
  }

  if (tool === "horizontal-line" || tool === "entry" || tool === "stop" || tool === "target") {
    return (
      <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 10h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        {tool !== "horizontal-line" ? <circle cx="10" cy="10" r="2" fill="currentColor" /> : null}
      </svg>
    );
  }

  if (tool === "rectangle" || tool === "support-zone" || tool === "resistance-zone" || tool === "risk-reward") {
    return (
      <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        {tool === "risk-reward" ? <path d="M10 5v10" stroke="currentColor" strokeWidth="1.2" /> : null}
      </svg>
    );
  }

  if (tool === "text-note") {
    return (
      <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5h10M10 5v10M7 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 14l8-8M8 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function VolumePanel({
  data,
  collapsed,
  height,
  onToggle,
  onResizeStart,
}: {
  data: number[];
  collapsed: boolean;
  height: number;
  onToggle: () => void;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const max = Math.max(...data, 1);
  return (
    <IndicatorShell
      collapsed={collapsed}
      height={height}
      title="Volume"
      value="Mock participation"
      onResizeStart={onResizeStart}
      onToggle={onToggle}
    >
      <div className="flex h-full items-end gap-1">
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

function RsiPanel({
  data,
  collapsed,
  height,
  onToggle,
  onResizeStart,
}: {
  data: number[];
  collapsed: boolean;
  height: number;
  onToggle: () => void;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const current = data[data.length - 1] ?? 50;
  return (
    <IndicatorShell
      collapsed={collapsed}
      height={height}
      title="RSI"
      value={current.toFixed(1)}
      onResizeStart={onResizeStart}
      onToggle={onToggle}
    >
      <MiniLineChart data={data} min={0} max={100} reference={[70, 30]} color="#F5B84B" />
    </IndicatorShell>
  );
}

function MacdPanel({
  data,
  collapsed,
  height,
  onToggle,
  onResizeStart,
}: {
  data: { macd: number; signal: number; histogram: number }[];
  collapsed: boolean;
  height: number;
  onToggle: () => void;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const current = data[data.length - 1] ?? { macd: 0, signal: 0, histogram: 0 };
  return (
    <IndicatorShell
      collapsed={collapsed}
      height={height}
      title="MACD"
      value={`${current.macd.toFixed(2)} / ${current.signal.toFixed(2)}`}
      onResizeStart={onResizeStart}
      onToggle={onToggle}
    >
      <div className="relative h-full">
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
    <svg className={overlay ? "absolute inset-0 h-full w-full" : "h-full w-full"} preserveAspectRatio="none" viewBox="0 0 100 100">
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
  collapsed,
  height,
  onToggle,
  onResizeStart,
}: {
  title: string;
  value: string;
  children: ReactNode;
  collapsed: boolean;
  height: number;
  onToggle: () => void;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <section className="relative rounded-lg border border-white/10 bg-[#070A0F] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-200">{value}</p>
          <button
            className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:text-white"
            onClick={onToggle}
            type="button"
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>
      {collapsed ? null : (
        <>
          <div className="mt-3" style={{ height }}>
            {children}
          </div>
          <button
            className="absolute inset-x-4 bottom-1 h-2 cursor-row-resize rounded-full bg-white/[0.035] opacity-70 transition hover:bg-amberline/25"
            onMouseDown={onResizeStart}
            type="button"
            aria-label={`Resize ${title} panel`}
          />
        </>
      )}
    </section>
  );
}

function ToggleMenu({ children }: { children: ReactNode }) {
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
  icon: ReactNode;
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

function toLineData(points: ChartOverlayPoint[]): LineData<Time>[] {
  return points.map((point) => ({
    time: point.time as Time,
    value: point.value,
  }));
}

function formatCandleTime(time?: number) {
  if (!time) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(time * 1000));
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
  if (tool === "crosshair") return "Crosshair";
  if (tool === "horizontal-line") return "Horizontal Line";
  if (tool === "trend-line") return "Trend Line";
  if (tool === "ray") return "Ray";
  if (tool === "rectangle") return "Rectangle";
  if (tool === "support-zone") return "Support Zone";
  if (tool === "resistance-zone") return "Resistance Zone";
  if (tool === "risk-reward") return "Risk/Reward Tool";
  if (tool === "text-note") return "Text Note";
  if (tool === "erase") return "Nearest Drawing to Erase";
  if (tool === "entry") return "Entry";
  if (tool === "stop") return "Stop";
  if (tool === "target") return "Target";
  return "Tool";
}

function getDrawingLabel(type: ChartDrawing["type"]) {
  if (type === "support-zone") return "Support Zone";
  if (type === "resistance-zone") return "Resistance Zone";
  if (type === "trend-line") return "Trend";
  if (type === "ray") return "Ray";
  if (type === "rectangle") return "Rectangle";
  if (type === "risk-reward") return "Risk / Reward";
  if (type === "text-note") return "Note";
  return "Line";
}

function getDrawingTone(type: ChartDrawing["type"]) {
  if (type === "resistance-zone") return "rose";
  if (type === "support-zone") return "mint";
  if (type === "risk-reward") return "mint";
  return "gold";
}
