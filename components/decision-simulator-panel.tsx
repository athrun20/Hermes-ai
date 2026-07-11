"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Save } from "lucide-react";
import type {
  DecisionSimulationResult,
  TraderReason,
} from "@/lib/decision-simulator-types";
import type { CoinSymbol } from "@/lib/market-data";
import { formatCurrency } from "@/lib/market-data";
import { createSimulationSnapshot, saveSimulationSnapshot } from "@/lib/simulation-snapshot-service";
import { ProgressBar, StatusPill } from "@/components/ui";

const traderReasons: TraderReason[] = [
  "Breakout",
  "Pullback",
  "Trend continuation",
  "Reversal",
  "Momentum",
  "Mean reversion",
  "News catalyst",
  "Support or resistance reaction",
  "Other",
];

export function DecisionSimulatorPanel({
  simulation,
  hasCompletedSimulation,
  traderReason,
  symbol,
  timeframe,
  onTraderReasonChange,
  onSimulate,
}: {
  simulation: DecisionSimulationResult;
  hasCompletedSimulation: boolean;
  traderReason: TraderReason;
  symbol: CoinSymbol;
  timeframe: string;
  onTraderReasonChange: (reason: TraderReason) => void;
  onSimulate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const canSimulate = simulation.state === "Simulation complete" || simulation.state === "Ready to simulate";
  const displaySimulation = hasCompletedSimulation ? simulation : null;
  const visibleState =
    displaySimulation?.state ?? (simulation.state === "Simulation complete" ? "Ready to simulate" : simulation.state);

  const saveSnapshot = () => {
    if (!displaySimulation || !displaySimulation.summary) return;
    saveSimulationSnapshot(
      createSimulationSnapshot({
        simulation: displaySimulation,
        symbol,
        timeframe,
      }),
    );
    setSaveMessage("Simulation saved locally for Journal and Replay review.");
  };

  return (
    <section className="rounded-lg border border-white/10 bg-surface-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amberline/80">
            Decision Simulator
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">
            Model outcomes before practicing the trade.
          </h3>
        </div>
        <StatusPill tone={getStateTone(visibleState)}>
          {visibleState}
        </StatusPill>
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Why are you considering this trade?
        </span>
        <select
          className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-amberline/35"
          value={traderReason}
          onChange={(event) => onTraderReasonChange(event.target.value as TraderReason)}
        >
          {traderReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </label>

      {simulation.missingRequirements.length > 0 && !displaySimulation ? (
        <div className="mt-3 rounded-lg border border-amberline/20 bg-amberline/[0.07] p-3 text-xs leading-5 text-amber-100">
          <p className="font-semibold text-amberline">Required before simulation</p>
          <p className="mt-1">{simulation.missingRequirements.join(", ")}</p>
        </div>
      ) : null}

      {simulation.validationErrors.length > 0 && !displaySimulation ? (
        <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-100">
          <p className="font-semibold text-rose-300">Plan needs revision</p>
          <p className="mt-1">{simulation.validationErrors.join(" ")}</p>
        </div>
      ) : null}

      <button
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amberline/15 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!canSimulate}
        onClick={onSimulate}
        type="button"
      >
        <BrainCircuit className="size-4" />
        Simulate Trade
      </button>

      {displaySimulation ? (
        <div className="mt-4 space-y-4">
          {displaySimulation.stale ? (
            <div className="rounded-lg border border-amberline/20 bg-amberline/[0.07] p-3 text-xs leading-5 text-amber-100">
              Simulation is stale because {displaySimulation.staleReasons.join(", ")} changed.
            </div>
          ) : null}

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Decision
                </p>
                <p className="mt-1 text-base font-semibold text-white">{displaySimulation.decision.state}</p>
              </div>
              <StatusPill tone={getDecisionTone(displaySimulation.decision.state)}>
                {displaySimulation.summary?.tradeQuality ?? 0} quality
              </StatusPill>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {displaySimulation.decision.conclusion}
            </p>
          </div>

          <ScenarioRows simulation={displaySimulation} />

          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Risk" value={displaySimulation.riskImpact ? formatCurrency(displaySimulation.riskImpact.dollarRisk) : "N/A"} />
            <MiniStat label="Portfolio Risk" value={displaySimulation.riskImpact ? `${displaySimulation.riskImpact.portfolioRiskPct.toFixed(2)}%` : "N/A"} />
            <MiniStat label="R/R" value={displaySimulation.riskImpact?.riskReward ? `${displaySimulation.riskImpact.riskReward.toFixed(2)}R` : "N/A"} />
            <MiniStat label="Trader Fit" value={displaySimulation.traderReasonAlignment.status} />
          </div>

          <button
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 transition hover:text-white"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            Why Hermes reached this conclusion
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {expanded ? <ExpandedSimulation simulation={displaySimulation} /> : null}

          <div className="flex items-center gap-2">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
              onClick={saveSnapshot}
              type="button"
            >
              <Save className="size-3.5" />
              Save Simulation
            </button>
          </div>
          {saveMessage ? <p className="text-xs leading-5 text-mint-300">{saveMessage}</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Hermes will model favorable, neutral, and adverse paths using current rule-based evidence. No outcome is guaranteed.
        </p>
      )}
    </section>
  );
}

function ScenarioRows({ simulation }: { simulation: DecisionSimulationResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Scenario probabilities
        </p>
        <p className="text-[10px] text-slate-500">Modeled estimates</p>
      </div>
      {simulation.scenarios.map((scenario) => (
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3" key={scenario.id}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">{scenario.title}</p>
            <span className={scenario.id === "favorable" ? "text-sm font-bold text-mint-300" : scenario.id === "adverse" ? "text-sm font-bold text-rose-300" : "text-sm font-bold text-amberline"}>
              {scenario.probability}%
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={scenario.probability}
              tone={scenario.id === "favorable" ? "mint" : scenario.id === "adverse" ? "danger" : "gold"}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">{scenario.narrative}</p>
        </div>
      ))}
      <p className="text-[11px] leading-5 text-slate-500">{simulation.probabilityNote}</p>
    </div>
  );
}

function ExpandedSimulation({ simulation }: { simulation: DecisionSimulationResult }) {
  return (
    <div className="space-y-3">
      <DetailBlock title="Primary blocker">{simulation.primaryBlocker}</DetailBlock>
      <DetailBlock title="Confirmation needed">{simulation.decision.confirmationNeeded}</DetailBlock>
      <DetailBlock title="Invalidation">{simulation.decision.invalidationCondition}</DetailBlock>
      <DetailBlock title="Reason alignment">{simulation.traderReasonAlignment.explanation}</DetailBlock>
      {simulation.adjustmentCoaching ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Adjustment coaching
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400">
            <li>Entry: {simulation.adjustmentCoaching.entry}</li>
            <li>Stop: {simulation.adjustmentCoaching.stop}</li>
            <li>Target: {simulation.adjustmentCoaching.target}</li>
            <li>Size: {simulation.adjustmentCoaching.size}</li>
          </ul>
        </div>
      ) : null}
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Pre-trade checklist
        </p>
        <div className="mt-2 space-y-2">
          {simulation.checklist.map((item) => (
            <div className="flex items-start justify-between gap-3 text-xs leading-5" key={item.id}>
              <span className="text-slate-300">{item.label}</span>
              <span className={getChecklistColor(item.state)}>{item.state}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Why Hermes says this
        </p>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400">
          {simulation.whyHermesReachedThis.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <DetailBlock title="Expected value">
        {simulation.expectedValue.available && simulation.expectedValue.valueR !== null
          ? `${simulation.expectedValue.valueR.toFixed(2)}R modeled estimate. ${simulation.expectedValue.reason}`
          : simulation.expectedValue.reason}
      </DetailBlock>
      <DetailBlock title="Historical comparison">{simulation.historicalComparison.note}</DetailBlock>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 text-xs leading-5 text-slate-400">{children}</div>
    </div>
  );
}

function getChecklistColor(state: string) {
  if (state === "Passed") return "font-semibold text-mint-300";
  if (state === "Warning") return "font-semibold text-amberline";
  if (state === "Failed") return "font-semibold text-rose-300";
  return "font-semibold text-slate-500";
}

function getStateTone(state: DecisionSimulationResult["state"]) {
  if (state === "Simulation complete" || state === "Ready to simulate") return "mint";
  if (state === "Stale simulation" || state === "Incomplete trade plan") return "gold";
  if (state === "Invalid trade plan" || state === "Market data unavailable") return "danger";
  return "muted";
}

function getDecisionTone(state: string) {
  if (state === "High-Quality Setup") return "mint";
  if (state === "Ready With Caution" || state === "Wait for Confirmation") return "gold";
  if (state === "Avoid" || state === "Not Ready") return "danger";
  return "muted";
}
