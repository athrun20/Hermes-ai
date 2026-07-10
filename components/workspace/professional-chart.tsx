"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bell, RotateCcw, Ruler, SlidersHorizontal } from "lucide-react";
import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
import { formatCurrency, formatPercent, type AssetQuote, type Candle } from "@/lib/market-data";
import { type WorkspaceTimeframe } from "@/lib/market-universe";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { HermesVisionPanel } from "@/components/workspace/hermes-vision-panel";
import { NativeHermesChart } from "@/components/workspace/native-hermes-chart";
import type { HermesVisionLabel, HermesVisionResult } from "@/lib/hermes-vision-types";
import { HermesScoreBadge } from "@/components/hermes-score-badge";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import {
  evaluateHermesAlert,
  hermesAlertConditionLabels,
  type HermesAlert,
  type HermesAlertCondition,
} from "@/lib/hermes-alerts";
import { Panel, StatusPill } from "@/components/ui";

export type IndicatorVisibility = {
  volume: boolean;
  rsi: boolean;
  macd: boolean;
  ema20: boolean;
  ema50: boolean;
  sma20: boolean;
  vwap: boolean;
};

const timeframes: WorkspaceTimeframe[] = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];
const indicatorLabels: Array<[keyof IndicatorVisibility, string]> = [
  ["volume", "Volume"],
  ["rsi", "RSI"],
  ["macd", "MACD"],
  ["ema20", "EMA 20"],
  ["ema50", "EMA 50"],
  ["sma20", "SMA 20"],
  ["vwap", "VWAP"],
];
const ALERTS_STORAGE_KEY = "hermes.chart.alerts.v1";

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
  hermesScore,
  strategy,
  multiTimeframe,
  footprint,
  chartLabels,
  newsKeywords = [],
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
  hermesScore: HermesScoreResult;
  strategy: StrategyIntelligenceResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  chartLabels?: HermesVisionLabel[];
  newsKeywords?: string[];
  onTimeframeChange: (timeframe: WorkspaceTimeframe) => void;
  onToggleIndicator: (indicator: keyof IndicatorVisibility) => void;
  onToolChange: (tool: ChartDrawingTool) => void;
  onChartPriceSelect: (price: number) => void;
  onClearDrawings: () => void;
}) {
  const chartControlsRef = useRef<HTMLDivElement | null>(null);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<HermesAlert[]>([]);
  const [alertCondition, setAlertCondition] = useState<HermesAlertCondition>("price-above");
  const [alertValue, setAlertValue] = useState("");
  const [alertNote, setAlertNote] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertToast, setAlertToast] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const rsiSeries = useMemo(() => buildRsiSeries(candles), [candles]);
  const macdSeries = useMemo(() => buildMacdSeries(candles), [candles]);
  const volumeSeries = useMemo(() => buildVolumeSeries(candles), [candles]);
  const currentRsi = rsiSeries[rsiSeries.length - 1] ?? 50;
  const currentMacd = macdSeries[macdSeries.length - 1] ?? { macd: 0, signal: 0, histogram: 0 };
  const previousMacd = macdSeries[macdSeries.length - 2] ?? currentMacd;
  const currentVolume = volumeSeries[volumeSeries.length - 1] ?? 0;
  const averageVolume = average(volumeSeries.slice(-20));

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        chartControlsRef.current &&
        !chartControlsRef.current.contains(event.target as Node)
      ) {
        setIndicatorMenuOpen(false);
        setDrawingMenuOpen(false);
        setAlertsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectDrawingTool = useCallback(
    (tool: ChartDrawingTool) => {
      onToolChange(tool);
      setDrawingMenuOpen(false);
    },
    [onToolChange],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
      if (raw) {
        setAlerts(
          (JSON.parse(raw) as Array<Omit<HermesAlert, "condition"> & { condition: string }>).map((alert) => ({
            ...alert,
            condition:
              alert.condition === "macd-crossover"
                ? "macd-bullish-cross"
                : (alert.condition as HermesAlertCondition),
          })),
        );
      }
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    const snapshot = {
      price: quote.price,
      rsi: currentRsi,
      previousMacd: {
        line: previousMacd.macd,
        signal: previousMacd.signal,
      },
      macd: {
        line: currentMacd.macd,
        signal: currentMacd.signal,
      },
      volume: {
        current: currentVolume,
        average: averageVolume,
      },
      newsKeywords,
    };

    setAlerts((current) => {
      let changed = false;
      const next = current.map((alert) => {
        if (alert.symbol !== quote.symbol || alert.triggeredAt) return alert;
        const message = evaluateHermesAlert(alert, snapshot);
        if (!message) return alert;
        changed = true;
        setAlertToast(message);
        return {
          ...alert,
          triggeredAt: Date.now(),
          lastMessage: message,
        };
      });
      return changed ? next : current;
    });
  }, [averageVolume, currentMacd.macd, currentMacd.signal, currentRsi, currentVolume, newsKeywords, previousMacd.macd, previousMacd.signal, quote.price, quote.symbol]);

  useEffect(() => {
    if (!alertToast) return;
    const timeout = window.setTimeout(() => setAlertToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [alertToast]);

  const openCreateAlert = useCallback(() => {
    setEditingAlertId(null);
    setAlertCondition("price-above");
    setAlertValue("");
    setAlertNote("");
    setAlertEnabled(true);
    setAlertModalOpen(true);
  }, []);

  const openEditAlert = useCallback((alert: HermesAlert) => {
    setEditingAlertId(alert.id);
    setAlertCondition(alert.condition);
    setAlertValue(typeof alert.value === "number" ? String(alert.value) : "");
    setAlertNote(alert.note ?? "");
    setAlertEnabled(alert.enabled);
    setAlertModalOpen(true);
  }, []);

  const saveAlert = useCallback(() => {
    const requiresValue =
      alertCondition === "price-above" ||
      alertCondition === "price-below" ||
      alertCondition === "rsi-above" ||
      alertCondition === "rsi-below";
    const parsedValue = Number(alertValue);

    if (requiresValue && (!Number.isFinite(parsedValue) || parsedValue <= 0)) return;

    setAlerts((current) => {
      if (editingAlertId) {
        return current.map((alert) =>
          alert.id === editingAlertId
            ? {
                ...alert,
                condition: alertCondition,
                value: requiresValue ? parsedValue : undefined,
                note: alertNote.trim() || undefined,
                enabled: alertEnabled,
                triggeredAt: undefined,
                lastMessage: undefined,
              }
            : alert,
        );
      }

      return [
        {
          id: `${quote.symbol}-${alertCondition}-${Date.now()}`,
          symbol: quote.symbol,
          condition: alertCondition,
          value: requiresValue ? parsedValue : undefined,
          note: alertNote.trim() || undefined,
          enabled: alertEnabled,
          createdAt: Date.now(),
        },
        ...current,
      ];
    });
    setAlertValue("");
    setAlertNote("");
    setAlertEnabled(true);
    setEditingAlertId(null);
    setAlertModalOpen(false);
    setAlertsMenuOpen(true);
  }, [alertCondition, alertEnabled, alertNote, alertValue, editingAlertId, quote.symbol]);

  const symbolAlerts = alerts.filter((alert) => alert.symbol === quote.symbol);

  return (
    <Panel className="min-h-[940px] overflow-hidden transition-all duration-300">
      <div className="border-b border-white/10 bg-surface-950/35 px-4 py-3.5 sm:px-5" ref={chartControlsRef}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amberline/70">
                Hermes Chart Workspace
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <h2 className="text-[28px] font-semibold leading-none tracking-tight text-white">{quote.symbol}</h2>
                <p className="text-sm font-medium text-slate-500">{quote.name}</p>
                <span className="font-mono text-sm font-semibold tabular-nums text-white">
                  {formatCurrency(quote.price)}
                </span>
                <span className={quote.change24h >= 0 ? "text-xs font-semibold text-mint-300" : "text-xs font-semibold text-rose-300"}>
                  {formatPercent(quote.change24h)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="muted">{timeframe}</StatusPill>
              <StatusPill tone={analysis.marketBias === "Bullish" ? "mint" : analysis.marketBias === "Bearish" ? "danger" : "gold"}>
                {analysis.marketBias} / {analysis.confidence}%
              </StatusPill>
              <HermesScoreBadge score={hermesScore} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#070A0F]/80 p-2 shadow-inner shadow-black/30">
            <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1">
              {timeframes.map((frame) => (
                <button
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition duration-200 ${
                    timeframe === frame ? "bg-white/10 text-white shadow-sm shadow-black/20" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                  key={frame}
                  onClick={() => onTimeframeChange(frame)}
                  type="button"
                >
                  {frame}
                </button>
              ))}
            </div>
            <div className="h-7 w-px bg-white/10" />
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
                      onClick={() => selectDrawingTool(tool as ChartDrawingTool)}
                    />
                  ))}
                  <button
                    className="mt-2 w-full rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-left text-xs font-semibold text-rose-200"
                    onClick={() => {
                      onClearDrawings();
                      setDrawingMenuOpen(false);
                    }}
                    type="button"
                  >
                    Clear Drawings
                  </button>
                </ToggleMenu>
              ) : null}
            </div>
            <div className="relative">
              <ChartTool label="Alerts" icon={<Bell className="size-4" />} onClick={() => setAlertsMenuOpen((open) => !open)} />
              {alertsMenuOpen ? (
                <AlertsMenu
                  alerts={symbolAlerts}
                  onCreate={openCreateAlert}
                  onEdit={openEditAlert}
                  onRemove={(id) => setAlerts((current) => current.filter((alert) => alert.id !== id))}
                  onToggle={(id) =>
                    setAlerts((current) =>
                      current.map((alert) =>
                        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert,
                      ),
                    )
                  }
                />
              ) : null}
            </div>
            <ChartTool
              label="Reset"
              icon={<RotateCcw className="size-4" />}
              onClick={() => {
                setResetToken((current) => current + 1);
              }}
            />
          </div>
        </div>
        {alertModalOpen ? (
          <AlertModal
            condition={alertCondition}
            editing={Boolean(editingAlertId)}
            enabled={alertEnabled}
            note={alertNote}
            symbol={quote.symbol}
            value={alertValue}
            onCancel={() => {
              setAlertModalOpen(false);
              setEditingAlertId(null);
            }}
            onConditionChange={setAlertCondition}
            onEnabledChange={setAlertEnabled}
            onNoteChange={setAlertNote}
            onSave={saveAlert}
            onValueChange={setAlertValue}
          />
        ) : null}
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <HermesVisionPanel
          hermesScore={hermesScore}
          footprint={footprint}
          multiTimeframe={multiTimeframe}
          strategy={strategy}
          vision={vision}
        />
        <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
          <WorkspaceToolbar
            selectedTool={selectedTool}
            onClearDrawings={onClearDrawings}
            onToolChange={onToolChange}
          />
          <NativeHermesChart
            alertToast={alertToast}
            candles={candles}
            drawings={drawings}
            indicators={indicators}
            resetToken={resetToken}
            selectedTool={selectedTool}
            tradeLevels={tradeLevels}
            visionLabels={chartLabels ?? vision.labels}
            onPriceSelect={onChartPriceSelect}
          />
        </div>

      </div>
    </Panel>
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

function ToggleMenu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-11 z-20 w-52 rounded-xl border border-white/10 bg-surface-950/95 p-2 shadow-2xl shadow-black/45 backdrop-blur-xl">
      {children}
    </div>
  );
}

function AlertsMenu({
  alerts,
  onCreate,
  onEdit,
  onToggle,
  onRemove,
}: {
  alerts: HermesAlert[];
  onCreate: () => void;
  onEdit: (alert: HermesAlert) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const activeAlerts = alerts.filter((alert) => !alert.triggeredAt);
  const triggeredAlerts = alerts.filter((alert) => alert.triggeredAt);

  return (
    <div className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-white/10 bg-surface-950/95 p-3 shadow-2xl shadow-black/45 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amberline/80">Alerts</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Hermes watches paper conditions and reminds you to study, not react.
          </p>
        </div>
        <button
          className="shrink-0 rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 py-2 text-xs font-semibold text-mint-200 transition hover:bg-mint-300/15"
          onClick={onCreate}
          type="button"
        >
          Create Alert
        </button>
      </div>
      <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3 text-xs leading-5 text-slate-500">
            No alerts for this symbol yet.
          </div>
        ) : (
          <>
            <AlertGroup
              alerts={activeAlerts}
              empty="No active alerts."
              title="Active Alerts"
              onEdit={onEdit}
              onRemove={onRemove}
              onToggle={onToggle}
            />
            <AlertGroup
              alerts={triggeredAlerts}
              empty="No triggered alerts."
              title="Triggered Alerts"
              triggered
              onEdit={onEdit}
              onRemove={onRemove}
              onToggle={onToggle}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AlertGroup({
  title,
  alerts,
  empty,
  triggered = false,
  onEdit,
  onToggle,
  onRemove,
}: {
  title: string;
  alerts: HermesAlert[];
  empty: string;
  triggered?: boolean;
  onEdit: (alert: HermesAlert) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      {alerts.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-[11px] text-slate-500">
          {empty}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertRow
              alert={alert}
              key={alert.id}
              triggered={triggered}
              onEdit={onEdit}
              onRemove={onRemove}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AlertRow({
  alert,
  triggered,
  onEdit,
  onToggle,
  onRemove,
}: {
  alert: HermesAlert;
  triggered: boolean;
  onEdit: (alert: HermesAlert) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        triggered ? "border-amberline/25 bg-amberline/[0.08]" : "border-white/10 bg-white/[0.025]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">
            {hermesAlertConditionLabels[alert.condition]}
            {typeof alert.value === "number" ? ` ${alert.value}` : ""}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            {alert.lastMessage ?? alert.note ?? "Hermes will watch this condition."}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
              alert.enabled
                ? "border-mint-300/20 bg-mint-300/10 text-mint-200"
                : "border-white/10 bg-white/[0.035] text-slate-500"
            }`}
            onClick={() => onToggle(alert.id)}
            type="button"
          >
            {alert.enabled ? "On" : "Off"}
          </button>
          <button
            className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-white"
            onClick={() => onEdit(alert)}
            type="button"
          >
            Edit
          </button>
          <button
            aria-label="Delete alert"
            className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-white"
            onClick={() => onRemove(alert.id)}
            type="button"
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertModal({
  symbol,
  condition,
  value,
  note,
  enabled,
  editing,
  onConditionChange,
  onValueChange,
  onNoteChange,
  onEnabledChange,
  onCancel,
  onSave,
}: {
  symbol: string;
  condition: HermesAlertCondition;
  value: string;
  note: string;
  enabled: boolean;
  editing: boolean;
  onConditionChange: (condition: HermesAlertCondition) => void;
  onValueChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const needsValue =
    condition === "price-above" ||
    condition === "price-below" ||
    condition === "rsi-above" ||
    condition === "rsi-below";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface-950 p-5 shadow-2xl shadow-black/50">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            {editing ? "Edit Alert" : "Create Alert"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">Hermes Alert</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Rule-based paper alerts only. Hermes reminds you to review context before acting.
          </p>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Symbol</span>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-white outline-none"
              readOnly
              value={symbol}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Condition</span>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm text-white outline-none"
              onChange={(event) => onConditionChange(event.target.value as HermesAlertCondition)}
              value={condition}
            >
              {Object.entries(hermesAlertConditionLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {needsValue ? (
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Value</span>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm font-semibold text-white outline-none placeholder:text-slate-600"
                inputMode="decimal"
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={condition.startsWith("rsi") ? "70" : "Price level"}
                type="number"
                value={value}
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Optional note</span>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm text-white outline-none placeholder:text-slate-600"
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Example: BTC crossed planned resistance."
              value={note}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-semibold text-slate-300">
            Enabled
            <input
              checked={enabled}
              className="accent-mint-300"
              onChange={(event) => onEnabledChange(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg border border-mint-300/25 bg-mint-300/10 px-4 py-2 text-xs font-semibold text-mint-200 transition hover:bg-mint-300/15"
            onClick={onSave}
            type="button"
          >
            Save Alert
          </button>
        </div>
      </div>
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
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 transition duration-200 hover:border-amberline/25 hover:bg-white/[0.06] hover:text-white"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function buildVolumeSeries(candles: Candle[]) {
  return candles.map((candle, index) => Math.abs(candle.close - candle.open) * 1000 + 40 + (index % 7) * 12);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
