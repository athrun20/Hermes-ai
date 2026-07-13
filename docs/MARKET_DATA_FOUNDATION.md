# Live Market Data Foundation

Provider-neutral market-data layer for Hermes.

| Step | Status |
|------|--------|
| **A** — Contracts, providers, service, API proxies, tests | Done |
| **B** — Main workspace read path via `MarketDataService` | Done |
| **C** — Data quality awareness metadata + minimal workspace UI | Done |
| **D** — Paper trading market-data authority (refuse invalid marks) | Done |
| **E** — Market data consistency across Hermes surfaces | Done |
| **F+** — Score caution hooks, per-symbol quality map, shadow scripts | Not started |

## Goals

- Isolate all market-data access behind contracts and a service.
- Support live crypto via CoinGecko (normalized, honest quality labels).
- Keep deterministic fixtures for development and tests.
- Stocks/ETFs remain fixtures in Phase 1.
- Never label fixture data as Live.
- Production must never silently fall back from failed live to fixtures.

## Package layout

```
lib/market-data/
  types.ts
  provider.ts
  provider-registry.ts
  normalize-quote.ts
  normalize-candles.ts
  timeframe-map.ts
  cache.ts
  request-dedupe.ts
  freshness.ts
  fixture-provider.ts
  crypto-provider.ts
  policy.ts
  service.ts
  adapters-compat.ts
  workspace.ts                 # Step B: dashboard read-path helper
  data-quality-awareness.ts    # Step C: WorkspaceDataQuality builder
  consumers.ts                 # Step E: shared surface loaders + consistency
  legacy.ts
  index.ts
```

## Feature flag

```
HERMES_LIVE_MARKET_DATA=1
# Client workspace (browser) also accepts:
NEXT_PUBLIC_HERMES_LIVE_MARKET_DATA=1
```

Live crypto remains **opt-in**. Default path is fixture.

## Step B read path

```
HermesDashboard
    → loadWorkspaceQuotes / loadWorkspaceMarketSeries  (lib/market-data/workspace.ts)
        → MarketDataService
            → registry (fixture | coingecko)
        → adapters-compat (MarketQuote/Candle → AssetQuote/Candle)
    → existing engines (unchanged contracts)
```

- Engines still consume legacy `AssetQuote` / `Candle`.
- No provider or CoinGecko calls from React components.
- Intelligence scores, paper trading, Learning Engine, Session Intelligence: **unchanged authority**.

## Route Handlers (isolated)

| Route | Purpose |
|-------|---------|
| `GET /api/market/quote` | CoinGecko single-id quote proxy |
| `GET /api/market/quotes` | Multi-id quote proxy |
| `GET /api/market/candles` | market_chart proxy |
| `GET /api/market/status` | Provider capabilities/status |

React components must not call CoinGecko directly.

## DataQuality

| Value | Meaning |
|-------|---------|
| Live | Meets TF freshness policy (rare for public aggregators) |
| Delayed | Fresh enough but delayed-capable public feed (CoinGecko default when fresh) |
| Stale | Aged beyond delayed window / last-good cache after failure |
| Fixture | Deterministic non-live data |
| Partial | Usable but incomplete (e.g. missing volume) |
| Unavailable | No valid mark/series |

CoinGecko is **not** described as exchange-grade real-time. Fresh CoinGecko quotes classify as **Delayed**, not Live.

## Timeframes (crypto live)

| Hermes TF | Phase 1 live |
|-----------|--------------|
| 1m–30m | Unsupported (honest Unavailable — no silent fixture-as-live) |
| 1H, 4H, 1D | Supported (aggregator) |
| 1W | Aggregate from daily only |

No coarse-to-fine fabrication. No invented volume.

## Policy

- Production + live failure → Unavailable or Stale cache (never silent Fixture).
- Dev/test fixtures allowed when policy permits.
- Stocks/ETFs → fixture provider always.

## Dashboard (Steps B–C)

Workspace quotes and selected candles load through `loadWorkspaceQuotes` / `loadWorkspaceMarketSeries`.

- Flag **off**: fixture provider (catalog prices from `marketUniverse`).
- Flag **on**: crypto supported TFs via CoinGecko proxy; stocks/ETFs still fixture; unsupported crypto TFs return honest Unavailable series.

### Step C — Data quality awareness

```
loadWorkspaceMarketSeries
  → series.dataQuality: WorkspaceDataQuality
  → HermesDashboard workspaceDataQuality state
  → ProfessionalChart → DataQualityIndicator
```

`WorkspaceDataQuality` exposes (read-only):

| Field | Purpose |
|-------|---------|
| `quality` / `statusLabel` | Fixture, Delayed, Live, Stale, Partial, Unavailable, Unsupported |
| `sourceLabel` / `provider` | Data source (Fixture, CoinGecko, …) |
| `limitations` / `summary` | Honest caveats for UI / future mentor copy |
| `isFixture`, `isDelayed`, `isLive`, `isUnavailable`, `timeframeUnsupported` | Booleans for future layers |

**Does not** change Confidence, Trade Readiness, Trade Quality, Hermes Score, or Learning Engine formulas.

UI: compact chart-header indicator (status pill + source + summary tooltip/line). No redesign.

## Paper trading (Step D)

Paper fills go through `evaluatePaperMarketDataAuthority` (`lib/paper-trading-market-authority.ts`) before open/close/reduce on the main workspace.

```
executePaperTicket / closePaperTrade (selected symbol)
  → evaluatePaperMarketDataAuthority({ price, workspaceDataQuality })
  → allowed? fill at authority.fillPrice
  → blocked? Hermes coach message (what / why / what is needed)
```

| Mark quality | Paper execution |
|--------------|-----------------|
| Fixture | Allowed (practice default) |
| Live / Delayed | Allowed when price finite & > 0 |
| Unavailable | **Blocked** |
| Unsupported TF (live 1m–30m crypto) | **Blocked** |
| Missing quality snapshot | **Blocked** |
| Invalid / non-positive price | **Blocked** |
| Stale / Partial | **Blocked** (not in executable set) |

Scores and Learning Engine are not modified — only whether a paper fill may proceed.

## Consistency (Step E)

Shared consumer API: `lib/market-data/consumers.ts`.

| Loader | Surfaces |
|--------|----------|
| `loadHermesMarketQuotesSnapshot` | Dashboard quotes, paper marks, scanner/briefing join, watchlist prices |
| `loadHermesTimeframeCandleMap` | Multi-timeframe engine (replaces independent `buildMockWorkspaceCandles`) |
| `buildMarketConsistencyReport` | Scanner + morning briefing ticker ↔ Hermes universe join |

```
All eligible surfaces
  → consumers (MarketDataService)
  → same mark for same symbol
  → WorkspaceDataQuality / consistency metadata available
```

**Does not** change Confidence, Trade Readiness, Trade Quality, Hermes Score, Learning Engine, or Smart Chart formulas.

### Remaining legacy / non-product paths

| Path | Status |
|------|--------|
| `marketUniverse` catalog / search metadata | Still used for symbol discovery + assetType labels |
| `buildMockWorkspaceCandles` | Offline tools only (e.g. `scripts/run-shadow-validation.ts`); not workspace MTF |
| Opportunity **study candidates** (setups/mood) | Still fixture study scenarios; **prices** for overlapping Hermes tickers join via snapshot |
| Replay page briefing | May call `buildMorningBriefing` without snapshot (metadata empty until load) |
