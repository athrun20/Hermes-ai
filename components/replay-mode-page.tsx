"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReplayChart } from "@/components/replay-mode/replay-chart";
import { ReplayReview } from "@/components/replay-mode/replay-review";
import { ReplaySummary } from "@/components/replay-mode/replay-summary";
import { ReplayTimeline } from "@/components/replay-mode/replay-timeline";
import { EmptyState, Panel, PanelHeader } from "@/components/ui";
import { getHermesMemory, type HermesMemorySnapshot } from "@/lib/hermes-memory";
import { loadHermesState } from "@/lib/local-persistence";
import { buildMorningBriefing } from "@/lib/morning-briefing";
import type { ClosedTrade } from "@/lib/paper-trading";
import { buildReplaySession } from "@/lib/replay-engine";
import { TopNav } from "./top-nav";

export function ReplayModePage() {
  const router = useRouter();
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [memory, setMemory] = useState<HermesMemorySnapshot | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const restored = loadHermesState();
    const trades = restored?.history ?? [];
    setHistory(trades);
    setMemory(getHermesMemory());
    setSelectedTradeId(trades[0]?.id ?? null);
  }, []);

  const selectedTrade = useMemo(
    () => history.find((trade) => trade.id === selectedTradeId) ?? history[0],
    [history, selectedTradeId],
  );
  const session = useMemo(
    () => {
      if (!selectedTrade || !memory) {
        return null;
      }

      const briefing = buildMorningBriefing({ memory, history });
      return buildReplaySession(selectedTrade, briefing.intelligence);
    },
    [history, memory, selectedTrade],
  );

  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-7 shadow-insetPanel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
            Film Room
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Replay Mode
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Hermes reconstructs completed paper trades so you can study the
            decision, the risk, and the lesson after the outcome is known.
          </p>
        </section>

        {session ? (
          <>
            <section className="mb-5">
              <Panel>
                <PanelHeader
                  eyebrow="Completed Trades"
                  title="Choose a replay"
                  action={<span className="text-xs text-slate-500">{history.length} available</span>}
                />
                <div className="flex gap-2 overflow-x-auto p-4">
                  {history.map((trade) => (
                    <button
                      className={`shrink-0 rounded-lg border px-4 py-3 text-left transition ${
                        trade.id === session.trade.id
                          ? "border-amberline/35 bg-amberline/10 text-white"
                          : "border-white/10 bg-white/[0.035] text-slate-400 hover:text-white"
                      }`}
                      key={trade.id}
                      onClick={() => setSelectedTradeId(trade.id)}
                      type="button"
                    >
                      <p className="text-sm font-semibold">{trade.symbol}/USD</p>
                      <p className={trade.pnl >= 0 ? "mt-1 text-xs text-mint-300" : "mt-1 text-xs text-rose-300"}>
                        {trade.side} · {trade.coach.grade}
                      </p>
                    </button>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="grid gap-4 xl:grid-cols-[320px_1fr_360px] xl:gap-5">
              <ReplayTimeline session={session} />
              <ReplayChart key={`${session.trade.id}-${replayKey}`} session={session} />
              <ReplayReview session={session} />
            </section>

            <section className="mt-5">
              <ReplaySummary
                session={session}
                onReplayAgain={() => setReplayKey((key) => key + 1)}
                onReturn={() => router.push("/")}
              />
            </section>
          </>
        ) : (
          <EmptyState
            title="No completed paper trades yet"
            description="Close a paper position from the dashboard, then return to Replay Mode to study the trade like film review."
            action={
              <button
                className="rounded-lg bg-mint-400 px-4 py-3 text-sm font-bold text-surface-950 transition hover:bg-mint-300"
                onClick={() => router.push("/")}
                type="button"
              >
                Return to Dashboard
              </button>
            }
          />
        )}
      </div>
    </main>
  );
}
