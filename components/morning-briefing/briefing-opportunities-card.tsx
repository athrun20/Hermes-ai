import { BookOpenCheck, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import type { MorningBriefing } from "@/lib/morning-briefing";
import { ConfidenceBadge, Panel, PanelHeader, StatusPill } from "@/components/ui";

export function BriefingOpportunitiesCard({
  opportunities,
}: {
  opportunities: MorningBriefing["opportunities"];
}) {
  return (
    <Panel>
      <PanelHeader eyebrow="Opportunity Scanner" title="Today's Opportunities" />
      <div className="grid gap-4 p-5 xl:grid-cols-3">
        {opportunities.map((opportunity) => (
          <article
            className="rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.055]"
            key={opportunity.ticker}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-white">{opportunity.ticker}</p>
                <p className="mt-1 text-xs text-slate-500">{opportunity.setupType}</p>
              </div>
              <ConfidenceBadge confidence={opportunity.confidence} />
            </div>
            <div className="mt-4 space-y-2">
              <StatusPill tone={verdictTone(opportunity.hermesVerdict)}>
                {opportunity.hermesVerdict}
              </StatusPill>
              <StatusPill tone={matchTone(opportunity.traderDnaMatch)}>
                {opportunity.traderDnaMatch}
              </StatusPill>
            </div>
            <div className="mt-4 grid gap-2">
              <ActionButton icon={<BookOpenCheck className="size-4" aria-hidden="true" />}>
                Study Setup
              </ActionButton>
              <ActionButton icon={<ClipboardList className="size-4" aria-hidden="true" />}>
                Create Trade Plan
              </ActionButton>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function ActionButton({
  children,
  icon,
}: {
  children: string;
  icon: ReactNode;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-mint-300/30 hover:bg-mint-300/10 hover:text-white"
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function verdictTone(verdict: MorningBriefing["opportunities"][number]["hermesVerdict"]) {
  if (verdict === "Excellent Practice Setup" || verdict === "Worth Studying") return "mint";
  if (verdict === "Not Beginner Friendly" || verdict === "Observe Only") return "danger";
  return "gold";
}

function matchTone(match: MorningBriefing["opportunities"][number]["traderDnaMatch"]) {
  if (match === "Excellent Match") return "mint";
  if (match === "Poor Match") return "danger";
  return "gold";
}
