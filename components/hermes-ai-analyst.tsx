"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleGauge,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { mockAssetAnalyses, type AnalystBias, type AssetAiAnalysis } from "@/lib/ai-analyst-data";
import { Panel, PanelHeader } from "./ui";

export function HermesAiAnalyst() {
  const [expandedSymbol, setExpandedSymbol] = useState("BTC");
  const averageConfidence = useMemo(
    () =>
      Math.round(
        mockAssetAnalyses.reduce((sum, item) => sum + item.confidence, 0) /
          mockAssetAnalyses.length,
      ),
    [],
  );

  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes AI Analyst"
        title="Multi-Asset Trade Intelligence"
        action={
          <span className="inline-flex items-center gap-2 rounded-md border border-mint-300/20 bg-mint-300/10 px-2.5 py-1 text-xs font-semibold text-mint-300">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {averageConfidence}% avg confidence
          </span>
        }
      />
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {mockAssetAnalyses.map((analysis) => (
            <CompactSignal key={analysis.symbol} analysis={analysis} />
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {mockAssetAnalyses.map((analysis) => (
            <AnalysisCard
              analysis={analysis}
              expanded={expandedSymbol === analysis.symbol}
              key={analysis.symbol}
              onToggle={() =>
                setExpandedSymbol((current) =>
                  current === analysis.symbol ? "" : analysis.symbol,
                )
              }
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function CompactSignal({ analysis }: { analysis: AssetAiAnalysis }) {
  const tone = biasTone(analysis.bias);

  return (
    <div className="rounded-lg border border-white/10 bg-surface-950/45 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{analysis.name}</p>
          <p className="mt-1 text-lg font-semibold text-white">{analysis.symbol}</p>
        </div>
        <span className={`text-sm font-bold ${tone}`}>{analysis.grade}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${confidenceFill(analysis.confidence)}`}
          style={{ width: `${analysis.confidence}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={tone}>{analysis.bias}</span>
        <span className="text-slate-400">{analysis.confidence}%</span>
      </div>
    </div>
  );
}

function AnalysisCard({
  analysis,
  expanded,
  onToggle,
}: {
  analysis: AssetAiAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = biasTone(analysis.bias);
  const BiasIcon = biasIcon(analysis.bias);

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] shadow-insetPanel transition duration-300 hover:border-white/20">
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg border border-white/10 bg-surface-950/60">
            <BiasIcon className={`size-5 ${tone}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {analysis.symbol}/USD
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">
              {analysis.name} Analyst Card
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className={`text-sm font-semibold ${tone}`}>{analysis.bias}</p>
            <p className="text-xs text-slate-500">{analysis.confidence}% confidence</p>
          </div>
          <ChevronDown
            className={`size-5 text-slate-400 transition duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={CircleGauge} label="Market Bias" value={analysis.bias} tone={tone} />
              <Metric
                icon={BarChart3}
                label="Confidence Score"
                value={`${analysis.confidence}/100`}
                tone={confidenceText(analysis.confidence)}
              />
              <Metric icon={Sparkles} label="Trade Grade" value={analysis.grade} tone={tone} />
              <Metric icon={ShieldAlert} label="Risk/Reward" value={analysis.riskReward} tone="text-amberline" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PriceLevel label="Suggested Entry Zone" value={analysis.entryZone} />
              <PriceLevel label="Suggested Stop Loss" value={analysis.stopLoss} danger />
              <PriceLevel label="Suggested Take Profit" value={analysis.takeProfit} />
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-surface-950/48 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Target className="size-4 text-mint-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-white">AI Reasoning</p>
              </div>
              <ul className="space-y-2">
                {analysis.reasoning.map((reason) => (
                  <li className="flex gap-3 text-sm leading-6 text-slate-300" key={reason}>
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-300/80" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CircleGauge;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function PriceLevel({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-base font-semibold ${danger ? "text-rose-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function biasTone(bias: AnalystBias) {
  if (bias === "Bullish") {
    return "text-mint-300";
  }

  if (bias === "Bearish") {
    return "text-rose-300";
  }

  return "text-amberline";
}

function biasIcon(bias: AnalystBias) {
  if (bias === "Bullish") {
    return TrendingUp;
  }

  if (bias === "Bearish") {
    return TrendingDown;
  }

  return CircleGauge;
}

function confidenceFill(confidence: number) {
  if (confidence >= 80) {
    return "bg-mint-400";
  }

  if (confidence >= 65) {
    return "bg-amberline";
  }

  return "bg-rose-400";
}

function confidenceText(confidence: number) {
  if (confidence >= 80) {
    return "text-mint-300";
  }

  if (confidence >= 65) {
    return "text-amberline";
  }

  return "text-rose-300";
}
