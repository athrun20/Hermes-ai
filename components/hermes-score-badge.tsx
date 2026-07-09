import type { HermesScoreResult } from "@/lib/hermes-score-types";

export function HermesScoreBadge({ score }: { score: HermesScoreResult }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${tone(score.score)}`}>
      Hermes Score {score.score} · {score.label}
    </span>
  );
}

function tone(value: number) {
  if (value >= 80) return "border-mint-300/20 bg-mint-300/10 text-mint-200";
  if (value >= 60) return "border-amberline/20 bg-amberline/10 text-amber-100";
  return "border-rose-300/20 bg-rose-400/10 text-rose-200";
}
