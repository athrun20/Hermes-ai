/**
 * Routing and fallback policy for Live Market Data Foundation.
 *
 * Production must never silently replace failed live data with fixtures.
 * Fixtures are allowed in development and tests when explicitly permitted.
 */

import type { MarketDataRuntimeEnv } from "@/lib/market-data/types";

export const LIVE_MARKET_DATA_ENV_FLAG = "HERMES_LIVE_MARKET_DATA";
/** Client-visible alias so the browser workspace can opt into live crypto. */
export const LIVE_MARKET_DATA_PUBLIC_ENV_FLAG =
  "NEXT_PUBLIC_HERMES_LIVE_MARKET_DATA";

export function isLiveMarketDataEnabled(
  env: MarketDataRuntimeEnv = {},
): boolean {
  if (env.liveMarketDataEnabled != null) return env.liveMarketDataEnabled;
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env[LIVE_MARKET_DATA_ENV_FLAG] === "1" ||
      process.env[LIVE_MARKET_DATA_PUBLIC_ENV_FLAG] === "1"
    );
  }
  return false;
}

export function isProductionEnv(env: MarketDataRuntimeEnv = {}): boolean {
  const nodeEnv =
    env.nodeEnv ??
    (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined);
  return nodeEnv === "production";
}

export function allowFixtureProvider(env: MarketDataRuntimeEnv = {}): boolean {
  if (env.allowFixtures != null) return env.allowFixtures;
  if (isProductionEnv(env) && isLiveMarketDataEnabled(env)) {
    // Production live mode: no fixture as silent fallback for crypto live path
    return false;
  }
  // Default: fixtures allowed for tests and development
  if (isProductionEnv(env) && !isLiveMarketDataEnabled(env)) {
    // Production without live flag still uses fixture workspace path today —
    // but market-data *service* live failures must not invent fixtures when live was requested.
    return true;
  }
  return true;
}

/**
 * When live was requested and failed: never return fixture in production.
 */
export function mayUseFixtureOnLiveFailure(env: MarketDataRuntimeEnv = {}): boolean {
  if (isProductionEnv(env)) return false;
  return allowFixtureProvider(env);
}

export const REQUEST_POLICY = {
  quoteTimeoutMs: 10_000,
  candleTimeoutMs: 15_000,
  maxRetries: 1,
  retryBackoffMs: 400,
  rateLimitCooldownMs: 30_000,
} as const;
