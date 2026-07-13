/**
 * Minimal workspace data-quality indicator (Step C).
 * Presentation only — does not score or gate trades.
 */

import { StatusPill } from "@/components/ui";
import type { WorkspaceDataQuality } from "@/lib/market-data";

export function DataQualityIndicator({
  dataQuality,
  compact = false,
}: {
  dataQuality: WorkspaceDataQuality | null | undefined;
  compact?: boolean;
}) {
  if (!dataQuality) return null;

  const limitationHint =
    dataQuality.limitations[0] ?? dataQuality.summary;

  return (
    <div
      className={
        compact
          ? "inline-flex flex-wrap items-center gap-1.5"
          : "inline-flex max-w-full flex-wrap items-center gap-1.5"
      }
      title={limitationHint}
    >
      <StatusPill tone={dataQuality.tone}>{dataQuality.statusLabel}</StatusPill>
      <span className="text-[11px] font-medium text-slate-500">
        {dataQuality.sourceLabel}
      </span>
      {!compact && dataQuality.summary ? (
        <span className="max-w-[min(100%,28rem)] truncate text-[11px] text-slate-500">
          · {dataQuality.summary}
        </span>
      ) : null}
    </div>
  );
}
