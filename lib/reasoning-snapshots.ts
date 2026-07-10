import { createReasoningSnapshot } from "@/lib/reasoning-engine";
import type { ReasoningResult, ReasoningSnapshot } from "@/lib/reasoning-types";

export const REASONING_SNAPSHOT_STORAGE_KEY = "hermes.reasoning.snapshots.v1";

export function loadReasoningSnapshots(): ReasoningSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REASONING_SNAPSHOT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReasoningSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveReasoningSnapshot(reasoning: ReasoningResult) {
  if (typeof window === "undefined") return;
  const snapshot = createReasoningSnapshot(reasoning);
  const existing = loadReasoningSnapshots();
  const withoutDuplicate = existing.filter(
    (item) => !(item.symbol === snapshot.symbol && item.phase === snapshot.phase),
  );
  const next = [snapshot, ...withoutDuplicate].slice(0, 120);
  window.localStorage.setItem(REASONING_SNAPSHOT_STORAGE_KEY, JSON.stringify(next));
}
