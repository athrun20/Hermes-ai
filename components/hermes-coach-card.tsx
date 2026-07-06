"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, X } from "lucide-react";
import { HERMES_COACH_EVENT } from "@/lib/hermes-coach-trigger-system";
import type { HermesCoachMessage } from "@/lib/hermes-coach-types";
import { StatusPill } from "@/components/ui";

export function HermesCoachCard() {
  const [message, setMessage] = useState<HermesCoachMessage | null>(null);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      const coachEvent = event as CustomEvent<HermesCoachMessage>;
      setMessage(coachEvent.detail);
    };

    window.addEventListener(HERMES_COACH_EVENT, handleMessage);
    return () => window.removeEventListener(HERMES_COACH_EVENT, handleMessage);
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(null), 9000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message) return null;

  return (
    <aside className="fixed bottom-5 right-5 z-50 w-[min(420px,calc(100vw-2rem))] animate-[briefingReveal_360ms_ease-out_both] rounded-lg border border-amberline/20 bg-surface-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300">
            <BrainCircuit className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-300/80">
              Hermes Coach
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-white">
              {message.title}
            </h2>
          </div>
        </div>
        <button
          className="rounded-md border border-white/10 bg-white/[0.04] p-1.5 text-slate-400 transition hover:text-white"
          onClick={() => setMessage(null)}
          type="button"
          aria-label="Dismiss Hermes Coach"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{message.message}</p>
      {message.actionLabel ? (
        <div className="mt-4">
          <StatusPill tone="gold">{message.actionLabel}</StatusPill>
        </div>
      ) : null}
    </aside>
  );
}
