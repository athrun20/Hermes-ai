"use client";

import { useState } from "react";
import type {
  ConfidenceHistoryEntry,
  MarketStoryEvent,
  SmartChartIntelligenceResult,
} from "@/lib/smart-chart-intelligence-types";

/**
 * Compact teaching overlay for the native chart panel only.
 * Not a new dashboard panel — progressive disclosure under the chart canvas.
 */
export function ChartTeachingOverlay({
  smartChart,
}: {
  smartChart?: SmartChartIntelligenceResult | null;
}) {
  const [open, setOpen] = useState<"story" | "confidence" | null>(null);

  if (!smartChart || smartChart.kind !== "hermes-smart-chart-intelligence-v2") {
    return null;
  }

  const story = smartChart.marketStory.slice(0, 5);
  const history = smartChart.confidenceHistory.slice(0, 5);
  if (story.length === 0 && history.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5">
        <p className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mint-300/70">
          Chart teaching
        </p>
        <ToggleChip
          active={open === "story"}
          label={`Story ${story.length}`}
          onClick={() => setOpen(open === "story" ? null : "story")}
        />
        <ToggleChip
          active={open === "confidence"}
          label={`Confidence history ${history.length}`}
          onClick={() => setOpen(open === "confidence" ? null : "confidence")}
        />
        <span className="ml-auto font-mono text-[10px] text-slate-500">
          Δ {smartChart.confidenceDelta >= 0 ? "+" : ""}
          {smartChart.confidenceDelta}
        </span>
      </div>

      {open === "story" ? <StoryList events={story} /> : null}
      {open === "confidence" ? <ConfidenceList entries={history} /> : null}

      {open === null ? (
        <p className="px-2.5 py-1.5 text-[11px] leading-4 text-slate-500">
          {smartChart.thesisImpact}
        </p>
      ) : null}
    </div>
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

function StoryList({ events }: { events: MarketStoryEvent[] }) {
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
