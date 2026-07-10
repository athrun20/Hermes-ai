"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { InsightCard, ProgressBar, StatusPill } from "@/components/ui";
import type { ReasoningEvidence, ReasoningResult } from "@/lib/reasoning-types";

export function HermesReasoningPanel({ reasoning }: { reasoning: ReasoningResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/80">
            Hermes Reasoning
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{reasoning.marketContext}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{reasoning.reasoningSummary}</p>
        </div>
        <StatusPill tone={actionTone(reasoning.recommendedAction)}>
          {reasoning.recommendedAction}
        </StatusPill>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <ReasoningScore
          label="Confidence"
          score={reasoning.confidenceScore}
          detail={reasoning.confidenceDrivers[0] ?? "Evidence weighted"}
          onClick={() => setExpanded(expanded === "confidence" ? null : "confidence")}
        />
        <ReasoningScore
          label="Readiness"
          score={reasoning.tradeReadinessScore}
          detail={reasoning.readinessState}
          onClick={() => setExpanded(expanded === "readiness" ? null : "readiness")}
        />
      </div>

      {expanded === "confidence" ? <ConfidenceExplanation reasoning={reasoning} /> : null}
      {expanded === "readiness" ? <ReadinessExplanation reasoning={reasoning} /> : null}

      <ExpandableSection
        id="evidence"
        expanded={expanded}
        title="Evidence"
        onToggle={setExpanded}
      >
        <EvidenceList title="Supporting Evidence" evidence={reasoning.supportingEvidence} tone="mint" />
        <EvidenceList title="Contradicting Evidence" evidence={reasoning.conflictingEvidence} tone="danger" />
      </ExpandableSection>

      <ExpandableSection
        id="cases"
        expanded={expanded}
        title="Bull / Bear Case"
        onToggle={setExpanded}
      >
        <div className="grid gap-3">
          <ScenarioCard title="Bull Case" probability={reasoning.bullCase.estimatedProbability} thesis={reasoning.bullCase.thesis} trigger={reasoning.bullCase.trigger} invalidation={reasoning.bullCase.invalidation} />
          <ScenarioCard title="Bear Case" probability={reasoning.bearCase.estimatedProbability} thesis={reasoning.bearCase.thesis} trigger={reasoning.bearCase.trigger} invalidation={reasoning.bearCase.invalidation} />
        </div>
      </ExpandableSection>

      <ExpandableSection
        id="conditions"
        expanded={expanded}
        title="Confirmation / Invalidation"
        onToggle={setExpanded}
      >
        <ConditionList title="Confirmation Needed" items={reasoning.confirmationConditions} tone="mint" />
        <ConditionList title="Thesis Invalidation" items={reasoning.invalidationConditions} tone="danger" />
      </ExpandableSection>

      <InsightCard title="Hermes Coaching" tone="gold" className="mt-3">
        {reasoning.coachingMessage}
      </InsightCard>
    </section>
  );
}

function ReasoningScore({
  label,
  score,
  detail,
  onClick,
}: {
  label: string;
  score: number;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-white/10 bg-surface-950/45 p-3 text-left transition hover:border-white/20"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-xs leading-4 text-slate-500">{detail}</p>
        </div>
        <p className={score >= 75 ? "font-mono text-lg font-semibold text-mint-300" : score >= 55 ? "font-mono text-lg font-semibold text-amberline" : "font-mono text-lg font-semibold text-rose-300"}>
          {score}
        </p>
      </div>
      <div className="mt-3">
        <ProgressBar value={score} tone={score >= 75 ? "mint" : score >= 55 ? "gold" : "danger"} />
      </div>
    </button>
  );
}

function ConfidenceExplanation({ reasoning }: { reasoning: ReasoningResult }) {
  const explanation = reasoning.confidenceExplanation;
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-surface-950/45 p-3 text-xs leading-5 text-slate-400">
      <p><span className="font-semibold text-slate-200">Base confidence:</span> {explanation.baseConfidence}</p>
      <p><span className="font-semibold text-mint-200">Positive:</span> {formatContribution(explanation.positiveContributors)}</p>
      <p><span className="font-semibold text-rose-200">Negative:</span> {formatContribution(explanation.negativeContributors)}</p>
      <p><span className="font-semibold text-slate-200">Data quality:</span> {signed(explanation.dataQualityAdjustment)}</p>
      <p><span className="font-semibold text-slate-200">Trader DNA:</span> {signed(explanation.traderDnaAdjustment)}</p>
      <p><span className="font-semibold text-white">Final confidence:</span> {explanation.finalConfidence}</p>
    </div>
  );
}

function ReadinessExplanation({ reasoning }: { reasoning: ReasoningResult }) {
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-surface-950/45 p-3">
      <p className="text-xs font-semibold text-white">{reasoning.readinessState}</p>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400">
        {reasoning.readinessBlockers.length === 0 ? (
          <li>No major blockers. Validate the plan before paper execution.</li>
        ) : (
          reasoning.readinessBlockers.map((item) => <li key={item}>{item}</li>)
        )}
      </ul>
    </div>
  );
}

function ExpandableSection({
  id,
  title,
  expanded,
  children,
  onToggle,
}: {
  id: string;
  title: string;
  expanded: string | null;
  children: ReactNode;
  onToggle: (id: string | null) => void;
}) {
  const isOpen = expanded === id;
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025]">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={() => onToggle(isOpen ? null : id)}
        type="button"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        <ChevronDown className={`size-4 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? <div className="space-y-3 border-t border-white/10 p-3">{children}</div> : null}
    </div>
  );
}

function EvidenceList({
  title,
  evidence,
  tone,
}: {
  title: string;
  evidence: ReasoningEvidence[];
  tone: "mint" | "danger";
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {evidence.slice(0, 4).map((item) => (
          <div className="rounded-md border border-white/10 bg-surface-950/45 px-3 py-2" key={item.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white">{item.label}</p>
              <span className={tone === "mint" ? "font-mono text-[11px] text-mint-300" : "font-mono text-[11px] text-rose-300"}>
                {signed(item.confidenceContribution)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  probability,
  thesis,
  trigger,
  invalidation,
}: {
  title: string;
  probability: number;
  thesis: string;
  trigger: string;
  invalidation: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface-950/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-white">{title}</p>
        <StatusPill tone={title.startsWith("Bull") ? "mint" : "danger"}>{probability}%</StatusPill>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{thesis}</p>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">Trigger: {trigger}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">Invalidation: {invalidation}</p>
    </div>
  );
}

function ConditionList({ title, items, tone }: { title: string; items: string[]; tone: "mint" | "danger" }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className={`mt-2 size-1.5 shrink-0 rounded-full ${tone === "mint" ? "bg-mint-300" : "bg-rose-300"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function actionTone(action: ReasoningResult["recommendedAction"]) {
  if (action === "Validate" || action === "Prepare") return "mint";
  if (action === "Avoid") return "danger";
  return "gold";
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatContribution(items: ReasoningEvidence[]) {
  if (items.length === 0) return "None";
  return items
    .slice(0, 3)
    .map((item) => `${signed(item.confidenceContribution)} ${item.label}`)
    .join("; ");
}
