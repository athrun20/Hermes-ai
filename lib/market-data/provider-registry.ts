/**
 * Provider registry — route symbols to crypto vs fixture by asset class.
 */

import type { MarketDataProvider } from "@/lib/market-data/provider";
import {
  createCryptoMarketDataProvider,
  COINGECKO_ID_BY_SYMBOL,
  type CryptoProviderDeps,
} from "@/lib/market-data/crypto-provider";
import { fixtureMarketDataProvider } from "@/lib/market-data/fixture-provider";
import type { AssetClass, MarketDataRuntimeEnv } from "@/lib/market-data/types";
import { marketUniverse } from "@/lib/market-universe";
import {
  allowFixtureProvider,
  isLiveMarketDataEnabled,
  isProductionEnv,
} from "@/lib/market-data/policy";

export type RegistryDeps = {
  fixture?: MarketDataProvider;
  crypto?: MarketDataProvider;
  cryptoDeps?: CryptoProviderDeps;
  env?: MarketDataRuntimeEnv;
};

export class MarketDataProviderRegistry {
  private readonly fixture: MarketDataProvider;
  private readonly crypto: MarketDataProvider;
  private readonly env: MarketDataRuntimeEnv;

  constructor(deps: RegistryDeps = {}) {
    this.fixture = deps.fixture ?? fixtureMarketDataProvider;
    this.crypto =
      deps.crypto ??
      createCryptoMarketDataProvider({
        useProxy: true,
        ...deps.cryptoDeps,
      });
    this.env = deps.env ?? {};
  }

  resolveAssetClass(symbol: string): AssetClass {
    const upper = symbol.toUpperCase();
    const asset = marketUniverse.find((a) => a.symbol === upper);
    if (asset) return asset.assetType;
    if (COINGECKO_ID_BY_SYMBOL[upper]) return "Crypto";
    if (["SPY", "QQQ"].includes(upper)) return "ETF";
    return "Stock";
  }

  /**
   * Route symbol to provider.
   * Stocks/ETFs → fixture always (Phase 1).
   * Crypto → crypto provider when live enabled; else fixture when allowed.
   */
  resolveProvider(symbol: string): MarketDataProvider {
    const assetClass = this.resolveAssetClass(symbol);
    if (assetClass === "Stock" || assetClass === "ETF") {
      return this.fixture;
    }

    if (isLiveMarketDataEnabled(this.env)) {
      return this.crypto;
    }

    if (allowFixtureProvider(this.env)) {
      return this.fixture;
    }

    // Production with live disabled still may use fixture workspace path externally;
    // for service routing without live flag, return fixture only if allowed.
    if (!isProductionEnv(this.env)) {
      return this.fixture;
    }
    return this.fixture;
  }

  getCryptoProvider(): MarketDataProvider {
    return this.crypto;
  }

  getFixtureProvider(): MarketDataProvider {
    return this.fixture;
  }
}

export function createDefaultRegistry(deps?: RegistryDeps): MarketDataProviderRegistry {
  return new MarketDataProviderRegistry(deps);
}
