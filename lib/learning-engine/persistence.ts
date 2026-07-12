/**
 * Learning Engine persistence — hermes-trader-memory-v1 only.
 * Separate namespace from lib/hermes-memory.ts storage.
 */

import {
  createEmptyTraderMemoryStore,
  deserializeTraderMemory,
  serializeTraderMemory,
} from "@/lib/learning-engine/memory-store";
import type { TraderMemoryStore } from "@/lib/learning-engine/types";

/** Dedicated localStorage key — must not collide with hermes-memory-v1. */
export const TRADER_MEMORY_STORAGE_KEY = "hermes-trader-memory-v1";

export type PersistenceStatus = "ok" | "unavailable" | "error" | "empty";

export type LoadTraderMemoryResult = {
  store: TraderMemoryStore;
  status: PersistenceStatus;
  recoveredFromMalformed: boolean;
};

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Load trader memory safely. Malformed data yields an empty store (recovered).
 */
export function loadTraderMemoryStore(): LoadTraderMemoryResult {
  if (!canUseLocalStorage()) {
    return {
      store: createEmptyTraderMemoryStore(),
      status: "unavailable",
      recoveredFromMalformed: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(TRADER_MEMORY_STORAGE_KEY);
    if (!raw) {
      return {
        store: createEmptyTraderMemoryStore(),
        status: "empty",
        recoveredFromMalformed: false,
      };
    }
    const parsed = deserializeTraderMemory(raw);
    if (!parsed) {
      return {
        store: createEmptyTraderMemoryStore(),
        status: "error",
        recoveredFromMalformed: true,
      };
    }
    return {
      store: parsed,
      status: "ok",
      recoveredFromMalformed: false,
    };
  } catch {
    return {
      store: createEmptyTraderMemoryStore(),
      status: "error",
      recoveredFromMalformed: true,
    };
  }
}

/**
 * Persist trader memory. Returns false on failure without throwing.
 */
export function saveTraderMemoryStore(store: TraderMemoryStore): boolean {
  if (!canUseLocalStorage()) return false;
  try {
    // Preserve schema version + caps via official serializer
    const payload = serializeTraderMemory(store);
    // Guard: never write non-v1 payloads
    const check = deserializeTraderMemory(payload);
    if (!check || check.version !== 1) return false;
    window.localStorage.setItem(TRADER_MEMORY_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Test helper / reset — does not touch hermes-memory or paper state.
 */
export function clearTraderMemoryStorage(): boolean {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.removeItem(TRADER_MEMORY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
