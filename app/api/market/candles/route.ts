/**
 * Isolated CoinGecko candles proxy (Step A). Not wired to dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { REQUEST_POLICY } from "@/lib/market-data/policy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const days = request.nextUrl.searchParams.get("days") ?? "7";
  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED",
          message: "Query param id is required.",
          retryable: false,
        },
        providerStatus: "Unsupported",
      },
      { status: 400 },
    );
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      id,
    )}/market_chart?vs_currency=usd&days=${encodeURIComponent(days)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_POLICY.candleTimeoutMs);
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
        headers: { "Cache-Control": "private, max-age=60" },
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
