import type { TradeGrade } from "@/lib/paper-trading";

export function ReplayGrade({ grade }: { grade: TradeGrade }) {
  return (
    <div className="grid size-16 place-items-center rounded-full border border-amberline/25 bg-amberline/10 text-2xl font-semibold tracking-tight text-amberline shadow-insetPanel">
      {grade}
    </div>
  );
}
