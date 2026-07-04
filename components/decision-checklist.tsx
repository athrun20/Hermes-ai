import { CheckCircle2, CircleAlert } from "lucide-react";
import type { DecisionChecklistItem } from "@/lib/decision-types";

export function DecisionChecklist({ items }: { items: DecisionChecklistItem[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3"
          key={item.id}
        >
          {item.passed ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint-300" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amberline" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
