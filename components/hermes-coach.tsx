import { GraduationCap } from "lucide-react";
import type { ClosedTrade } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function HermesCoach({ trade }: { trade?: ClosedTrade }) {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes Coach"
        title="Post-Trade Review"
        action={<GraduationCap className="size-5 text-mint-300" aria-hidden="true" />}
      />
      <div className="space-y-4 p-5">
        {trade ? (
          <>
            <div className="rounded-lg border border-mint-300/20 bg-mint-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mint-300">
                Trade Quality Score
              </p>
              <p className="mt-2 text-4xl font-semibold text-white">{trade.qualityScore}</p>
              <p className="mt-1 text-sm text-slate-400">out of 100</p>
            </div>
            <CoachRow label="Followed plan" value={trade.followedPlan ? "Yes" : "Needs work"} />
            <CoachRow label="Done well" value={trade.coach.doneWell} />
            <CoachRow label="Improve next" value={trade.coach.improvement} />
          </>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-400">
            Close a paper trade to receive a Hermes Coach review with a quality
            score and one practical improvement.
          </div>
        )}
      </div>
    </Panel>
  );
}

function CoachRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}
