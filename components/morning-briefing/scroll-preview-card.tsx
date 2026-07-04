"use client";

import { useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { LivingScrollModal, type LivingScroll } from "@/components/living-scroll-modal";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";

export function ScrollPreviewCard({ scroll }: { scroll: LivingScroll }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Panel>
        <PanelHeader
          eyebrow="Living Scroll"
          title="Today's Lesson"
          action={<BookOpenCheck className="size-5 text-amberline" aria-hidden="true" />}
        />
        <div className="space-y-4 p-5">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-white">{scroll.title}</p>
            <p className="mt-3 border-l-2 border-amberline/40 pl-4 text-sm leading-6 text-slate-300">
              {scroll.quote}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Today's Challenge
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{scroll.challenge}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <StatusPill tone="gold">+{scroll.wisdomPoints} Wisdom</StatusPill>
            <button
              className="rounded-lg border border-amberline/25 bg-amberline/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amberline/45 hover:bg-amberline/15"
              onClick={() => setIsOpen(true)}
              type="button"
            >
              Open Full Scroll
            </button>
          </div>
        </div>
      </Panel>
      {isOpen ? <LivingScrollModal scroll={scroll} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}
