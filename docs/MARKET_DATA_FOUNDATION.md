# Live Market Data Foundation

Provider-neutral market-data layer for Hermes.

| Step | Status |
|------|--------|
| **A** — Contracts, providers, service, API proxies, tests | Done |
| **B** — Main workspace read path via `MarketDataService` | Done |
| **C** — Data quality awareness metadata + minimal workspace UI | Done |
| **D+** — Paper refuse-order, score caution hooks, satellite surfaces | Not started |

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

**Does not** change Confidence, Trade Readiness, Trade Quality, Hermes Score, paper trading, or Learning Engine formulas.

UI: compact chart-header indicator (status pill + source + summary tooltip/line). No redesign.

## Paper trading

**Unchanged** in Steps B–C. Future unavailable-price refuse-order rule is approved but not wired.
