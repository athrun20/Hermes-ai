import type { HermesScoreResult } from "@/lib/hermes-score-types";
import { StatusPill } from "@/components/ui";

/** Secondary diagnostic badge — not a primary workspace metric. */
export function HermesScoreBadge({ score }: { score: HermesScoreResult }) {
  const tone = score.score >= 80 ? "mint" : score.score >= 60 ? "gold" : "danger";

  return (
    <StatusPill tone={tone} className="tabular-nums">
      Score {score.score} · {score.label}
    </StatusPill>
  );
}
