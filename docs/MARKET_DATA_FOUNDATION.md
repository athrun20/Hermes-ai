# Live Market Data Foundation (Step A)

Provider-neutral market-data layer for Hermes. **Step A only** — not wired to the dashboard.

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
  legacy.ts
  index.ts
```

## Feature flag

```
HERMES_LIVE_MARKET_DATA=1
```

Live crypto remains **opt-in**. Default path is fixture until Steps B–E are approved.

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
| 1m–30m | Unsupported |
| 1H, 4H, 1D | Supported (aggregator) |
| 1W | Aggregate from daily only |

No coarse-to-fine fabrication. No invented volume.

## Policy

- Production + live failure → Unavailable or Stale cache (never silent Fixture).
- Dev/test fixtures allowed when policy permits.
- Stocks/ETFs → fixture provider always.

## Dashboard

**Unchanged.** Workspace still uses `marketUniverse` + `buildMockWorkspaceCandles`.

## Paper trading

**Unchanged** in Step A. Future unavailable-price refuse-order rule is approved but not wired.
