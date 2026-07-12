"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReplayChart } from "@/components/replay-mode/replay-chart";
import { ReplayReview } from "@/components/replay-mode/replay-review";
import { ReplaySummary } from "@/components/replay-mode/replay-summary";
import { ReplayTimeline } from "@/components/replay-mode/replay-timeline";
import {
  Button,
  EmptyState,
  PageHeader,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { getHermesMemory, type HermesMemorySnapshot } from "@/lib/hermes-memory";
import { loadHermesState } from "@/lib/local-persistence";
import { buildMorningBriefing } from "@/lib/morning-briefing";
import type { ClosedTrade } from "@/lib/paper-trading";
import { buildReplaySession } from "@/lib/replay-engine";
import { triggerHermesCoach } from "@/lib/hermes-coach-trigger-system";
import { TopNav } from "./top-nav";

export function ReplayModePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [memory, setMemory] = useState<HermesMemorySnapshot | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const announcedReplayRef = useRef<string | null>(null);

  useEffect(() => {
    const restored = loadHermesState();
    const trades = restored?.history ?? [];
    const requestedTradeId = searchParams.get("trade");
    setHistory(trades);
    setMemory(getHermesMemory());
    setSelectedTradeId(
      trades.some((trade) => trade.id === requestedTradeId)
        ? requestedTradeId
        : trades[0]?.id ?? null,
    );
  }, [searchParams]);

  const selectedTrade = useMemo(
    () => history.find((trade) => trade.id === selectedTradeId) ?? history[0],
    [history, selectedTradeId],
  );
  const session = useMemo(() => {
    if (!selectedTrade || !memory) {
      return null;
    }

    const briefing = buildMorningBriefing({ memory, history });
    return buildReplaySession(selectedTrade, briefing.intelligence);
  }, [history, memory, selectedTrade]);

  useEffect(() => {
    if (!session || announcedReplayRef.current === session.trade.id) return;

    announcedReplayRef.current = session.trade.id;
    // Learning Engine Phase 2.1: do NOT emit ReplayCompleted on first announcement.
    // Replay start / session build is not a reliable completion signal. The
    // replayToLearningEvent adapter remains available for future wiring when a
    // true completion state exists (finalized summary workflow).
    triggerHermesCoach({
      moment: "replay-finished",
      context: {
        tradeSymbol: session.trade.symbol,
        tradeOutcome: session.trade.pnl > 0 ? "Win" : session.trade.pnl < 0 ? "Loss" : "Closed",
        replayLesson: session.summary.lessonLearned,
        disciplineScore: memory?.scores.discipline,
      },
    });
  }, [memory?.scores.discipline, session]);

  return (
    <main>
      <TopNav />
      <PageShell>
        <PageHeader
          eyebrow="Film room"
          title="Replay Mode"
          description="Study completed paper trades — decision, risk, and lesson after the outcome."
        />

        {session ? (
          <>
            <Panel>
              <PanelHeader
                eyebrow="Trades"
                title="Choose a replay"
                action={<span className="text-xs text-slate-500">{history.length}</span>}
              />
              <div className="hermes-scroll flex gap-2 overflow-x-auto p-3 sm:p-4">
                {history.map((trade) => (
                  <button
                    className={`shrink-0 rounded-lg border px-3 py-2.5 text-left transition duration-200 ${
                      trade.id === session.trade.id
                        ? "border-amberline/35 bg-amberline/10 text-white"
                        : "border-white/10 bg-white/[0.035] text-slate-400 hover:text-white"
                    }`}
                    key={trade.id}
                    onClick={() => setSelectedTradeId(trade.id)}
                    type="button"
                  >
                    <p className="text-sm font-semibold">{trade.symbol}/USD</p>
                    <p
                      className={
                        trade.pnl >= 0
                          ? "mt-0.5 text-xs text-mint-300"
                          : "mt-0.5 text-xs text-rose-300"
                      }
                    >
                      {trade.side} · {trade.coach.grade}
                    </p>
                  </button>
                ))}
              </div>
            </Panel>

            <section className="grid gap-3 lg:grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:gap-4">
              <ReplayTimeline session={session} />
              <ReplayChart key={`${session.trade.id}-${replayKey}`} session={session} />
              <ReplayReview session={session} />
            </section>

            <ReplaySummary
              session={session}
              onReplayAgain={() => setReplayKey((key) => key + 1)}
              onReturn={() => router.push("/")}
            />
          </>
        ) : (
          <EmptyState
            title="No completed paper trades yet"
            description="Close a paper position from the dashboard, then return here for film-room review."
            action={
              <Button variant="primary" onClick={() => router.push("/")}>
                Open workspace
              </Button>
            }
          />
        )}
      </PageShell>
    </main>
  );
}
