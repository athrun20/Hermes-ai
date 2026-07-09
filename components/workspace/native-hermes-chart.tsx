"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
import type { Candle } from "@/lib/market-data";
import { buildChartBounds, getPriceRange, getVisibleCandles, hitTestChart } from "@/lib/hermes-chart-engine/scales";
import { renderHermesChart } from "@/lib/hermes-chart-engine/renderer";
import type { HermesChartIndicators, HermesChartViewport } from "@/lib/hermes-chart-engine/types";
import type { HermesVisionLabel } from "@/lib/hermes-vision-types";
import { buildHermesChartSeries } from "@/lib/hermes-chart-engine/indicators";
import { explainCandle } from "@/lib/hermes-chart-engine/candle-explanation-engine";
import { CandleExplanationPanel } from "@/components/workspace/candle-explanation-panel";

export function NativeHermesChart({
  candles,
  indicators,
  drawings,
  tradeLevels,
  selectedTool,
  visionLabels,
  alertToast,
  resetToken,
  onPriceSelect,
}: {
  candles: Candle[];
  indicators: HermesChartIndicators;
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  selectedTool: ChartDrawingTool;
  visionLabels: HermesVisionLabel[];
  alertToast: string | null;
  resetToken: number;
  onPriceSelect: (price: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; viewport: HermesChartViewport } | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [viewport, setViewport] = useState<HermesChartViewport>(() => buildInitialViewport(candles.length));
  const [crosshair, setCrosshair] = useState({ visible: false, x: 0, y: 0 });
  const [selectedCandleIndex, setSelectedCandleIndex] = useState<number | null>(null);
  const visibleCandles = useMemo(() => getVisibleCandles(candles, viewport), [candles, viewport]);
  const series = useMemo(() => buildHermesChartSeries(candles), [candles]);
  const candleExplanation = useMemo(
    () => explainCandle(candles, series, selectedCandleIndex),
    [candles, selectedCandleIndex, series],
  );
  const priceRange = useMemo(
    () => getPriceRange(visibleCandles.length ? visibleCandles : candles),
    [candles, visibleCandles],
  );

  useEffect(() => {
    setViewport(buildInitialViewport(candles.length));
  }, [candles.length, resetToken]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      renderHermesChart({
        canvas: canvasRef.current,
        candles,
        viewport,
        indicators,
        drawings,
        tradeLevels,
        selectedTool,
        visionLabels,
        crosshair,
        selectedCandleIndex,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    candles,
    crosshair,
    drawings,
    indicators,
    selectedCandleIndex,
    selectedTool,
    size,
    tradeLevels,
    viewport,
    visionLabels,
  ]);

  const readHit = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const bounds = buildChartBounds(rect.width, rect.height, indicators);
      return hitTestChart({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        candles,
        viewport,
        rect: bounds.plot,
        priceRange,
      });
    },
    [candles, indicators, priceRange, viewport],
  );

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    setViewport((current) => zoomViewport(current, candles.length, direction));
  };

  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setCrosshair({ visible: true, x, y });

    if (dragStartRef.current) {
      const slot = rect.width / Math.max(1, dragStartRef.current.viewport.end - dragStartRef.current.viewport.start + 1);
      const delta = Math.round((dragStartRef.current.x - event.clientX) / Math.max(slot, 1));
      setViewport(shiftViewport(dragStartRef.current.viewport, candles.length, delta));
    }
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const hit = readHit(event);
    if (!hit) return;
    if (selectedTool === "none" || selectedTool === "crosshair") {
      setSelectedCandleIndex(hit.candleIndex);
      return;
    }
    onPriceSelect(hit.price);
  };

  return (
    <div
      className="relative h-[920px] overflow-hidden rounded-xl border border-white/10 bg-[#060910] shadow-inner shadow-black/40 transition-[height,border-color] duration-300 2xl:h-[1000px]"
      ref={wrapperRef}
    >
      <canvas
        className="size-full cursor-crosshair select-none"
        onClick={handleClick}
        onMouseDown={(event) => {
          if (event.button === 1 || event.altKey || event.shiftKey) {
            dragStartRef.current = { x: event.clientX, viewport };
          }
        }}
        onMouseLeave={() => {
          setCrosshair((current) => ({ ...current, visible: false }));
          dragStartRef.current = null;
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => {
          dragStartRef.current = null;
        }}
        onWheel={handleWheel}
        ref={canvasRef}
      />
      <CandleExplanationPanel explanation={candleExplanation} onClose={() => setSelectedCandleIndex(null)} />
      {selectedTool !== "none" && selectedTool !== "crosshair" ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-amberline/25 bg-surface-950/85 px-3 py-2 text-xs font-semibold text-amberline">
          Click chart to place {toolLabel(selectedTool)}
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-md border border-white/10 bg-surface-950/80 px-3 py-2 text-[11px] font-semibold text-slate-400 backdrop-blur-md">
        Wheel to zoom · Shift-drag to pan
      </div>
      {alertToast ? (
        <div className="pointer-events-none absolute right-4 top-4 max-w-sm rounded-lg border border-amberline/25 bg-surface-950/90 px-4 py-3 text-xs leading-5 text-amber-100 shadow-2xl shadow-black/35">
          {alertToast}
        </div>
      ) : null}
    </div>
  );
}

function buildInitialViewport(length: number): HermesChartViewport {
  const visible = Math.min(96, Math.max(24, length));
  return {
    start: Math.max(0, length - visible),
    end: Math.max(0, length - 1),
  };
}

function zoomViewport(viewport: HermesChartViewport, length: number, direction: number) {
  const current = viewport.end - viewport.start + 1;
  const next = Math.max(28, Math.min(length, Math.round(current * (direction > 0 ? 1.12 : 0.9))));
  const center = Math.round((viewport.start + viewport.end) / 2);
  const start = Math.max(0, Math.min(length - next, center - Math.floor(next / 2)));
  return { start, end: Math.min(length - 1, start + next - 1) };
}

function shiftViewport(viewport: HermesChartViewport, length: number, delta: number) {
  const width = viewport.end - viewport.start + 1;
  const start = Math.max(0, Math.min(Math.max(0, length - width), viewport.start + delta));
  return { start, end: Math.min(length - 1, start + width - 1) };
}

function toolLabel(tool: ChartDrawingTool) {
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
