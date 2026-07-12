/**
 * Isolated CoinGecko multi-quote proxy (Step A). Not wired to dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { REQUEST_POLICY } from "@/lib/market-data/policy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED",
          message: "Query param ids is required.",
          retryable: false,
        },
        providerStatus: "Unsupported",
      },
      { status: 400 },
    );
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      ids,
    )}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_POLICY.quoteTimeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "CoinGecko rate limited",
              retryable: true,
              provider: "coingecko",
            },
            providerStatus: "Rate Limited",
          },
          { status: 429 },
        );
      }
      if (!response.ok) {
        return NextResponse.json(
          {
            error: {
              code: "UNAVAILABLE",
              message: `HTTP ${response.status}`,
              retryable: true,
              provider: "coingecko",
            },
            providerStatus: "Degraded",
          },
          { status: 502 },
        );
      }
      const data = await response.json();
      return NextResponse.json(data, {
        headers: { "Cache-Control": "private, max-age=15" },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: /abort/i.test(msg) ? "TIMEOUT" : "NETWORK",
          message: msg,
          retryable: true,
          provider: "coingecko",
        },
        providerStatus: "Offline",
      },
      { status: 502 },
    );
  }
}
