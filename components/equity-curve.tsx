"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { EquityPoint } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function EquityCurve({ points }: { points: EquityPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const data = useMemo<LineData<Time>[]>(() => normalizeEquityPoints(points), [points]);

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
    });

    const series = chart.addSeries(LineSeries, {
      color: "#79F2C0",
      lineWidth: 2,
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
    const safeData = normalizeLineData(data);
    seriesRef.current?.setData(safeData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <Panel>
      <PanelHeader eyebrow="Equity Curve" title="Account Growth" />
      <div className="p-5">
        <div className="relative h-72 overflow-hidden rounded-lg border border-white/10 bg-[#070A0F]">
          <div ref={containerRef} className="absolute inset-0" />
        </div>
      </div>
    </Panel>
  );
}

function normalizeEquityPoints(points: EquityPoint[]): LineData<Time>[] {
  const latestValueByTime = new Map<number, number>();

  [...points]
    .sort((a, b) => a.time - b.time)
    .forEach((point) => {
      latestValueByTime.set(Math.floor(point.time), point.value);
    });

  return normalizeLineData(
    Array.from(latestValueByTime.entries()).map(([time, value]) => ({
      time: time as Time,
      value,
    })),
  );
}

function normalizeLineData(data: LineData<Time>[]): LineData<Time>[] {
  let previousTime = 0;

  return [...data]
    .map((point) => ({
      time: Number(point.time),
      value: point.value,
    }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
    .sort((a, b) => a.time - b.time)
    .map((point) => {
      const nextTime = point.time <= previousTime ? previousTime + 1 : point.time;
      previousTime = nextTime;

      return {
        time: nextTime as Time,
        value: point.value,
      };
    });
}
