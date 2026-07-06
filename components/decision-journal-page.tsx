"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionJournalCard } from "@/components/decision-journal/decision-journal-card";
import { DecisionJournalSummaryPanel } from "@/components/decision-journal/decision-journal-summary";
import { EmptyState, Panel, PanelHeader } from "@/components/ui";
import {
  buildDecisionJournal,
  filterDecisionJournalEntries,
  loadDecisionReflections,
  saveDecisionReflection,
} from "@/lib/decision-journal-engine";
import type {
  DecisionJournalFilter,
  DecisionReflection,
} from "@/lib/decision-journal-types";
import { getHermesMemory, type HermesMemorySnapshot } from "@/lib/hermes-memory";
import { triggerHermesCoach } from "@/lib/hermes-coach-trigger-system";
import { loadHermesState } from "@/lib/local-persistence";
import type { ClosedTrade } from "@/lib/paper-trading";
import { TopNav } from "./top-nav";

const filters: DecisionJournalFilter[] = [
  "All",
  "Wins",
  "Losses",
  "High Discipline",
  "Needs Review",
  "Followed Plan",
  "Broke Plan",
];

export function DecisionJournalPage() {
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [memory, setMemory] = useState<HermesMemorySnapshot | null>(null);
  const [reflections, setReflections] = useState<Record<string, DecisionReflection>>({});
  const [filter, setFilter] = useState<DecisionJournalFilter>("All");

  useEffect(() => {
    setHistory(loadHermesState()?.history ?? []);
    setMemory(getHermesMemory());
    setReflections(loadDecisionReflections());
  }, []);

  const journal = useMemo(
    () =>
      memory
        ? buildDecisionJournal({
            history,
            reflections,
            memory,
          })
        : null,
    [history, memory, reflections],
  );
  const visibleEntries = useMemo(
    () => (journal ? filterDecisionJournalEntries(journal.entries, filter) : []),
    [filter, journal],
  );

  const handleSaveReflection = (reflection: DecisionReflection) => {
    setReflections(saveDecisionReflection(reflection));
    triggerHermesCoach({
      moment: "reflection-saved",
      context: {
        journalEmotion: reflection.emotion,
        journalReason: reflection.reason,
        journalFollowedPlan: reflection.followedPlan,
        disciplineScore: memory?.scores.discipline,
      },
    });
  };

  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-7 shadow-insetPanel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
            Hermes Memory
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Decision Journal
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            A professional log of judgment quality: the plan, the decision,
            execution, replay learning, and the reflection that trains Trader DNA.
          </p>
        </section>

        {journal && history.length > 0 ? (
          <>
            <DecisionJournalSummaryPanel summary={journal.summary} />

            <section className="mt-5">
              <Panel>
                <PanelHeader
                  eyebrow="Journal Filters"
                  title="Review decisions by behavior"
                  action={<span className="text-xs text-slate-500">{visibleEntries.length} shown</span>}
                />
                <div className="flex flex-wrap gap-2 p-4">
                  {filters.map((item) => (
                    <button
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        filter === item
                          ? "border-mint-300/35 bg-mint-300/10 text-mint-200"
                          : "border-white/10 bg-white/[0.035] text-slate-400 hover:text-white"
                      }`}
                      key={item}
                      onClick={() => setFilter(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="mt-5 grid gap-4">
              {visibleEntries.map((entry) => (
                <DecisionJournalCard
                  entry={entry}
                  key={entry.tradeId}
                  onSaveReflection={handleSaveReflection}
                />
              ))}
            </section>
          </>
        ) : (
          <EmptyState
            title="No completed decisions yet"
            description="Close a paper trade from the dashboard. Hermes will turn it into a decision card for reflection and future Trader DNA learning."
          />
        )}
      </div>
    </main>
  );
}
