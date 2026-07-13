/**
 * Hermes Intelligence v3 — public surface (Phase 0–1).
 *
 * Pure interpretation layer + silent shadow runner. Not product authority.
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

export type {
  IntelligenceV3ShadowRecord,
  RunIntelligenceV3ShadowInput,
} from "@/lib/intelligence-v3/shadow-mode";

export {
  V3_SHADOW_ENV_FLAG,
  V3_SHADOW_PUBLIC_ENV_FLAG,
  V3_SHADOW_RING_BUFFER_CAPACITY,
  isIntelligenceV3ShadowEnabled,
  runIntelligenceV3Shadow,
  runIntelligenceV3ShadowWithBuilder,
  toV3Input,
  packageToShadowRecord,
  getRecentIntelligenceV3Shadows,
  clearIntelligenceV3Shadows,
  recordV3Shadow,
} from "@/lib/intelligence-v3/shadow-mode";