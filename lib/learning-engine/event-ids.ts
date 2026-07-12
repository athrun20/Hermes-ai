/**
 * Deterministic Learning Event IDs.
 *
 * Format: sourceType:action:sourceRecordId:completedTimestamp
 * Stable across React rerenders, refreshes, Strict Mode, and remapped callbacks.
 * Never use random IDs or Date.now() solely for identity.
 */

export type LearningEventIdParts = {
  sourceType: string;
  sourceRecordId: string;
  action: string;
  /** Unix ms of the source completion moment (closedAt, updatedAt, etc.). */
  completedTimestamp: number;
};

/**
 * Build a stable, source-derived event id.
 */
export function buildLearningEventId(parts: LearningEventIdParts): string {
  const sourceType = sanitize(parts.sourceType);
  const action = sanitize(parts.action);
  const sourceRecordId = sanitize(parts.sourceRecordId);
  const completedTimestamp = Number.isFinite(parts.completedTimestamp)
    ? Math.trunc(parts.completedTimestamp)
    : 0;
  return `${sourceType}:${action}:${sourceRecordId}:${completedTimestamp}`;
}

function sanitize(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_.:-]/g, "");
}
