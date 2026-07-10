"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ClipboardCheck,
  GitBranch,
  Landmark,
  Newspaper,
  ShieldAlert,
  TrendingUp,
  UserRound,
  Waves,
} from "lucide-react";
import type { HermesLiveIntelligence } from "@/lib/hermes-live-engine";
import {
  LIVE_TIMELINE_MIN_INTERVAL_MS,
  type LiveTimelineCategory,
  type LiveTimelineEvent,
  type LiveTimelineTone,
} from "@/lib/timeline-events";
import { StatusPill } from "@/components/ui";

export function HermesLiveTimelinePanel({
  intelligence,
}: {
  intelligence: HermesLiveIntelligence;
}) {
  const [expanded, setExpanded] = useState(true);
  const [feed, setFeed] = useState<LiveTimelineEvent[]>(() => intelligence.events.slice(0, 3));
  const lastPublishedAt = useRef(Date.now());

  useEffect(() => {
    const next = intelligence.events.find(
      (event) => !feed.some((existing) => existing.signature === event.signature),
    );
    if (!next) return;

    const now = Date.now();
    if (feed.length > 0 && now - lastPublishedAt.current < LIVE_TIMELINE_MIN_INTERVAL_MS) return;

    lastPublishedAt.current = now;
    setFeed((current) => [next, ...current].slice(0, 8));
  }, [feed, intelligence.events]);

  return (
    <div className="rounded-xl border border-white/10 bg-surface-950/40 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/80">
            Hermes Live Timeline
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {intelligence.mentorMessage}
          </p>
        </div>
        <button
          className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:text-white"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Confidence
          </p>
          <StatusPill tone={intelligence.confidence.score >= 75 ? "mint" : intelligence.confidence.score >= 58 ? "gold" : "danger"}>
            {intelligence.confidence.score}%
          </StatusPill>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amberline transition-all duration-700 ease-out"
            style={{ width: `${intelligence.confidence.score}%` }}
          />
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2.5">
          {feed.map((item) => (
            <TimelineRow item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TimelineRow({ item }: { item: LiveTimelineEvent }) {
  return (
    <article className="translate-y-0 rounded-lg border border-white/10 bg-white/[0.025] p-3 opacity-100 transition duration-500 ease-out hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-start gap-3">
        <div className={`grid size-8 shrink-0 place-items-center rounded-lg border ${toneSurface(item.tone)}`}>
          {categoryIcon(item.category)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-white">{item.title}</p>
            <span className="font-mono text-[10px] text-slate-600">{item.time}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">{item.explanation}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill tone={item.tone}>{item.category}</StatusPill>
            <span className={item.confidenceChange >= 0 ? "text-[11px] font-semibold text-mint-300" : "text-[11px] font-semibold text-rose-300"}>
              Confidence {item.confidenceChange >= 0 ? "+" : ""}{item.confidenceChange}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {item.confidenceBefore}% to {item.confidenceAfter}%
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function categoryIcon(category: LiveTimelineCategory): ReactNode {
  const className = "size-4";
  if (category === "Trend") return <TrendingUp className={className} aria-hidden="true" />;
  if (category === "Momentum") return <Activity className={className} aria-hidden="true" />;
  if (category === "Volume") return <Waves className={className} aria-hidden="true" />;
  if (category === "Risk") return <ShieldAlert className={className} aria-hidden="true" />;
  if (category === "News") return <Newspaper className={className} aria-hidden="true" />;
  if (category === "Structure") return <GitBranch className={className} aria-hidden="true" />;
  if (category === "Trader Behavior") return <UserRound className={className} aria-hidden="true" />;
  if (category === "Footprint") return <Landmark className={className} aria-hidden="true" />;
  return <ClipboardCheck className={className} aria-hidden="true" />;
}

function toneSurface(tone: LiveTimelineTone) {
  if (tone === "mint") return "border-mint-300/20 bg-mint-300/10 text-mint-200";
  if (tone === "gold") return "border-amberline/20 bg-amberline/10 text-amber-100";
  if (tone === "danger") return "border-rose-300/20 bg-rose-400/10 text-rose-200";
  return "border-white/10 bg-white/[0.035] text-slate-300";
}
