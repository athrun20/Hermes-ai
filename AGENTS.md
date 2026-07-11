# AGENTS.md — Hermes Development Rules

Permanent rules for humans and coding agents working in this repository.
Read this file before making changes. Prefer following these rules over inventing new product behavior.

Architecture reference: [`docs/HERMES_ARCHITECTURE.md`](docs/HERMES_ARCHITECTURE.md).

---

## Product identity

Hermes is an **AI trading mentor**.

Hermes is:

- A teacher of professional decision-making, risk awareness, patience, and execution discipline.
- A paper-trading practice environment with explainable, rule-based market intelligence.
- A chart-first workspace where structure, plan quality, and readiness are coached—not predicted as certainty.

Hermes is **not**:

- A chatbot (conversation is not the primary product surface).
- A signal generator (do not emit “buy/sell now” as authoritative trade signals).
- An indicator marketplace (indicators support teaching; they are not the product).
- A live brokerage, copy-trading, or automated execution system.

### Non-negotiable product claims

- Hermes must **not** guarantee profitable outcomes, trading accuracy, or edge.
- Hermes must **not** present deterministic rule output as live institutional fact or as guaranteed future price action.
- Hermes language should coach process (“wait for confirmation”, “plan is incomplete”) rather than promise results.

---

## Product priorities

1. **Reduce cognitive load before adding features.** Clarity beats more panels, more scores, and more routes.
2. **Do not add new pages without explicit approval.** Existing routes are the product surface unless a human approves expansion.
3. **Prefer progressive disclosure.** Show the essential mentor read first; detail on demand.
4. **Keep the native chart as the primary teaching surface.** The Hermes canvas chart workspace is the center of learning.
5. **Reuse existing components and services before creating new ones.** Extend engines, context builders, and `components/ui.tsx` rather than forking parallel systems.
6. **Preserve the visual direction:** Apple (calm, premium restraint) + Bloomberg Terminal (professional density, hierarchy) + TradingView Premium (chart craft, clean tooling). Dark surfaces, mint constructive, amber caution, rose risk—see `lib/design-tokens.ts` and `tailwind.config.ts`.

When in doubt: teach better decisions on the chart, do not ship another score or page.

---

## Score ownership

These concepts are **distinct**. Do not collapse them in UI copy, engines, or APIs.

### Primary workspace metrics (only these three)

| Concept | Meaning | Owner module (current) |
|---------|---------|------------------------|
| **Confidence** (Reasoning Confidence) | Strength of the current market thesis. | `lib/reasoning-engine.ts` (`confidenceScore` / evidence weighting); live presentation also via `lib/confidence-engine.ts` |
| **Trade Readiness** | Whether the setup is **actionable now** (vs wait / incomplete confirmation). | `lib/reasoning-engine.ts` (`tradeReadinessScore`, `readinessState`, blockers) |
| **Trade Quality** | Quality of the **complete proposed trade plan** (levels, risk, alignment, constraints). | `lib/trade-quality-engine.ts` and related `trade-quality-*` modules |

### Secondary diagnostics (not primary workspace metrics)

| Concept | Meaning | Owner module (current) |
|---------|---------|------------------------|
| **Multi-Timeframe Alignment** | Degree of directional agreement across timeframes. | `lib/multi-timeframe-engine.ts`, `lib/timeframe-alignment-score.ts` |
| **Institutional Confidence** | Reliability of the **institutional-footprint interpretation** (evidence quality, not omniscience). | `lib/institutional-footprint-engine.ts`, `lib/footprint-confidence-impact.ts` |
| **Hermes Score** | Product-facing composite. **Currently overlaps Trade Quality** (when TQ is present, Hermes Score often mirrors it). Do **not** treat Hermes Score as an additional independent primary metric until ownership is explicitly resolved. | `lib/hermes-score-engine.ts` |
| **Scenario probabilities** | Teaching tools for plausible paths—not a fourth primary score. | Scenario / simulation services |

Full ownership table (overlap + future treatment): [`docs/HERMES_ARCHITECTURE.md`](docs/HERMES_ARCHITECTURE.md) §10.

### Hard rule

**Confidence, Trade Readiness, Trade Quality, and scenario probabilities must never be merged into one concept.**

- Do not invent a single “overall %” that silently averages confidence + readiness + quality + scenarios.
- Do not rename one score to stand in for another in UI without an approved ownership change.
- Scenario probabilities (bull/bear/base cases, simulation EV, etc.) remain separate teaching tools.
- Do not promote secondary diagnostics (MTF, footprint, Hermes Score, opportunity scores, strategy scores) to primary workspace metrics without explicit approval.

---

## Engineering rules

### Architecture

- Keep **business logic outside React presentation components**. Engines and services live in `lib/`; components render and collect input.
- Do **not** add duplicate scoring calculations inside UI components. Score and grade in engines; UI displays results.
- Use **typed services and context builders** (`*-types.ts`, `*-context-builder.ts`, `*-service.ts`) to assemble engine inputs.
- Prefer pure, deterministic functions for mentor intelligence so results are explainable and testable.

### Data honesty

- Use **deterministic fixtures** for development and tests.
- Do **not** display mock data as live data. Label or structure data so users and agents know when prices, candles, or news are synthetic/fixture-based.
- Do **not** imply institutional intent without sufficient evidence. Footprint is an interpretation with confidence and caveats, not a claim of known order-flow intent.
- Avoid **future-data leakage** in Replay Mode. Replay must not reveal candles, outcomes, or grades that would not be known at the simulated moment.
- Preserve existing **paper-trading safeguards** (paper-only execution, buying-power checks, decision review flow, no real broker keys or live order placement).

### Process

- **Run tests before committing** (`npm test`; add relevant checks for touched engines).
- After implementation, **report**: changed files, test results, limitations, and assumptions.
- **Never perform broad unrelated refactors** during a focused feature task. Scope changes to the task; leave cleanup for explicit approval.

### Stack conventions (do not expand casually)

- Next.js App Router, React, TypeScript, Tailwind.
- Main workspace chart: native Hermes chart engine (`lib/hermes-chart-engine/`, `components/workspace/native-hermes-chart.tsx`).
- Replay may use `lightweight-charts`; do not replace the primary teaching chart without approval.
- Persistence is browser `localStorage` today; do not introduce backend auth/broker integrations without approval.

---

## Git workflow

| Branch | Role |
|--------|------|
| `main` | Stable branch. |
| `grok-development` | Grok working branch. |

- Do **not** merge automatically.
- Do not force-push shared branches unless a human explicitly requests it.
- Prefer small, reviewable commits scoped to the approved task.

---

## Out of scope unless explicitly approved

- New top-level pages or nav destinations.
- Real brokerage / API-key trading.
- Treating Hermes as a signal product or indicator store.
- Merging or renaming primary score concepts without a documented ownership decision.
- Large refactors of `HermesDashboard`, score engines, or chart stack “while fixing something else.”
- Removing modules for cleanup without an explicit deprecation task.

---

## Quick pointers

| Concern | Start here |
|---------|------------|
| Main chart workspace | `components/hermes-dashboard.tsx`, `components/workspace/professional-chart.tsx` |
| Hermes Vision | `lib/hermes-vision-engine.ts` |
| Reasoning + Trade Readiness | `lib/reasoning-engine.ts` |
| Trade Quality | `lib/trade-quality-engine.ts` |
| Multi-timeframe | `lib/multi-timeframe-engine.ts` |
| Institutional footprint | `lib/institutional-footprint-engine.ts` |
| News | `lib/news-intelligence-engine.ts`, `lib/mock-news-feed.ts` |
| Smart chart intelligence | `lib/smart-chart-intelligence.ts` |
| Paper trading | `lib/paper-trading.ts`, `lib/local-persistence.ts` |
| Shared UI | `components/ui.tsx`, `lib/design-tokens.ts` |
| Full architecture map | `docs/HERMES_ARCHITECTURE.md` |
