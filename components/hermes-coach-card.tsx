"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, X } from "lucide-react";
import { HERMES_COACH_EVENT } from "@/lib/hermes-coach-trigger-system";
import type { HermesCoachMessage } from "@/lib/hermes-coach-types";
import { IconButton, StatusPill } from "@/components/ui";

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
    <aside
      className="hermes-fade-in fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-1.5rem))] rounded-xl border border-amberline/20 bg-surface-950/95 p-3.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:bottom-5 sm:right-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-mint-300/25 bg-mint-300/10 text-mint-300">
            <BrainCircuit className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mint-300/80">
              Coach
            </p>
            <h2 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-white">
              {message.title}
            </h2>
          </div>
        </div>
        <IconButton label="Dismiss Hermes Coach" onClick={() => setMessage(null)}>
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
      <p className="mt-2.5 text-sm leading-6 text-slate-300">{message.message}</p>
      {message.actionLabel ? (
        <div className="mt-2.5">
          <StatusPill tone="gold">{message.actionLabel}</StatusPill>
        </div>
      ) : null}
    </aside>
  );
}
