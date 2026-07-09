import { Newspaper } from "lucide-react";
import { Panel, StatusPill } from "@/components/ui";
import type { NewsIntelligenceItem, NewsIntelligenceResult, NewsKeywordMatch } from "@/lib/news-types";
import { buildSmartMarketEvents, type SmartMarketEvent } from "@/lib/hermes-mentor-intelligence";

export function NewsIntelligencePanel({
  intelligence,
  onCreateKeywordAlert,
}: {
  intelligence: NewsIntelligenceResult;
  onCreateKeywordAlert?: (keyword: string) => void;
}) {
  const smartEvents = buildSmartMarketEvents(intelligence);

  return (
    <Panel className="overflow-hidden bg-surface-950/60 shadow-xl shadow-black/15">
      <div className="border-b border-white/10 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
              News Intelligence
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
              {intelligence.symbol} Catalyst Read
            </h2>
          </div>
          <Newspaper className="size-5 text-amberline" aria-hidden="true" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone={sentimentTone(intelligence.sentiment)}>
            {intelligence.sentiment}
          </StatusPill>
          <StatusPill tone={urgencyTone(intelligence.urgency)}>
            {intelligence.urgency} urgency
          </StatusPill>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Detected Keywords
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {intelligence.detectedKeywords.length > 0 ? (
              intelligence.detectedKeywords.map((match) => (
                <KeywordPill
                  key={`${match.keyword}-${match.tone}`}
                  match={match}
                  onClick={
                    onCreateKeywordAlert
                      ? () => onCreateKeywordAlert(match.keyword)
                      : undefined
                  }
                />
              ))
            ) : (
              <span className="text-xs text-slate-500">No major catalyst keywords detected.</span>
            )}
          </div>
        </div>
        <InsightBlock title="Possible Market Impact">
          {intelligence.possibleMarketImpact}
        </InsightBlock>
        <InsightBlock title="Hermes Interpretation">
          {intelligence.hermesInterpretation}
        </InsightBlock>
        <SmartEventsList events={smartEvents} />
        <NewsList title="Latest Press Releases" items={intelligence.pressReleases} />
        <NewsList title="Latest News" items={intelligence.news} />
      </div>
    </Panel>
  );
}

function SmartEventsList({ events }: { events: SmartMarketEvent[] }) {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Smart Market Events
      </p>
      <div className="mt-2 space-y-2">
        {events.slice(0, 3).map((event) => (
          <article className="rounded-lg border border-white/10 bg-white/[0.03] p-3" key={event.id}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={urgencyTone(event.urgency)}>{event.eventType}</StatusPill>
              <StatusPill tone={sentimentTone(event.sentiment)}>{event.sentiment}</StatusPill>
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-white">{event.headline}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{event.summary}</p>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">{event.impact}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewsList({ title, items }: { title: string; items: NewsIntelligenceItem[] }) {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <article className="rounded-lg border border-white/10 bg-white/[0.03] p-3" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-white">{item.headline}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {item.source} | {formatNewsTime(item.publishedAt)}
                </p>
              </div>
              <StatusPill tone={urgencyTone(item.urgency)}>{item.urgency}</StatusPill>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{item.summary}</p>
            {item.matches.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.matches.map((match) => (
                  <KeywordPill key={`${item.id}-${match.keyword}`} match={match} />
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function KeywordPill({
  match,
  onClick,
}: {
  match: NewsKeywordMatch;
  onClick?: () => void;
}) {
  const classes =
    match.tone === "positive"
      ? "border-mint-300/20 bg-mint-300/10 text-mint-200"
      : match.tone === "risk"
        ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
        : "border-amberline/20 bg-amberline/10 text-amber-100";

  if (onClick) {
    return (
      <button
        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition hover:bg-white/[0.06] ${classes}`}
        onClick={onClick}
        title="Create keyword alert"
        type="button"
      >
        {match.keyword}
      </button>
    );
  }

  return <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${classes}`}>{match.keyword}</span>;
}

function InsightBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{children}</p>
    </div>
  );
}

function sentimentTone(sentiment: NewsIntelligenceResult["sentiment"]) {
  if (sentiment === "Positive") return "mint";
  if (sentiment === "Negative") return "danger";
  return "muted";
}

function urgencyTone(urgency: NewsIntelligenceResult["urgency"]) {
  if (urgency === "High") return "danger";
  if (urgency === "Medium") return "gold";
  return "muted";
}

function formatNewsTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
