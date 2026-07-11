/**
 * Deterministic evidence deduplication.
 * Removes near-duplicate claims; preserves contradictory evidence.
 */

import type { HermesEvidence } from "@/lib/intelligence-v2/types";

export type DedupeOptions = {
  /** Jaccard similarity threshold for claim text (0–1). Default 0.82 */
  similarityThreshold?: number;
};

/**
 * Drops evidence that is essentially the same conclusion twice.
 * Never drops a pair that conflicts in direction unless claims are identical copies.
 */
export function dedupeHermesEvidence(
  items: HermesEvidence[],
  options: DedupeOptions = {},
): HermesEvidence[] {
  const threshold = options.similarityThreshold ?? 0.82;
  const result: HermesEvidence[] = [];

  for (const item of items) {
    const duplicateIndex = result.findIndex((kept) => isDuplicate(kept, item, threshold));
    if (duplicateIndex === -1) {
      result.push(item);
      continue;
    }

    const kept = result[duplicateIndex];
    // Prefer higher reliability, then higher strength, then earlier timestamp
    if (shouldReplace(kept, item)) {
      result[duplicateIndex] = item;
    }
  }

  return result;
}

function isDuplicate(a: HermesEvidence, b: HermesEvidence, threshold: number): boolean {
  if (a.id === b.id) return true;

  // Contradictory directions are never treated as the same conclusion
  if (a.direction !== b.direction && a.direction !== "Neutral" && b.direction !== "Neutral") {
    return false;
  }
  // Supportive vs Neutral or Contradictory vs Neutral can still be near-duplicates of the same claim
  if (a.direction !== b.direction) {
    // Only merge if claim is extremely similar and category matches
    if (a.category !== b.category) return false;
    return normalizeClaim(a.claim) === normalizeClaim(b.claim);
  }

  if (a.category !== b.category) return false;

  if (a.symbol && b.symbol && a.symbol !== b.symbol) return false;
  if (a.timeframe && b.timeframe && a.timeframe !== b.timeframe) return false;

  const sameSourceEvent =
    Boolean(a.metadata?.sourceEventId) &&
    a.metadata?.sourceEventId === b.metadata?.sourceEventId;

  if (sameSourceEvent && a.category === b.category && a.direction === b.direction) {
    return true;
  }

  const similarity = jaccardSimilarity(tokenize(a.claim), tokenize(b.claim));
  return similarity >= threshold;
}

function shouldReplace(kept: HermesEvidence, candidate: HermesEvidence): boolean {
  const rank = (item: HermesEvidence) =>
    reliabilityRank(item.reliability) * 1000 + item.strength * 10 - item.timestamp / 1e15;

  return rank(candidate) > rank(kept);
}

function reliabilityRank(value: HermesEvidence["reliability"]): number {
  if (value === "High") return 3;
  if (value === "Medium") return 2;
  return 1;
}

function normalizeClaim(claim: string): string {
  return claim.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(claim: string): Set<string> {
  return new Set(
    normalizeClaim(claim)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
