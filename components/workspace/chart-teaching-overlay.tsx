"use client";

import { useState } from "react";
import type {
  ConfidenceHistoryEntry,
  MarketStoryEvent,
  SmartChartIntelligenceResult,
} from "@/lib/smart-chart-intelligence-types";
import type { SessionIntelligence } from "@/lib/session-intelligence";

type OverlayPanel = "story" | "confidence" | "session" | "opportunity" | null;

/**
 * Compact teaching overlay for the native chart panel only.
 * Not a new dashboard panel — progressive disclosure under the chart canvas.
 * Chips: Story | Session | Opportunity | Confidence history
 */
export function ChartTeachingOverlay({
  smartChart,
  sessionIntelligence,
}: {
  smartChart?: SmartChartIntelligenceResult | null;
  sessionIntelligence?: SessionIntelligence | null;
}) {
  const [open, setOpen] = useState<OverlayPanel>(null);

  const hasSmart =
    smartChart && smartChart.kind === "hermes-smart-chart-intelligence-v2";
  const hasSession =
    sessionIntelligence && sessionIntelligence.kind === "hermes-session-intelligence-v1";

  if (!hasSmart && !hasSession) return null;

  const chartStory = hasSmart ? smartChart!.marketStory.slice(0, 5) : [];
  const history = hasSmart ? smartChart!.confidenceHistory.slice(0, 5) : [];
  const sessionStory = hasSession ? sessionIntelligence!.sessionStory.slice(0, 10) : [];
  const storyCount = hasSession ? sessionStory.length : chartStory.length;

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5">
        <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mint-300/70">
          Chart teaching
        </p>

        {hasSession ? (
          <>
            <StatusChip
              label="Session"
              value={sessionIntelligence!.sessionPhase}
            />
            <StatusChip
              label="Health"
              value={sessionIntelligence!.marketHealth}
              tone={healthTone(sessionIntelligence!.marketHealth)}
            />
            <StatusChip
              label="Opportunity"
              value={shortOpportunity(sessionIntelligence!.opportunityState)}
              tone={opportunityTone(sessionIntelligence!.opportunityState)}
            />
          </>
        ) : null}

        <ToggleChip
          active={open === "story"}
          label={`Story ${storyCount}`}
          onClick={() => setOpen(open === "story" ? null : "story")}
        />
        {hasSession ? (
          <>
            <ToggleChip
              active={open === "session"}
              label="Session"
              onClick={() => setOpen(open === "session" ? null : "session")}
            />
            <ToggleChip
              active={open === "opportunity"}
              label="Opportunity"
              onClick={() => setOpen(open === "opportunity" ? null : "opportunity")}
            />
          </>
        ) : null}
        {hasSmart ? (
          <ToggleChip
            active={open === "confidence"}
            label={`Confidence history ${history.length}`}
            onClick={() => setOpen(open === "confidence" ? null : "confidence")}
          />
        ) : null}

        {hasSmart ? (
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            Δ {smartChart!.confidenceDelta >= 0 ? "+" : ""}
            {smartChart!.confidenceDelta}
          </span>
        ) : null}
      </div>

      {open === "story" ? (
        hasSession ? (
          <SessionStoryList events={sessionStory} />
        ) : (
          <ChartStoryList events={chartStory} />
        )
      ) : null}
      {open === "session" && hasSession ? (
        <SessionDetail session={sessionIntelligence!} />
      ) : null}
      {open === "opportunity" && hasSession ? (
        <OpportunityDetail session={sessionIntelligence!} />
      ) : null}
      {open === "confidence" && hasSmart ? <ConfidenceList entries={history} /> : null}

      {open === null ? (
        <p className="px-2.5 py-1.5 text-[11px] leading-4 text-slate-500">
          {hasSession
            ? sessionIntelligence!.sessionSummary
            : hasSmart
              ? smartChart!.thesisImpact
              : ""}
        </p>
      ) : null}
    </div>
  );
}

function StatusChip({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "mint" | "gold" | "danger" | "muted";
}) {
  const toneClass =
    tone === "mint"
      ? "border-mint-300/25 text-mint-100"
      : tone === "danger"
        ? "border-rose-300/25 text-rose-100"
        : tone === "gold"
          ? "border-amberline/25 text-amber-100"
          : "border-white/10 text-slate-300";
  return (
    <span
      className={`rounded-md border bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}
    >
      <span className="text-slate-500">{label}</span>{" "}
      <span className="tracking-tight">{value}</span>
    </span>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
        active
          ? "border-mint-300/35 bg-mint-300/12 text-mint-100"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SessionDetail({ session }: { session: SessionIntelligence }) {
  return (
    <div className="space-y-1.5 px-2.5 py-2">
      <Row label="Phase" value={session.sessionPhase} />
      <Row label="Bias" value={session.sessionBias} />
      <Row label="Health" value={session.marketHealth} />
      <Row label="Volatility" value={session.volatilityState} />
      <Row label="Liquidity" value={session.liquidityState} />
      <Row label="Momentum" value={session.momentumState} />
      <Row label="Participation" value={session.participationState} />
      {session.currentStrengths.length > 0 ? (
        <p className="text-[11px] leading-4 text-mint-100/90">
          Strengths: {session.currentStrengths.join(" · ")}
        </p>
      ) : null}
      {session.currentRisks.length > 0 ? (
        <p className="text-[11px] leading-4 text-rose-100/90">
          Risks: {session.currentRisks.join(" · ")}
        </p>
      ) : null}
      <p className="text-[10px] text-slate-600">
        Session read: {session.sessionClarityLabel} (not product Confidence)
      </p>
    </div>
  );
}

function OpportunityDetail({ session }: { session: SessionIntelligence }) {
  return (
    <div className="space-y-1.5 px-2.5 py-2">
      <Row label="State" value={session.opportunityState} />
      {session.opportunityWindows.map((window) => (
        <div
          className="rounded-md border border-white/8 bg-surface-950/50 px-2.5 py-1.5"
          key={`${window.kind}-${window.label}`}
        >
          <p className="text-[11px] font-semibold text-white">{window.label}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{window.rationale}</p>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
    </div>
  );
}

function SessionStoryList({ events }: { events: SessionIntelligence["sessionStory"] }) {
  if (events.length === 0) {
    return (
      <p className="px-2.5 py-2 text-[11px] text-slate-500">No session story events yet.</p>
    );
  }
  return (
    <ol className="max-h-44 space-y-1 overflow-y-auto px-2.5 py-2">
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-2 text-[11px] leading-4">
          <span className="w-10 shrink-0 font-mono text-slate-500">{event.clockLabel}</span>
          <div className="min-w-0">
            <p className="font-semibold text-white">{event.title}</p>
            <p className="text-slate-400">{event.detail}</p>
            {index < events.length - 1 ? (
              <p className="text-[10px] text-slate-600">↓</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChartStoryList({ events }: { events: MarketStoryEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-2.5 py-2 text-[11px] text-slate-500">No session story events yet.</p>
    );
  }
  return (
    <ol className="max-h-40 space-y-1.5 overflow-y-auto px-2.5 py-2">
      {events.map((event) => (
        <li
          className="rounded-md border border-white/8 bg-surface-950/50 px-2.5 py-1.5"
          key={event.id}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold text-white">
              <span className="mr-1.5 font-mono text-slate-500">{event.sequence}.</span>
              {event.title}
            </p>
            <span
              className={`shrink-0 font-mono text-[10px] ${
                event.confidenceDelta >= 0 ? "text-mint-300" : "text-rose-300"
              }`}
            >
              {event.confidenceDelta >= 0 ? "+" : ""}
              {event.confidenceDelta}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{event.whatHappened}</p>
        </li>
      ))}
    </ol>
  );
}

function ConfidenceList({ entries }: { entries: ConfidenceHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="px-2.5 py-2 text-[11px] text-slate-500">
        No major confidence teaching moves yet.
      </p>
    );
  }
  return (
    <ul className="max-h-40 space-y-1.5 overflow-y-auto px-2.5 py-2">
      {entries.map((entry) => (
        <li
          className="rounded-md border border-white/8 bg-surface-950/50 px-2.5 py-1.5"
          key={entry.id}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold text-white">{entry.causeLabel}</p>
            <span
              className={`shrink-0 font-mono text-[10px] ${
                entry.direction === "up"
                  ? "text-mint-300"
                  : entry.direction === "down"
                    ? "text-rose-300"
                    : "text-slate-400"
              }`}
            >
              {entry.confidenceDelta >= 0 ? "+" : ""}
              {entry.confidenceDelta}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{entry.reason}</p>
        </li>
      ))}
    </ul>
  );
}

function shortOpportunity(state: SessionIntelligence["opportunityState"]): string {
  if (state === "Excellent Opportunity") return "Excellent";
  return state;
}

function healthTone(
  health: SessionIntelligence["marketHealth"],
): "mint" | "gold" | "danger" | "muted" {
  if (health === "Excellent" || health === "Healthy") return "mint";
  if (health === "Mixed") return "gold";
  if (health === "Weak" || health === "Unstable") return "danger";
  return "muted";
}

function opportunityTone(
  state: SessionIntelligence["opportunityState"],
): "mint" | "gold" | "danger" | "muted" {
  if (state === "Excellent Opportunity" || state === "Developing") return "mint";
  if (state === "Waiting") return "gold";
  if (state === "Weak" || state === "Avoid") return "danger";
  return "muted";
}
