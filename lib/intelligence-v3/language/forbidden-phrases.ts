/**
 * Forbidden signal / outcome language for Intelligence v3 packages.
 */

export const FORBIDDEN_PHRASES = [
  "buy now",
  "sell now",
  "enter trade",
  "guaranteed",
  "profit likely",
  "high probability winner",
] as const;

export function findForbiddenPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter((phrase) => lower.includes(phrase));
}

export function assertNoForbiddenLanguage(parts: string[]): string[] {
  const hits: string[] = [];
  for (const part of parts) {
    hits.push(...findForbiddenPhrases(part));
  }
  return [...new Set(hits)];
}
