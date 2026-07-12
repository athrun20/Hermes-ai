/**
 * Market data provider status (Step A). Not wired to dashboard.
 */

import { NextResponse } from "next/server";
import { CryptoMarketDataProvider } from "@/lib/market-data/crypto-provider";
import { FixtureMarketDataProvider } from "@/lib/market-data/fixture-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const fixture = new FixtureMarketDataProvider();
  const crypto = new CryptoMarketDataProvider({ useProxy: false });
  return NextResponse.json({
    providers: {
      fixture: {
        id: "fixture",
        status: fixture.getProviderStatus(),
        capabilities: fixture.getCapabilities(),
      },
      coingecko: {
        id: "coingecko",
        status: crypto.getProviderStatus(),
        capabilities: crypto.getCapabilities(),
      },
    },
    notes: [
      "Step A: routes are isolated; dashboard remains fixture-driven.",
      "CoinGecko is a public aggregator — not exchange-grade real-time.",
    ],
  });
}
