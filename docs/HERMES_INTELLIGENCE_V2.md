# Hermes Intelligence v2 — Architecture

**Status:** Architecture approved · **Implementation:** Phases 0–4 complete (independent layer; not product source of truth)  
**Next:** Phase 5 Conviction · Phase 6 Orchestrator · Phase 7 authority cleanup (each requires staying within frozen UI / frozen formulas)  
**Constraints:** UI v1.0 frozen · no dashboard wiring · no scoring formula changes · no paper-trading behavior changes  
**Companion:** [`HERMES_ARCHITECTURE.md`](./HERMES_ARCHITECTURE.md) · [`AGENTS.md`](../AGENTS.md)  
**Code:** `lib/intelligence-v2/` · tests: `tests/intelligence-v2*.test.ts`

This document is the **source of truth for Intelligence v2**. It supersedes the informal pipeline sketch from the design conversation where they conflict.

---

## 1. Design principles

1. **One pipeline, one bundle** per symbol/session snapshot.
2. Engines produce **evidence**, not isolated product decisions.
3. **Reasoning** weighs evidence and resolves conflicts (thesis).
4. **Judgment** answers whether Hermes would personally take the trade.
5. **Decision** evaluates Trade Quality and execution readiness of the plan.
6. **Coach** explains; it does not re-score.
7. **Primary workspace metrics remain three only:** Confidence · Trade Readiness · Trade Quality.
8. **Conviction** is internal (sizing aggression given regime)—not a fourth primary metric.
9. **Confidence Breakdown** is an internal structured explanation of Confidence (transparency/coaching)—not a new UI page.
10. Existing engine **formulas stay frozen** in Phase A–C unless a later phase explicitly reopens weights.

---

## 2. Canonical pipeline (v2)

```
Market Data
    ↓
Market Regime                    ← NEW: trend / range / volatility / liquidity / macro-event environment
    ↓
Evidence Collection
    ↓
Market Context                   ← interpreted inside regime
    ↓
Technical Structure
    ↓
Institutional Activity
    ↓
Risk Assessment
    ↓
Trader Profile
    ↓
Historical Memory
    ↓
Hermes Reasoning                 ← weighs evidence, resolves conflicts → thesis + Confidence + Readiness
    ↓
Hermes Judgment                  ← NEW: would Hermes personally take this trade?
    ↓
Decision                         ← Trade Quality + execution readiness of the plan / gates
    ↓
Coach Explanation
```

### Stage definitions

| Stage | Question | Produces | Does not produce |
|-------|----------|----------|------------------|
| **Market Data** | What is the tape? | Normalized quotes, candles, plan levels, fixture/live labels | Opinions |
| **Market Regime** | What environment are we in? | Regime profile (trend/range, vol, liquidity, macro-event) | Buy/sell |
| **Evidence Collection** | What raw claims exist? | Unified `HermesEvidence[]` from adapters | Final scores |
| **Market Context** | How do news + session + bias read *given regime*? | Context summary evidence | Isolated actions |
| **Technical Structure** | How is price structured? | Structure/trend/MTF/smart-chart structure evidence | Product-level “trade now” |
| **Institutional Activity** | What footprint evidence exists? | Footprint evidence + reliability | Guaranteed institutional intent |
| **Risk Assessment** | What is the risk picture? | RR, portfolio, news-risk evidence | Thesis confidence |
| **Trader Profile** | Who is trading? | DNA, goals, constraints (Memory authority) | Competing personalities |
| **Historical Memory** | What has this trader done? | Habits, discipline, lessons | Second memory system |
| **Hermes Reasoning** | What is the thesis? | Thesis, **Confidence**, **Trade Readiness**, Confidence Breakdown, conflict resolution | Plan grade; personal take/don’t-take |
| **Hermes Judgment** | Would Hermes take this trade? | Judgment stance + reasons (internal coach authority) | Trade Quality score |
| **Decision** | Is the **plan** good enough to execute? | **Trade Quality**, execution readiness of plan, decision gate/sim | New confidence formula |
| **Coach Explanation** | How do we teach this? | Single explanation + moments from bundle | Independent re-scoring |

### Regime requirement

All stages **after Market Regime** must interpret evidence **inside** the current regime.  
Example: the same breakout evidence is weighted differently in high-volatility macro-event regime vs low-vol trend regime—without changing published primary metric **formulas** until an explicit formula phase.

Initial implementation may **map** existing vision/news/volatility fields into a `MarketRegime` object (adapter) without inventing new scoring weights.

---

## 3. Reasoning vs Judgment vs Decision

These three stages must never collapse into one concept.

| Stage | Question | Output |
|-------|----------|--------|
| **Reasoning** | What is true about the market *given the evidence*? | Thesis · **Confidence** · **Trade Readiness** · blockers · scenarios · **Confidence Breakdown** |
| **Judgment** | Would Hermes **personally** take this trade *right now*? | `wouldTakeTrade` stance · rationale · constraints (profile, regime, readiness) |
| **Decision** | Is the **proposed plan** high enough quality to execute in paper practice? | **Trade Quality** · plan gaps · decision-review/sim artifacts |

### Separation rules

- **Reasoning** may conclude high Confidence + low Readiness (“good thesis, not actionable yet”).
- **Judgment** may refuse a trade even when Confidence is high (e.g. regime hostile, DNA mismatch, incomplete plan)—without rewriting Confidence.
- **Decision / Trade Quality** grades the **plan** (entry/stop/target/size), not the abstract thesis.
- UI primary metrics stay Confidence / Readiness / Trade Quality; Judgment and Conviction stay internal unless later approved for display.

---

## 4. Confidence Breakdown (internal model)

Every Confidence score retains a structured explanation:

```
ConfidenceBreakdown {
  finalConfidence: number;           // same primary Confidence (existing formula path)
  maxConfidence: number;             // e.g. 95 cap — existing constraint
  contributions: Array<{
    category: EvidenceCategory;      // structure, MTF, trend, institutional, volume, momentum, RR, news, DNA, plan, portfolio…
    direction: "Supportive" | "Contradictory" | "Neutral";
    weight: number;                  // configured weight (existing reasoning weights)
    rawScore: number;                // category evidence strength
    contribution: number;            // weighted contribution to final
    summary: string;                 // one-line coach-friendly reason
  }>;
  supportiveDrivers: string[];
  reducingDrivers: string[];
  unresolvedConflicts: string[];
}
```

### Rules

- Breakdown is **derived from the same evidence path that produces Confidence**—not a second confidence engine.
- Used for transparency, coaching, and debugging.
- **Not** a new page or primary metric.
- Existing UI may continue to show final Confidence only; breakdown is available on the bundle for future progressive disclosure without redesign now.

---

## 5. Conviction (internal signal)

| Signal | Measures | Primary metric? |
|--------|----------|-----------------|
| **Confidence** | Strength of the market thesis | **Yes** |
| **Conviction** | How aggressively Hermes would **size** given regime + judgment + risk | **No — internal only** |

```
Conviction {
  level: number;                     // 0–100 internal
  sizingBias: "None" | "Reduced" | "Standard" | "Elevated";
  drivers: string[];                 // regime, judgment, readiness, risk
  note: string;                      // internal coach note
}
```

### Rules

- Conviction **must not** be merged into Confidence, Readiness, Trade Quality, or scenario probabilities.
- Conviction **must not** appear as a fourth primary workspace metric in this phase.
- Default: stored on `HermesIntelligenceBundle` only; UI does not surface unless a later phase approves copy.
- Implementation should **derive** conviction from existing signals (regime, judgment, readiness, risk quality)—not invent a new public score system.

---

## 6. Canonical types (target)

```
HermesEvidence {
  id, stage, category,
  claim, direction, strength, reliability,
  sources: string[],
  regimeSensitivity?: string,
  chartRefs?, expiresAt?
}

MarketRegime {
  trendRegime: "Trend" | "Range" | "Transition";
  volatilityRegime: "Low" | "Medium" | "High";
  liquidityRegime: "Thin" | "Normal" | "Rich";
  macroEventRegime: "Quiet" | "Elevated" | "Event";
  summary: string;
}

HermesReasoningResult {
  thesis, confidence, readiness, readinessState, blockers,
  confidenceBreakdown: ConfidenceBreakdown,
  scenarios, confirmation, invalidation
}

HermesJudgment (Phase 4 contract) {
  stance: Take | Take With Caution | Wait | Avoid | Manage Existing Position | Insufficient Data
  wouldTakeTrade: boolean | "Conditional"
  summary, primaryReason, supportingReasons, blockingReasons
  conditionsToProceed, conditionsToAvoid
  regimeEffect, traderFitEffect, sourceTimestamp
}

HermesIntelligenceBundle {
  marketDataRef,
  regime: MarketRegime,
  evidence: HermesEvidence[],
  marketContext,
  technicalStructure,
  institutional,
  risk,
  traderProfile,
  memory,
  reasoning: HermesReasoningResult,
  judgment: HermesJudgmentResult,
  conviction: Conviction,              // internal
  decision: {
    tradeQuality?,
    executionReadiness?,               // plan-level readiness (TQ / gate)
    gate?, simulation?
  },
  coach: { explanation, moments[] }
}
```

### Single authority map

| Concept | Authority |
|---------|-----------|
| Market regime | Market Regime stage |
| Thesis Confidence | Reasoning only |
| Confidence Breakdown | Reasoning only (attached to Confidence) |
| Trade Readiness (setup actionability) | Reasoning only |
| Hermes Judgment (personal take) | Judgment only |
| Conviction (sizing aggression) | Judgment+Regime+Risk derivation (internal) |
| Trade Quality | Trade Quality engine (Decision stage) |
| DNA / personality | Memory only |
| Hermes Score | Secondary / alias policy (existing) |
| Coach narrative | Bundle-derived only |

---

## 7. Mapping existing modules → v2 stages

| Module family | v2 stage role |
|---------------|---------------|
| Market fixtures / quotes / candles | Market Data |
| Vision vol/bias + news urgency + MTF breadth (adapter) | **Market Regime** (initial adapter; no formula rewrite) |
| Symbol analysis, drawings, levels, news items, portfolio snapshot | Evidence Collection |
| Vision interpretation, news interpretation | Market Context (regime-aware) |
| Vision dimensions, MTF, Smart Chart structure | Technical Structure |
| Footprint stack | Institutional Activity |
| TQ risk inputs, portfolio, news caution | Risk Assessment evidence |
| Memory (canonical) | Trader Profile + Historical Memory |
| Strategy engine | Technical/Profile evidence (one pass) |
| `reasoning-engine` + evidence | **Hermes Reasoning** (+ breakdown packaging) |
| New thin judgment adapter over reasoning + profile + regime | **Hermes Judgment** |
| Trade Quality + decision-engine + simulation | **Decision** |
| Live mentor + coach triggers + briefing scroll text | **Coach Explanation** |
| Hermes Score | Secondary alias (unchanged policy) |
| Brain orphan paths | Deprecate/stop computing when orchestrator lands |
| Opportunity scanner | Evidence for study list; not workspace authority |

---

## 8. Orchestrator contract

```
runHermesIntelligence(input: MarketSessionInput): HermesIntelligenceBundle
```

- Pure, deterministic, testable.
- Dashboard eventually replaces multi-`useMemo` chain with one call (wiring only; UI frozen).
- Satellite routes may call the same function or stage adapters later.
- Strategy evaluated **once** after institutional evidence is available.
- Reasoning does **not** consume a “final TQ-mirrored Hermes Score” as authority; it consumes evidence.
- Judgment runs **after** Reasoning, **before** Decision.
- Trade Quality remains plan evaluation under Decision.

### Non-goals of first implementation phases

- No UI redesign or new pages  
- No changes to Trade Quality weights/caps  
- No changes to paper execution  
- No surfacing Conviction or Confidence Breakdown as primary chrome  
- No generative AI  

---

## 9. Relationship to primary metrics (frozen product surface)

| Metric | Owner stage | Notes |
|--------|-------------|-------|
| Confidence | Reasoning | Breakdown internal |
| Trade Readiness | Reasoning | Actionability of setup |
| Trade Quality | Decision | Plan quality |
| Judgment | Judgment | Internal / coach authority |
| Conviction | Derived internal | Not primary |
| Scenarios | Reasoning/Decision teaching | Never merged |

Hard rule (AGENTS): Confidence, Readiness, Trade Quality, and scenario probabilities never merge.  
**Addition:** Judgment and Conviction never merge into those three either.

---

## 10. Implementation status

| Phase | Scope | Status |
|-------|--------|--------|
| 0 Contracts | `lib/intelligence-v2/types.ts` | Done |
| 1 Market Regime | `lib/intelligence-v2/market-regime.ts` | Done |
| 2 Evidence Collection | `evidence-adapters.ts`, `collect-evidence.ts`, `dedupe-evidence.ts` | Done |
| 3 Confidence Breakdown packaging | `lib/intelligence-v2/confidence-breakdown.ts` | Done |
| 4 Judgment | `lib/intelligence-v2/judgment.ts` (`buildHermesJudgment`) | Done |
| 5 Conviction | — | Not started |
| 6 Orchestrator | — | Not started |
| 7 Authority cleanup / dashboard wiring | — | Not started |

Public exports: `lib/intelligence-v2/index.ts` (Phases 0–4).  
Dashboard is **not** rewired yet (UI frozen; no runtime path change).  
Judgment is **internal only** — not a primary workspace metric and not surfaced in UI.

---

## 11. Document maintenance

Update this file when:

- Stage order changes  
- Authority of Confidence / Judgment / Conviction changes  
- Implementation phases complete  

Do not document speculative formula rewrites as present fact.
