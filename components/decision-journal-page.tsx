"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionJournalCard } from "@/components/decision-journal/decision-journal-card";
import { DecisionJournalSummaryPanel } from "@/components/decision-journal/decision-journal-summary";
import {
  EmptyState,
  PageHeader,
  PageShell,
  Panel,
  PanelHeader,
  SegmentedControl,
} from "@/components/ui";
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
import {
  journalToLearningEvent,
  recordLearningEvent,
  reviewToLearningEvent,
} from "@/lib/learning-engine";
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
    const entry = journal?.entries.find((item) => item.tradeId === reflection.tradeId);
    const trade = history.find((item) => item.id === reflection.tradeId);
    // Learning Engine (silent): review + structured journal events only
    recordLearningEvent(
      reviewToLearningEvent({ reflection, entry, trade }),
    );
    recordLearningEvent(journalToLearningEvent(reflection));
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
      <PageShell>
        <PageHeader
          eyebrow="Memory"
          title="Decision Journal"
          description="Judgment quality: plan, decision, execution, and reflection that trains discipline."
        />

        {journal && history.length > 0 ? (
          <>
            <DecisionJournalSummaryPanel summary={journal.summary} />

            <Panel>
              <PanelHeader
                eyebrow="Filter"
                title="Review by behavior"
                action={<span className="text-xs text-slate-500">{visibleEntries.length}</span>}
              />
              <div className="p-3 sm:p-4">
                <SegmentedControl
                  className="w-full sm:w-auto"
                  options={filters.map((item) => ({ value: item, label: item }))}
                  value={filter}
                  onChange={setFilter}
                />
              </div>
            </Panel>

            <section className="grid gap-3">
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
            description="Close a paper trade from the workspace. Hermes will create a decision card for reflection."
          />
        )}
      </PageShell>
    </main>
  );
}
