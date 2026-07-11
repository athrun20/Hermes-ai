"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import { TradeControls, type TradeTicket } from "@/components/trade-controls";
import { Panel, StatusPill } from "@/components/ui";
import { formatCurrency, type AssetQuote } from "@/lib/market-data";
import type { OpportunityScore } from "@/lib/hermes-brain";
import type { ChartTradeLevels } from "@/lib/chart-types";
import { HermesScoreBadge } from "@/components/hermes-score-badge";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import { TradeQualityBadge } from "@/components/trade-quality-badge";
import type { TradeQualityPlan, TradeQualityResult } from "@/lib/trade-quality-types";
import type { PortfolioSnapshot } from "@/lib/paper-trading";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { NewsIntelligenceResult } from "@/lib/news-types";

type DockMode = "compact" | "expanded" | "collapsed";

export function FloatingTradePlan({
  buyingPower,
  quote,
  opportunity,
  hermesScore,
  tradeQuality,
  multiTimeframe,
  footprint,
  portfolio,
  reasoning,
  memory,
  news,
  timeframe,
  chartLevels,
  statusMessage,
  visionCaution,
  buildTradeQuality,
  onSubmit,
}: {
  buyingPower: number;
  quote: AssetQuote;
  opportunity: OpportunityScore;
  hermesScore: HermesScoreResult;
  tradeQuality: TradeQualityResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  portfolio: PortfolioSnapshot;
  reasoning?: ReasoningResult;
  memory?: HermesMemorySnapshot;
  news?: NewsIntelligenceResult;
  timeframe: string;
  chartLevels: ChartTradeLevels;
  statusMessage?: string;
  visionCaution?: {
    active: boolean;
    message: string;
  };
  buildTradeQuality: (plan: TradeQualityPlan) => TradeQualityResult;
  onSubmit: (ticket: TradeTicket) => string | undefined;
}) {
  const [mode, setMode] = useState<DockMode>("compact");

  if (mode === "collapsed") {
    return (
      <button
        className="w-full rounded-lg border border-white/10 bg-surface-950/55 px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-amberline transition hover:border-amberline/25 hover:bg-amberline/10"
        onClick={() => setMode("compact")}
        type="button"
      >
        Trade Plan
      </button>
    );
  }

  if (mode === "expanded") {
    return (
      <div className="space-y-3 rounded-lg border border-white/10 bg-surface-950/45 p-2 shadow-xl shadow-black/15">
        <DockHeader mode={mode} onModeChange={setMode} />
        <TradeControls
          buyingPower={buyingPower}
          chartLevels={chartLevels}
          footprint={footprint}
          portfolio={portfolio}
          reasoning={reasoning}
          memory={memory}
          news={news}
          timeframe={timeframe}
          buildTradeQuality={buildTradeQuality}
          multiTimeframe={multiTimeframe}
          opportunity={opportunity}
          quote={quote}
          statusMessage={statusMessage}
          visionCaution={visionCaution}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  return (
    <Panel className="overflow-hidden bg-surface-950/60 shadow-xl shadow-black/15">
      <DockHeader mode={mode} onModeChange={setMode} />
      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-mint-300/20 bg-mint-300/[0.055] p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-200/80">
            Current Price
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-400">{quote.symbol}/USD</p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-[-0.02em] text-white">
                {formatCurrency(quote.price)}
              </p>
            </div>
            <StatusPill tone={quote.change24h >= 0 ? "mint" : "danger"}>
              {quote.change24h >= 0 ? "+" : ""}
              {quote.change24h.toFixed(2)}%
            </StatusPill>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <MiniMetric label="Bias" value={opportunity.bias} />
          <MiniMetric label="Hermes Score" value={`${hermesScore.score}`} />
        </div>
        <HermesScoreBadge score={hermesScore} />
        <TradeQualityBadge quality={tradeQuality} />
        <MultiTimeframeContext intelligence={multiTimeframe} />
        <InstitutionalContext footprint={footprint} />
        {visionCaution?.active ? (
          <div className="rounded-lg border border-amberline/20 bg-amberline/[0.07] px-3 py-2 text-xs leading-5 text-amber-100">
            {visionCaution.message}
          </div>
        ) : null}
        <button
          className="w-full rounded-lg border border-amberline/25 bg-amberline/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amberline/15"
          onClick={() => setMode("expanded")}
          type="button"
        >
          Expand Trade Plan
        </button>
      </div>
    </Panel>
  );
}

function InstitutionalContext({ footprint }: { footprint: InstitutionalFootprintResult }) {
  const caution = ["Distribution", "Failed Breakout", "Hidden Selling", "Demand Absorbed", "Exhaustion"].includes(footprint.type);

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-5 ${caution ? "border-amberline/20 bg-amberline/[0.07] text-amber-100" : "border-white/10 bg-white/[0.035] text-slate-400"}`}>
      <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">Institutional Context</p>
      <p className="mt-1">
        {footprint.type === "No clear institutional footprint"
          ? "No clear institutional footprint is visible yet."
          : `${footprint.type} context: ${footprint.riskNote}`}
      </p>
    </div>
  );
}

function MultiTimeframeContext({ intelligence }: { intelligence: MultiTimeframeIntelligence }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Multi-Timeframe Context
        </p>
        <span className={intelligence.alignmentImpact >= 0 ? "text-xs font-semibold text-mint-300" : "text-xs font-semibold text-rose-300"}>
          {intelligence.alignmentImpact >= 0 ? "+" : ""}
          {intelligence.alignmentImpact}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {intelligence.rows.map((row) => (
          <div
            className="rounded-md border border-white/10 bg-surface-950/45 px-2 py-1.5 text-center"
            key={row.timeframe}
            title={`${row.timeframe} ${row.direction}`}
          >
            <p className="text-[10px] font-semibold text-slate-500">{row.timeframe}</p>
            <p className={row.direction.includes("Bullish") ? "mt-1 text-[10px] font-semibold text-mint-300" : row.direction.includes("Bearish") ? "mt-1 text-[10px] font-semibold text-rose-300" : "mt-1 text-[10px] font-semibold text-slate-300"}>
              {shortDirection(row.direction)}
            </p>
          </div>
        ))}
      </div>
      <p className={`mt-2 text-xs leading-5 ${intelligence.countertrendWarning ? "text-amber-100" : "text-slate-400"}`}>
        {intelligence.countertrendWarning ?? "The proposed trade is being checked against higher-timeframe structure."}
      </p>
    </div>
  );
}

function shortDirection(direction: MultiTimeframeIntelligence["rows"][number]["direction"]) {
  if (direction === "Strong Bullish") return "S Bull";
  if (direction === "Strong Bearish") return "S Bear";
  if (direction === "Bullish") return "Bull";
  if (direction === "Bearish") return "Bear";
  return "Neutral";
}

function DockHeader({
  mode,
  onModeChange,
}: {
  mode: DockMode;
  onModeChange: (mode: DockMode) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
          Trade Plan
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Visual Plan</h2>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
          onClick={() => onModeChange(mode === "expanded" ? "compact" : "expanded")}
          type="button"
          aria-label={mode === "expanded" ? "Compact trade plan" : "Expand trade plan"}
        >
          {mode === "expanded" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <button
          className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
          onClick={() => onModeChange("collapsed")}
          type="button"
          aria-label="Collapse trade plan dock"
        >
          <Minimize2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
