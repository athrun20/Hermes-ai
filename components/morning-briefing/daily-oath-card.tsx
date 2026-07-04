"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { MorningBriefing } from "@/lib/morning-briefing";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";

export function DailyOathCard({ oath }: { oath: MorningBriefing["oath"] }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Panel>
      <PanelHeader eyebrow="Today's Oath" title="Commit Before the Market" />
      <div className="p-5">
        <p className="text-2xl font-semibold tracking-tight text-white">{oath.text}</p>
        <div className="mt-5">
          {accepted ? (
            <StatusPill tone="mint">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Today's Oath Accepted
            </StatusPill>
          ) : (
            <button
              className="rounded-lg border border-mint-300/25 bg-mint-300/10 px-4 py-3 text-sm font-semibold text-mint-200 transition hover:border-mint-300/45 hover:bg-mint-300/15"
              onClick={() => setAccepted(true)}
              type="button"
            >
              ✓ I Accept
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
