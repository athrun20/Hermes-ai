"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import {
  generateTradeTicketSuggestions,
  type OpportunityScore,
  type TradeTicketSuggestions,
} from "@/lib/hermes-brain";
import { formatCurrency, type AssetQuote } from "@/lib/market-data";
import type { OrderAction, PositionSide } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export type TradeTicket = {
  action: OrderAction;
  side: PositionSide;
  notional: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export function TradeControls({
  buyingPower,
  quote,
  opportunity,
  statusMessage,
  chartLevels,
  visionCaution,
  onSubmit,
}: {
  buyingPower: number;
  quote: AssetQuote;
  opportunity: OpportunityScore;
  statusMessage?: string;
  chartLevels?: {
    entry?: number;
    stop?: number;
    target?: number;
  };
  visionCaution?: {
    active: boolean;
    message: string;
  };
  onSubmit: (ticket: TradeTicket) => string | undefined;
}) {
  const [side, setSide] = useState<PositionSide>("Long");
  const [notional, setNotional] = useState("500");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [message, setMessage] = useState("Paper orders only. No broker connection.");
  const previousPlanKey = useRef("");
  const suggestions = useMemo(
    () => generateTradeTicketSuggestions({ quote, side, opportunity }),
    [opportunity, quote, side],
  );
  const planKey = `${quote.symbol}-${side}`;

  useEffect(() => {
    if (previousPlanKey.current === planKey) {
      return;
    }

    previousPlanKey.current = planKey;
    setEntryPrice(formatInputPrice(suggestions.entry.value));
    setStopLoss(formatInputPrice(suggestions.stopLoss.value));
    setTakeProfit(formatInputPrice(suggestions.takeProfit.value));
  }, [planKey, suggestions.entry.value, suggestions.stopLoss.value, suggestions.takeProfit.value]);

  useEffect(() => {
    if (statusMessage) {
      setMessage(statusMessage);
    }
  }, [statusMessage]);

  useEffect(() => {
    if (chartLevels?.entry) setEntryPrice(formatInputPrice(chartLevels.entry));
    if (chartLevels?.stop) setStopLoss(formatInputPrice(chartLevels.stop));
    if (chartLevels?.target) setTakeProfit(formatInputPrice(chartLevels.target));
  }, [chartLevels?.entry, chartLevels?.stop, chartLevels?.target]);

  const plannedEntry = parseNumber(entryPrice) ?? suggestions.entry.value;
  const plannedStopLoss = parseNumber(stopLoss) ?? suggestions.stopLoss.value;
  const plannedTakeProfit = parseNumber(takeProfit) ?? suggestions.takeProfit.value;
  const riskReward = calculateRiskReward({
    entry: plannedEntry,
    side,
    stopLoss: plannedStopLoss,
    takeProfit: plannedTakeProfit,
  });
  const amountIsInvalid = !Number.isFinite(Number(notional)) || Number(notional) <= 0;
  const openingDisabled = amountIsInvalid || Number(notional) > buyingPower;
  const closingDisabled = amountIsInvalid;

  const submit = (action: OrderAction) => {
    const response = onSubmit({
      action,
      side,
      notional: Number(notional),
      entryPrice: parseNumber(entryPrice) ?? undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
    });
    setMessage(response ?? getSuccessMessage(action));
  };

  return (
    <Panel>
      <PanelHeader eyebrow="AI Trade Planner" title={`${quote.symbol}/USD Trade Plan`} />
      <div className="space-y-5 p-5">
        <section className="rounded-lg border border-mint-300/20 bg-mint-300/[0.06] p-5 shadow-insetPanel">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-200/80">
            Current Market Price
          </p>
          <p className="mt-3 text-sm font-semibold tracking-wide text-slate-400">{quote.symbol}/USD</p>
          <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em] text-white">
            {formatCurrency(quote.price)}
          </p>
          <p className={`mt-3 text-sm font-semibold ${getChangeColor(quote.change24h)}`}>
            {quote.change24h >= 0 ? "▲" : "▼"} {quote.change24h >= 0 ? "+" : ""}
            {quote.change24h.toFixed(2)}%
          </p>
        </section>

        <AssessmentGrid suggestions={suggestions} />

        <section className="space-y-3">
          <FieldLabel>Position</FieldLabel>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-1">
            {(["Long", "Short"] as const).map((option) => (
              <button
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  side === option ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"
                }`}
                key={option}
                onClick={() => setSide(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 text-sm">
          <Input label="Amount" prefix="$" value={notional} onChange={setNotional} />
          <Input
            label="Suggested Entry"
            prefix="$"
            value={entryPrice}
            onChange={setEntryPrice}
            hint={
              <SuggestionNote
                value={formatCurrency(suggestions.entry.value)}
                confidence={suggestions.entry.confidence}
                explanation={suggestions.entry.explanation}
              />
            }
          />
          <Input
            label="Suggested Stop Loss"
            prefix="$"
            value={stopLoss}
            onChange={setStopLoss}
            hint={
              <SuggestionNote
                value={formatCurrency(suggestions.stopLoss.value)}
                confidence={suggestions.stopLoss.confidence}
                explanation={suggestions.stopLoss.explanation}
              />
            }
          />
          <Input
            label="Suggested Take Profit"
            prefix="$"
            value={takeProfit}
            onChange={setTakeProfit}
            hint={
              <SuggestionNote
                value={formatCurrency(suggestions.takeProfit.value)}
                confidence={suggestions.takeProfit.confidence}
                explanation={suggestions.takeProfit.explanation}
              />
            }
          />
        </section>

        <RiskRewardCard riskReward={riskReward} />
        {visionCaution?.active ? (
          <section className="rounded-lg border border-amberline/25 bg-amberline/[0.07] p-4">
            <FieldLabel>Hermes Vision Caution</FieldLabel>
            <p className="mt-2 text-sm leading-6 text-amber-100">
              {visionCaution.message}
            </p>
          </section>
        ) : null}
        <HermesNotes notes={suggestions.notes} />
        <HermesVerdict verdict={suggestions.verdict} />

        {side === "Long" ? (
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              disabled={openingDisabled}
              icon={<ArrowUpFromLine className="size-4" aria-hidden="true" />}
              label="Execute Long"
              tone="mint"
              onClick={() => submit("Buy")}
            />
            <ActionButton
              disabled={closingDisabled}
              icon={<ArrowDownToLine className="size-4" aria-hidden="true" />}
              label="Close Long"
              tone="rose"
              onClick={() => submit("Sell")}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              disabled={openingDisabled}
              icon={<ArrowDownToLine className="size-4" aria-hidden="true" />}
              label="Execute Short"
              tone="amber"
              onClick={() => submit("Short")}
            />
            <ActionButton
              disabled={closingDisabled}
              icon={<ArrowUpFromLine className="size-4" aria-hidden="true" />}
              label="Cover Short"
              tone="slate"
              onClick={() => submit("Cover")}
            />
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-surface-950/50 p-3 text-xs leading-5 text-slate-400">
          <p>Buying power: {formatCurrency(buyingPower)}</p>
          <p className="mt-1">{message}</p>
        </div>
      </div>
    </Panel>
  );
}

function AssessmentGrid({ suggestions }: { suggestions: TradeTicketSuggestions }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Hermes Assessment</FieldLabel>
        <p className="text-xs text-slate-500">Rule-based paper planning</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AssessmentMetric label="Setup Quality" value={`${suggestions.setupQuality} / 100`} tone={getScoreTone(suggestions.setupQuality)} />
        <AssessmentMetric label="Confidence" value={`${suggestions.confidence}%`} tone={getScoreTone(suggestions.confidence)} />
        <AssessmentMetric label="Risk" value={suggestions.riskLevel} tone={getRiskTone(suggestions.riskLevel)} />
        <AssessmentMetric label="Bias" value={suggestions.bias} tone={getBiasTone(suggestions.bias)} />
      </div>
    </section>
  );
}

function AssessmentMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-sm font-bold ${tone}`}>
        {value}
      </p>
    </div>
  );
}

function Input({
  label,
  prefix,
  value,
  placeholder = "0.00",
  hint,
  onChange,
}: {
  label: string;
  prefix: string;
  value: string;
  placeholder?: string;
  hint?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-surface-950/55 px-3 transition focus-within:border-mint-300/40">
        <span className="text-slate-500">{prefix}</span>
        <input
          className="h-11 w-full bg-transparent px-2 text-sm font-semibold text-white outline-none placeholder:text-slate-600"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="number"
          value={value}
        />
      </div>
      {hint}
    </label>
  );
}

function SuggestionNote({
  value,
  confidence,
  explanation,
}: {
  value: string;
  confidence: number;
  explanation: string;
}) {
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">{value}</p>
        <p className={`text-xs font-bold ${getConfidenceColor(confidence)}`}>
          {confidence}% confidence
        </p>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{explanation}</p>
    </div>
  );
}

function RiskRewardCard({ riskReward }: { riskReward: number | null }) {
  const quality = getRiskRewardQuality(riskReward);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <FieldLabel>Risk / Reward</FieldLabel>
          <p className={`mt-3 text-[28px] font-semibold leading-none tracking-[-0.02em] ${getRiskRewardColor(riskReward)}`}>
            {riskReward ? `${riskReward.toFixed(2)} : 1` : "Needs plan"}
          </p>
        </div>
        <p className={`rounded-md px-2.5 py-1 text-xs font-bold ${quality.badgeTone}`}>
          {quality.label}
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        {quality.explanation}
      </p>
    </section>
  );
}

function HermesNotes({ notes }: { notes: string[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-surface-950/50 p-4">
      <FieldLabel>Hermes Notes</FieldLabel>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
        {notes.slice(0, 5).map((note) => (
          <li className="flex gap-2" key={note}>
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-300/80" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HermesVerdict({ verdict }: { verdict: TradeTicketSuggestions["verdict"] }) {
  return (
    <section className={`rounded-lg border p-4 ${getVerdictSurface(verdict.label)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <FieldLabel>Hermes Verdict</FieldLabel>
          <p className="mt-2 text-lg font-black text-white">{verdict.label}</p>
        </div>
        <p className={`rounded-md px-2 py-1 text-xs font-bold ${getConfidenceBadge(verdict.confidence)}`}>
          {verdict.confidence}%
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{verdict.explanation}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Hermes suggests. The trader decides.
      </p>
    </section>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  tone,
  onClick,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  tone: "mint" | "rose" | "amber" | "slate";
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-surface-950 transition disabled:cursor-not-allowed disabled:opacity-45 ${getActionTone(tone)}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </p>
  );
}

function getSuccessMessage(action: OrderAction) {
  if (action === "Buy") {
    return "Long paper position opened.";
  }

  if (action === "Sell") {
    return "Long paper position sold.";
  }

  if (action === "Short") {
    return "Short paper position opened.";
  }

  return "Short paper position covered.";
}

function calculateRiskReward({
  entry,
  side,
  stopLoss,
  takeProfit,
}: {
  entry: number;
  side: PositionSide;
  stopLoss: number;
  takeProfit: number;
}) {
  const risk = side === "Long" ? entry - stopLoss : stopLoss - entry;
  const reward = side === "Long" ? takeProfit - entry : entry - takeProfit;

  if (risk <= 0 || reward <= 0) {
    return null;
  }

  return reward / risk;
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatInputPrice(value: number) {
  return value >= 1000 ? value.toFixed(2) : value.toFixed(3);
}

function getScoreTone(score: number) {
  if (score >= 75) return "bg-mint-300/15 text-mint-200";
  if (score >= 50) return "bg-amberline/15 text-amberline";
  return "bg-rose-400/15 text-rose-300";
}

function getRiskTone(risk: TradeTicketSuggestions["riskLevel"]) {
  if (risk === "Low") return "bg-mint-300/15 text-mint-200";
  if (risk === "Medium") return "bg-amberline/15 text-amberline";
  return "bg-rose-400/15 text-rose-300";
}

function getBiasTone(bias: TradeTicketSuggestions["bias"]) {
  if (bias === "Bullish") return "bg-mint-300/15 text-mint-200";
  if (bias === "Neutral") return "bg-amberline/15 text-amberline";
  return "bg-rose-400/15 text-rose-300";
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 75) return "text-mint-300";
  if (confidence >= 58) return "text-amberline";
  return "text-rose-300";
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 75) return "bg-mint-300/15 text-mint-200";
  if (confidence >= 58) return "bg-amberline/15 text-amberline";
  return "bg-rose-400/15 text-rose-300";
}

function getRiskRewardColor(riskReward: number | null) {
  if (!riskReward) return "text-slate-500";
  if (riskReward >= 2) return "text-mint-300";
  if (riskReward >= 1) return "text-amberline";
  return "text-rose-300";
}

function getRiskRewardQuality(riskReward: number | null) {
  if (!riskReward) {
    return {
      label: "Average",
      badgeTone: "bg-slate-400/10 text-slate-300",
      explanation: "Complete the plan to evaluate risk quality.",
    };
  }

  if (riskReward >= 2.5) {
    return {
      label: "Excellent",
      badgeTone: "bg-mint-300/15 text-mint-200",
      explanation: "Excellent risk profile.",
    };
  }

  if (riskReward >= 2) {
    return {
      label: "Good",
      badgeTone: "bg-mint-300/15 text-mint-200",
      explanation: "Reward outweighs risk.",
    };
  }

  if (riskReward >= 1) {
    return {
      label: "Average",
      badgeTone: "bg-amberline/15 text-amberline",
      explanation: "Reward is close to risk.",
    };
  }

  return {
    label: "Poor",
    badgeTone: "bg-rose-400/15 text-rose-300",
    explanation: "Risk is greater than expected.",
  };
}

function getChangeColor(change: number) {
  if (change > 0) return "text-mint-300";
  if (change < 0) return "text-rose-300";
  return "text-slate-400";
}

function getVerdictSurface(label: TradeTicketSuggestions["verdict"]["label"]) {
  if (label === "Strong Setup") return "border-mint-300/20 bg-mint-300/[0.055]";
  if (label === "Caution") return "border-amberline/20 bg-amberline/[0.055]";
  return "border-rose-400/20 bg-rose-400/[0.055]";
}

function getActionTone(tone: "mint" | "rose" | "amber" | "slate") {
  if (tone === "mint") return "bg-mint-400 hover:bg-mint-300";
  if (tone === "rose") return "bg-rose-400 hover:bg-rose-300";
  if (tone === "amber") return "bg-amberline hover:brightness-110";
  return "bg-slate-200 hover:bg-white";
}
