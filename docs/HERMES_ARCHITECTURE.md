# Hermes Architecture

Living architecture map for Hermes v1.3.  
Companion development rules: [`AGENTS.md`](../AGENTS.md).

This document describes **current architecture truthfully**. It does not authorize refactors, score merges, UI redesigns, or product-behavior changes by itself.

---

## 1. Product overview

Hermes is an **AI trading mentor**—a client-side paper-trading and market-intelligence workspace that teaches professional decision-making, risk awareness, patience, and execution discipline.

| Hermes is | Hermes is not |
|-----------|----------------|
| A coach for process, plan quality, and readiness | A chatbot product |
| Explainable, rule-based mentor intelligence on a chart | A signal generator |
| A paper practice environment with local persistence | An indicator marketplace |
| A teaching surface for decision discipline | A live broker, copy-trader, or autotrader |

Hermes must not guarantee profitable outcomes or trading accuracy.

**Mentor intelligence today:** deterministic and rule-based. **No generative AI provider is connected.**

---

## 2. Framework and dependencies

| Layer | Choice | Package / location |
|-------|--------|--------------------|
| Framework | Next.js 15 App Router | `next@15.3.4` |
| UI library | React 19 | `react@19`, `react-dom@19` |
| Language | TypeScript | `typescript@5.7` |
| Styling | Tailwind CSS 3 | `tailwindcss`, `postcss`, `app/globals.css` |
| Icons | Lucide | `lucide-react` |
| Primary chart | Native canvas Hermes chart | `lib/hermes-chart-engine/*`, `components/workspace/native-hermes-chart.tsx` |
| Replay chart | Lightweight Charts v5 | `lightweight-charts`, `components/replay-mode/replay-chart.tsx` |
| State | React local state only | No Redux / Zustand / React Query |
| Persistence | Browser `localStorage` | See §13 |
| Tests | Node built-in test runner | `npm test` → `tests/*.test.mjs` |

App metadata: `package.json` name `hermes`, version `1.3.0`, private.

---

## 3. Route map

| Route | Entry | Primary component | Purpose |
|-------|-------|-------------------|---------|
| `/` | `app/page.tsx` | `components/hermes-dashboard.tsx` | Main chart workspace + full intelligence pipeline |
| `/paper-trading` | `app/paper-trading/page.tsx` | `paper-trading-page.tsx` | Paper portfolio focus |
| `/morning-briefing` | `app/morning-briefing/page.tsx` | `morning-briefing-page.tsx` | Daily goals, oath, briefing ritual |
| `/opportunity-scanner` | `app/opportunity-scanner/page.tsx` | `opportunity-scanner-page.tsx` | Opportunity list / quality framing |
| `/learning-journey` | `app/learning-journey/page.tsx` | `learning-journey-page.tsx` | Guided learning steps |
| `/replay-mode` | `app/replay-mode/page.tsx` | `replay-mode-page.tsx` | Historical trade replay and review |
| `/decision-journal` | `app/decision-journal/page.tsx` | `decision-journal-page.tsx` | Decision reflection journal |

Global shell: `app/layout.tsx` mounts `HermesCoachCard` for coach moments.

Navigation: `components/top-nav.tsx`.

**Do not add new routes without explicit product approval** (see AGENTS.md).

---

## 4. Presentation layer

### Structure

```
components/
  ui.tsx                         # Shared panels, pills, cards, badges
  top-nav.tsx                    # App navigation
  hermes-dashboard.tsx           # Main workspace composition root
  workspace/                     # Chart shell, vision, reasoning, floating plan
  morning-briefing/              # Briefing cards
  opportunity-scanner/           # Scanner cards
  decision-journal/              # Journal UI
  learning-journey/              # Learning steps
  replay-mode/                   # Replay UI + lightweight-charts
  hermes-coach*.tsx              # Coach surfaces
  trade-quality-*.tsx            # TQ badges/breakdown
  hermes-score-*.tsx             # Hermes Score badges/breakdown
  trade-controls.tsx             # Paper ticket entry
  floating via workspace/        # Floating analysis + trade plan
```

### Design system

| Asset | Role |
|-------|------|
| `lib/design-tokens.ts` | Spacing, radius, type, surfaces, accents |
| `components/ui.tsx` | `Panel`, cards, `StatusPill`, badges, progress, empty/skeleton |
| `tailwind.config.ts` | Surface palette, mint, amberline, shadows |
| `app/globals.css` | Dark base theme, selection, motion |

Visual direction: **Apple + Bloomberg Terminal + TradingView Premium** (calm premium UI, professional density, chart-first craft).

### Presentation rules

- Components render and collect input; they must not invent parallel scoring math.
- Prefer progressive disclosure and reuse of `ui.tsx` / existing panels.
- The **native chart** is the primary teaching surface.

---

## 5. Domain engines

Business logic lives under `lib/` as pure(ish) functions returning typed results.

### Core mentor engines

| Engine | File | Role |
|--------|------|------|
| Hermes Vision | `hermes-vision-engine.ts` | Structure / trend / momentum / risk / confirmation dimensions |
| Multi-Timeframe | `multi-timeframe-engine.ts` | Cross-timeframe alignment and mentor summary |
| News Intelligence | `news-intelligence-engine.ts` | Sentiment, urgency, risk caution, chart marker |
| Institutional Footprint | `institutional-footprint-engine.ts` | Footprint interpretation + confidence impact |
| Strategy Intelligence | `strategy-engine.ts` | Strategy fit / library scoring path |
| Reasoning | `reasoning-engine.ts` | Thesis, evidence, **confidence**, **trade readiness** |
| Trade Quality | `trade-quality-engine.ts` | Full plan quality grade and caps |
| Hermes Score | `hermes-score-engine.ts` | Product composite (currently often mirrors TQ) |
| Smart Chart Intelligence v2 | `smart-chart-intelligence.ts` | Top 3–5 chart annotations, market story timeline, confidence history (chart teaching only) |
| Live intelligence | `hermes-live-engine.ts` | Live mentor snapshot |
| Confidence (live) | `confidence-engine.ts` | Weighted live confidence snapshot |
| Symbol analysis | `symbol-analysis-engine.ts` | Per-symbol workspace analysis |
| Chart intelligence (legacy path) | `chart-intelligence-engine.ts` | Older chart intelligence result shape |
| Decision review | `decision-engine.ts` | Pre-execution paper decision review |
| Replay | `replay-engine.ts` | Replay session, grade, lessons |
| Opportunity / scanner | `opportunity-engine.ts`, `opportunity-scanner.ts`, scores in `hermes-brain.ts` | Scanner ranking |
| Coach | `hermes-coach-engine.ts`, `hermes-coach-trigger-system.ts` | Moment-based coaching |
| Memory / brain | `hermes-memory.ts`, `hermes-brain.ts` | Trader memory, habits, personality |
| Intelligence layer | `hermes-intelligence-layer.ts` | Discipline streak, yesterday replay snippet |
| Timeline | `timeline-engine.ts` | Mentor timeline events |
| Paper trading | `paper-trading.ts` | Positions, PnL, portfolio snapshot |

### Supporting services (selected)

Decision simulation stack: `decision-simulation-service.ts`, `expected-value-service.ts`, `scenario-generation-service.ts`, `scenario-probability-service.ts`, `simulation-snapshot-service.ts`, `risk-impact-service.ts`, `trade-adjustment-impact-service.ts`, `trade-plan-validation-service.ts`, `pre-trade-checklist-service.ts`, `trader-reason-alignment-service.ts`.

Trade Quality helpers: `trade-quality-rules.ts`, `trade-quality-caps.ts`, `trade-quality-config.ts`, `trade-quality-explanations.ts`, `trade-quality-improvements.ts`, `trade-quality-delta.ts`.

Footprint helpers: `footprint-rules.ts`, `footprint-evidence-builder.ts`, `footprint-confidence-impact.ts`.

News helpers: `news-keyword-engine.ts`, `mock-news-feed.ts`.

---

## 6. Context builders

Context builders assemble typed inputs for engines. Prefer extending these over ad-hoc object construction in UI.

| Builder | File | Feeds |
|---------|------|-------|
| Hermes Vision context | `chart-context-builder.ts` | Vision, and downstream engines via shared context |
| Trade Quality context | `trade-quality-context-builder.ts` | Trade Quality engine |
| Timeframe context | `timeframe-context-builder.ts` | Multi-timeframe candle bundles / analysis |
| Decision header adapter | `decision-header-adapter.ts` | Decision UI header metrics |
| Historical setup adapter | `historical-setup-adapter.ts` | Historical / replay-adjacent setup shaping |
| Reasoning evidence | `reasoning-evidence.ts` | Evidence list for Reasoning Engine |
| Chart drawing analyzer | `chart-drawing-analyzer.ts` | Drawing-derived structure inputs |
| Trade level analyzer | `trade-level-analyzer.ts` | Entry/stop/target analysis |

---

## 7. Persistence systems

| Concern | Module | Mechanism |
|---------|--------|-----------|
| Paper account (cash, positions, history, journal, settings) | `local-persistence.ts` | `localStorage` |
| Hermes memory | `hermes-memory.ts` | `localStorage` |
| Reasoning snapshots | `reasoning-snapshots.ts` | `localStorage` |
| Decision journal entries | `decision-journal-engine.ts` | `localStorage` |
| Chart alerts | `professional-chart.tsx` | `localStorage` |
| Workspace UI (symbol, TF, drawings, levels, panels) | `hermes-dashboard.tsx` save helpers | `localStorage` |
| Coach state | coach trigger / card modules | browser storage as implemented |

No server database. Clearing paper state: `clearHermesState()` in `local-persistence.ts`.

---

## 8. Chart architecture

### Primary teaching chart (main workspace)

```
professional-chart.tsx          # Toolbar, TF, indicators, drawings, alerts, panels
        │
        ▼
native-hermes-chart.tsx         # Pointer/viewport interaction, vision labels
        │
        ▼
hermes-chart-engine/
  renderer.ts                   # Canvas paint
  scales.ts                     # Price/time mapping, hit-test
  indicators.ts                 # Overlay series
  indicator-calculations.ts     # Indicator math
  hermes-zone-engine.ts         # Zones
  candle-explanation-engine.ts  # Candle pedagogy
  types.ts
```

Types for drawings and trade levels: `lib/chart-types.ts`.

### Replay chart (secondary)

- `components/replay-mode/replay-chart.tsx` uses **`lightweight-charts`**.
- Options: `lib/lightweight-chart-options.ts`.
- Not the primary teaching surface.

---

## 9. Intelligence pipeline

> **Intelligence v2 (target):** See [`HERMES_INTELLIGENCE_V2.md`](./HERMES_INTELLIGENCE_V2.md) for the approved single-pipeline design (Market Regime, Reasoning vs Judgment vs Decision, Confidence Breakdown, internal Conviction). Implementation is staged; UI remains frozen.

### Canonical pipeline (approximate **current v1** order)

```
Market data and candles
  → Chart context
  → Hermes Vision
  → Multi-Timeframe Intelligence
  → News Intelligence
  → Institutional Footprint
  → Strategy Intelligence
  → Reasoning Engine
  → Trade Readiness          (output of Reasoning Engine)
  → Trade Quality
  → Hermes Score
  → Smart Chart Intelligence
  → Live Timeline and Coaching
```

Orchestration lives primarily in **`components/hermes-dashboard.tsx`** as a large chain of `useMemo` calls.

### Overlaps and recalculations (current truth)

| Observation | Detail |
|-------------|--------|
| **Strategy Intelligence runs twice** | Preliminary strategy (without footprint) then full strategy (with footprint). Intentional layering; duplicate work. |
| **Hermes Score vs Trade Quality** | When Trade Quality is present, `calculateHermesScore` often **mirrors** Trade Quality score/breakdown rather than computing an independent primary metric. |
| **Multiple confidence paths** | Reasoning confidence (thesis strength), live confidence (`confidence-engine` + mentor intelligence), opportunity confidence, footprint confidence impact, Smart Chart `confidenceDelta`. |
| **Vision vs Reasoning vs TQ** | Structure/momentum/risk appear in Vision dimensions, Reasoning evidence, and Trade Quality categories—related inputs, separate outputs. |
| **Chart intelligence duality** | `smart-chart-intelligence.ts` is the active pipeline step; `chart-intelligence-engine.ts` / panel represent an overlapping older path. |
| **Brain vs Memory** | Both produce trader personality / habit-style insights; dashboard imports both lineages. |
| **Satellite routes rebuild context** | Morning Briefing, Scanner, Replay, Journal do not share dashboard pipeline state; they recompute or use partial subsets. |

### Feature control map

| Feature | Owner module(s) | Primary UI |
|---------|-----------------|------------|
| Main chart workspace | `hermes-dashboard.tsx`, `professional-chart.tsx`, `native-hermes-chart.tsx` | `/` |
| Hermes Vision | `hermes-vision-engine.ts` | `hermes-vision-panel.tsx` |
| Reasoning Engine | `reasoning-engine.ts` | `hermes-reasoning-panel.tsx` |
| Confidence | Reasoning + `confidence-engine.ts` | Reasoning / live analysis surfaces |
| Trade Readiness | `reasoning-engine.ts` (`calculateTradeReadiness`) | Reasoning panel |
| Trade Quality | `trade-quality-engine.ts` | badges + breakdown + floating plan |
| Multi-Timeframe | `multi-timeframe-engine.ts` | `timeframe-alignment-matrix.tsx` |
| Institutional Footprint | `institutional-footprint-engine.ts` | `footprint-panel.tsx` |
| News Intelligence | `news-intelligence-engine.ts` | `news-intelligence-panel.tsx` |
| Smart Chart Intelligence | `smart-chart-intelligence.ts` | Chart annotations / labels |
| Trade Plan (active) | Chart levels + `floating-trade-plan.tsx` + `trade-controls.tsx` | Floating dock |
| Replay Mode | `replay-engine.ts` | `replay-mode/*` |

---

## 10. Score ownership map

### Primary workspace metrics (only these three)

Product direction: the workspace should treat **only** these as primary mentor metrics:

1. **Confidence** (Reasoning Confidence — strength of the current market thesis)
2. **Trade Readiness** (whether the setup is actionable now)
3. **Trade Quality** (quality of the complete proposed trade plan)

All other scores are **secondary diagnostics** unless product ownership is formally changed.

### Ownership table

| Score name | Owner module | Question it answers | Primary or secondary | Current overlap | Recommended future treatment |
|------------|--------------|---------------------|----------------------|-----------------|------------------------------|
| **Confidence** (Reasoning Confidence) | `lib/reasoning-engine.ts` (`confidenceScore`, evidence weights); live presentation also `lib/confidence-engine.ts` → `hermes-mentor-intelligence` | How strong is the current market thesis? | **Primary** | Live confidence, opportunity confidence, footprint impact, Smart Chart delta all touch “confidence” language | Keep as thesis-strength primary; consolidate **display** under one Confidence API; keep deltas as diagnostics, not a second primary |
| **Trade Readiness** | `lib/reasoning-engine.ts` (`tradeReadinessScore`, `readinessState`, blockers) | Is the setup actionable **now**? | **Primary** | Sometimes confused with Confidence or plan completeness in copy | Keep as actionability primary; never average into Confidence or Trade Quality |
| **Trade Quality** | `lib/trade-quality-engine.ts` (+ rules/caps/config/context builder) | How good is the complete proposed trade plan? | **Primary** | Hermes Score often mirrors TQ when TQ is present | Keep as plan-quality primary; drive plan UI and pre-trade gates |
| **Hermes Score** | `lib/hermes-score-engine.ts` | Product composite label historically used in badges | **Secondary** (until ownership resolved) | **Heavy overlap with Trade Quality**—not an independent primary | Stop treating as independent primary; either alias TQ explicitly or redefine under a later approved ownership task |
| **Multi-Timeframe Alignment** | `lib/multi-timeframe-engine.ts`, `timeframe-alignment-score.ts` | How much directional agreement across timeframes? | **Secondary diagnostic** | Feeds Vision/Reasoning/TQ categories | Keep as input/diagnostic; surface in MTF panel, not as a fourth primary badge |
| **Institutional Confidence** | `lib/institutional-footprint-engine.ts`, `footprint-confidence-impact.ts` | How reliable is the footprint interpretation? | **Secondary diagnostic** | Can be misread as institutional intent certainty | Keep with strong caveats; never claim known intent; feed TQ/Reasoning as evidence only |
| **Vision dimension scores** | `lib/hermes-vision-engine.ts` | Dimensional structure of the chart read | **Secondary diagnostic** | Overlaps Reasoning evidence categories | Teaching breakdown only |
| **Opportunity score** | `hermes-brain.ts` / opportunity modules | Relative attractiveness for scanner ranking | **Secondary** (scanner context) | Separate confidence engine for opportunities | Confine to scanner; do not promote to main workspace primary |
| **Strategy scores** | `strategy-engine.ts`, `strategy-scoring.ts` | Strategy fit / library ranking | **Secondary diagnostic** | Overlaps TQ “trader fit” themes | Diagnostic / strategy panel only |
| **Decision / replay grades** | `decision-engine.ts`, `decision-score.ts`, `replay-engine.ts` | Quality of a decision or historical review | **Secondary** (context-specific) | Different domains by design | Keep scoped to review/replay flows |
| **Scenario probabilities** | `scenario-probability-service.ts` (+ simulation services) | Plausible path weights for teaching | **Secondary diagnostic** | Must not merge with Confidence/Readiness/TQ | Keep separate teaching tool |

### Hard rule

**Confidence, Trade Readiness, Trade Quality, and scenario probabilities must never be merged into one concept** (no single blended “accuracy %”).

---

## 11. Current data sources

| Data | Source module | Content |
|------|---------------|---------|
| Symbol universe / quotes | `lib/market-universe.ts` | Static fixture quotes (crypto + stocks + ETFs) |
| Workspace candles | `buildMockWorkspaceCandles` / `buildFallbackCandles` in `market-universe.ts` / `market-data.ts` | Deterministic synthetic OHLCV-like series |
| Optional CoinGecko HTTP helpers | `lib/market-data.ts` (`fetchLiveQuotes`, `fetchMarketCandles`) | Implemented helpers for a subset of crypto IDs |
| News | `lib/mock-news-feed.ts` | Curated mock headlines by symbol |
| Journal seed samples | `lib/market-data.ts` `journal` | Demo journal rows |
| Paper portfolio | User actions + `paper-trading.ts` | Local session state |

---

## 12. Mock versus live-data status

| Claim | Status |
|-------|--------|
| Main workspace quotes | **Deterministic mock** via `marketUniverse` |
| Main workspace candles | **Deterministic mock** via `buildMockWorkspaceCandles` / fallbacks |
| CoinGecko helpers | **Exist but are not connected** to the primary workspace UI path |
| Stock and ETF symbols | **Mock representations** (not live exchange feeds) |
| News | **Mock news feed** only |
| Generative AI provider | **None connected** |
| Mentor intelligence | **Deterministic and rule-based** |

**Honesty rule:** never display or document mock fixtures as live market data.

---

## 13. LocalStorage usage

| Key / area | Module | Data |
|------------|--------|------|
| `hermes.v1.3.paper-account` | `local-persistence.ts` | Cash, positions, history, journal entries, settings, symbol, timeframe |
| Hermes memory key(s) | `hermes-memory.ts` | Trader memory snapshot |
| `hermes.reasoning.snapshots.v1` | `reasoning-snapshots.ts` | Reasoning snapshots |
| Decision journal key | `decision-journal-engine.ts` | Journal records |
| `hermes.chart.alerts.v1` | `professional-chart.tsx` | Price/alert rules |
| Workspace settings (dashboard) | `hermes-dashboard.tsx` | Watchlist, indicators, drawings, trade levels, panel widths, mode |

All client-side; no multi-device sync.

---

## 14. Testing setup

| Item | Detail |
|------|--------|
| Command | `npm test` |
| Runner | `node --test tests/*.test.mjs` |
| Current files | `tests/trade-quality-engine.test.mjs`, `tests/decision-simulator.test.mjs` |
| Style | Often config/source-constraint checks and pure function assertions |
| Gaps | Most engines lack golden-fixture unit tests; no React component test suite in package scripts |

Run tests before committing. Prefer deterministic fixtures for new engine tests.

---

## 15. Known architectural weaknesses

1. **`HermesDashboard` is a god composition root** — pipeline, paper trading, persistence, and layout in one large client component.
2. **Score proliferation and overlap** — especially Hermes Score ↔ Trade Quality and multiple “confidence” paths.
3. **Mock-first market path** while CoinGecko helpers and some copy can imply live markets.
4. **Strategy engine double evaluation** on the main workspace path.
5. **No shared application state across routes** — mentor context can drift between Briefing / Scanner / Replay / Journal / Dashboard.
6. **Overlapping mentor modules** (brain, memory, mentor intelligence, live mentor, chart intelligence variants).
7. **Thin automated test coverage** relative to scoring surface area.
8. **Design tokens inconsistently applied** — many one-off class strings outside `ui.tsx`.
9. **Client-only architecture** — limits secure future backends without a deliberate service boundary.
10. **Documentation historically lagged product surface** — mitigated by AGENTS.md + this file; keep them current after structural changes.

---

## 16. Deprecated or overlapping systems requiring future review

Do **not** remove these without an explicit deprecation task. Track for future review:

| System | Why it needs review |
|--------|---------------------|
| `hermes-score-engine.ts` as independent primary | Overlaps Trade Quality; ownership unresolved |
| `chart-intelligence-engine.ts` + `chart-intelligence-panel.tsx` | Overlaps Smart Chart Intelligence |
| Simple `trade-plan.tsx` | Superseded in practice by `floating-trade-plan.tsx` |
| `fetchLiveQuotes` / `fetchMarketCandles` unused on main path | Dead path vs honesty/docs drift |
| Dual personality/habit generators (`hermes-brain` vs `hermes-memory`) | Duplicate conceptual space |
| `opportunity-confidence-engine` vs reasoning/live confidence | Multiple confidence semantics |
| `hermes-intelligence.ts` / `hermes-mentor-intelligence.ts` / `live-mentor.ts` / `hermes-live-engine.ts` | Adjacent live-mentor surfaces |
| Preliminary + final `analyzeStrategyIntelligence` | Recalculation cost and drift risk |

---

## 17. Recommended phased refactor sequence

**Not started. Requires explicit approval per phase. No behavior/score/UI changes implied until a phase is approved.**

| Phase | Goal | Intent |
|-------|------|--------|
| **0 — Guardrails (done when docs land)** | AGENTS.md + this architecture doc | Freeze rules, ownership language, honesty about mock data |
| **1 — Intelligence Pipeline extraction** | Extract pure pipeline function/hook from `HermesDashboard` | Same order and outputs; testable composition; no score formula changes |
| **2 — Score surface cleanup** | UI/docs treat only Confidence, Readiness, Trade Quality as primary | Hermes Score demoted or aliased; no silent merges |
| **3 — Confidence API consolidation** | Single thesis Confidence read model + explicit diagnostic deltas | Do not invent new primary metrics |
| **4 — Market data boundary** | Explicit Mock vs Live adapters; label fixtures honestly | Wire live only with approval; stocks/ETFs stay mock until source exists |
| **5 — Shared mentor context across routes** | Optional shared store/context for memory/DNA/pipeline outputs | Reduce cross-page drift |
| **6 — Deprecation passes** | Remove or archive reviewed overlaps after usage audit | One module family per pass; tests green |
| **7 — Test harness expansion** | Golden fixtures for Vision, Reasoning readiness, TQ caps, News keywords, Footprint | Protect mentor trust before formula edits |
| **8 — Real AI boundary (optional future)** | Single mentor-composer adapter if LLM is added | Engines remain tools/evidence; not scattershot LLM calls |

**Explicit non-goals until approved:** redesign UI, change score weights, add pages, merge Confidence + Readiness + Trade Quality, auto-merge git branches.

---

## Document maintenance

Update this file when:

- Controlling modules for a pipeline step move
- Score ownership is formally resolved
- Mock vs live data wiring changes in a user-visible way
- Routes are added (approval required) or removed
- A refactor phase completes

Document **what the code does after it ships**, not speculative redesigns as present fact.
