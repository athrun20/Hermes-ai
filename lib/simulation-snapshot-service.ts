import type { DecisionSimulationResult, DecisionSimulationSnapshot } from "@/lib/decision-simulator-types";

const STORAGE_KEY = "hermes.decision-simulations.v1";

export function createSimulationSnapshot({
  simulation,
  symbol,
  timeframe,
}: {
  simulation: DecisionSimulationResult;
  symbol: DecisionSimulationSnapshot["symbol"];
  timeframe: string;
}): DecisionSimulationSnapshot {
  return {
    kind: simulation.kind,
    id: simulation.id,
    symbol,
    timeframe,
    inputSignature: simulation.inputSignature,
    summary: simulation.summary,
    scenarios: simulation.scenarios,
    checklist: simulation.checklist,
    traderReasonAlignment: simulation.traderReasonAlignment,
    decision: simulation.decision,
    dataQuality: simulation.dataQuality,
    createdAt: simulation.createdAt,
  };
}

export function loadSimulationSnapshots(): DecisionSimulationSnapshot[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DecisionSimulationSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveSimulationSnapshot(snapshot: DecisionSimulationSnapshot): DecisionSimulationSnapshot[] {
  if (typeof window === "undefined") return [snapshot];

  const snapshots = loadSimulationSnapshots();
  const next = [snapshot, ...snapshots.filter((item) => item.id !== snapshot.id)].slice(0, 50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
