/**
 * Hermes Intelligence v3 — public surface (Phase 0).
 *
 * Shadow-ready pure interpretation layer. Not product authority.
 */

export type {
  ContextNote,
  IntelligenceV3AnalysisMode,
  IntelligenceV3AnalysisSurface,
  IntelligenceV3Input,
  IntelligenceV3Package,
  IntelligenceV3Severity,
  MentorCaveat,
  MentorCaveatCategory,
  MissingConfirmation,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

export { buildIntelligenceV3 } from "@/lib/intelligence-v3/build-intelligence-v3";
export {
  buildDeterministicKey,
  hashString,
  stableStringify,
} from "@/lib/intelligence-v3/determinism";
export {
  FORBIDDEN_PHRASES,
  assertNoForbiddenLanguage,
  findForbiddenPhrases,
} from "@/lib/intelligence-v3/language/forbidden-phrases";
