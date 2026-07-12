/**
 * Isolated CoinGecko quote proxy (Step A).
 * Not wired to the dashboard. React must not call CoinGecko directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { COINGECKO_ID_BY_SYMBOL } from "@/lib/market-data/crypto-provider";
import { REQUEST_POLICY } from "@/lib/market-data/policy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const idParam = request.nextUrl.searchParams.get("id");
  const id =
    idParam || (symbol ? COINGECKO_ID_BY_SYMBOL[symbol] : undefined);

  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED",
          message: "Unknown crypto symbol / CoinGecko id.",
          retryable: false,
        },
        providerStatus: "Unsupported",
      },
      { status: 400 },
    );
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      id,
    )}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;

    const data = await fetchWithTimeout(url, REQUEST_POLICY.quoteTimeoutMs);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (error) {
    return mapProxyError(error);
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (response.status === 429) {
      throw Object.assign(new Error("429 rate limited"), { status: 429 });
    }
    if (!response.ok) {
      throw Object.assign(new Error(`HTTP ${response.status}`), {
        status: response.status,
      });
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function mapProxyError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status: number }).status)
      : 502;
  if (status === 429 || /429/.test(msg)) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: msg,
          retryable: true,
          provider: "coingecko",
        },
        providerStatus: "Rate Limited",
      },
      { status: 429 },
    );
  }
  if (/abort/i.test(msg)) {
    return NextResponse.json(
      {
        error: {
          code: "TIMEOUT",
          message: msg,
          retryable: true,
          provider: "coingecko",
        },
        providerStatus: "Degraded",
      },
      { status: 504 },
    );
  }
  return NextResponse.json(
    {
      error: {
        code: "UNAVAILABLE",
        message: msg,
        retryable: true,
        provider: "coingecko",
      },
      providerStatus: "Offline",
    },
    { status: 502 },
  );
}
