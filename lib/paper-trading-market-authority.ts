/**
 * Paper trading market-data authority (Step D).
 *
 * Gates paper order fills on market-data availability/quality.
 * Does not change Confidence, Trade Readiness, Hermes Score, or Learning Engine.
 */

import type { WorkspaceDataQuality } from "@/lib/market-data";

/** Qualities permitted as a paper fill mark. */
export const PAPER_EXECUTABLE_QUALITIES = [
  "Fixture",
  "Live",
  "Delayed",
] as const;

export type PaperExecutableQuality = (typeof PAPER_EXECUTABLE_QUALITIES)[number];

export type PaperMarketAuthorityCode =
  | "OK"
  | "UNAVAILABLE"
  | "UNSUPPORTED_TIMEFRAME"
  | "MISSING_MARKET_DATA"
  | "INVALID_PRICE"
  | "QUALITY_NOT_EXECUTABLE";

export type PaperMarketAuthorityInput = {
  symbol: string;
  /** Mark price the ticket would use for fill. */
  price: number;
  /** Step C workspace quality snapshot for the selected series. */
  dataQuality?: WorkspaceDataQuality | null;
  /** Optional purpose for copy; does not change rules. */
  purpose?: "open" | "close" | "reduce";
};

export type PaperMarketAuthorityResult = {
  allowed: boolean;
  code: PaperMarketAuthorityCode;
  /** Fill price when allowed. */
  fillPrice?: number;
  qualityLabel?: string;
  sourceLabel?: string;
  /** Full Hermes-style coach message for UI status. */
  message: string;
  whatFailed: string;
  whyBlocked: string;
  whatIsNeeded: string;
};

/**
 * Evaluate whether paper trading may use the current market mark.
 * Pure and deterministic — no side effects.
 */
export function evaluatePaperMarketDataAuthority(
  input: PaperMarketAuthorityInput,
): PaperMarketAuthorityResult {
  const symbol = String(input.symbol || "").toUpperCase() || "UNKNOWN";
  const purpose = input.purpose ?? "open";
  const price = input.price;
  const quality = input.dataQuality;

  if (!quality) {
    return blocked({
      code: "MISSING_MARKET_DATA",
      symbol,
      purpose,
      whatFailed: `Required market-data quality is missing for ${symbol}.`,
      whyBlocked:
        "Hermes will not paper-fill without knowing whether the mark is fixture, delayed, live, or unavailable.",
      whatIsNeeded:
        "Load workspace market data so a WorkspaceDataQuality snapshot is available (fixture is fine for practice).",
    });
  }

  if (quality.timeframeUnsupported || quality.errorCode === "UNSUPPORTED") {
    return blocked({
      code: "UNSUPPORTED_TIMEFRAME",
      symbol,
      purpose,
      qualityLabel: quality.statusLabel,
      sourceLabel: quality.sourceLabel,
      whatFailed: `Timeframe ${quality.timeframe} is not supported for live ${symbol} data.`,
      whyBlocked:
        "Unsupported fine intraday series must not pretend to be a valid live mark for paper execution.",
      whatIsNeeded:
        "Switch to a supported timeframe (1H, 4H, 1D, or 1W), or practice in fixture mode without the live flag.",
    });
  }

  if (quality.isUnavailable || quality.quality === "Unavailable") {
    return blocked({
      code: "UNAVAILABLE",
      symbol,
      purpose,
      qualityLabel: quality.statusLabel,
      sourceLabel: quality.sourceLabel,
      whatFailed: `Market price is unavailable for ${symbol}.`,
      whyBlocked:
        quality.summary ||
        "There is no valid mark price Hermes can use for a paper fill.",
      whatIsNeeded:
        "Restore a valid fixture or live/delayed quote for this symbol before executing the paper order.",
    });
  }

  if (!Number.isFinite(price) || price <= 0) {
    return blocked({
      code: "INVALID_PRICE",
      symbol,
      purpose,
      qualityLabel: quality.statusLabel,
      sourceLabel: quality.sourceLabel,
      whatFailed: `Mark price for ${symbol} is missing or invalid (${String(price)}).`,
      whyBlocked: "Paper fills require a finite positive price.",
      whatIsNeeded:
        "Wait for a valid quote (fixture catalog price or live/delayed provider mark).",
    });
  }

  if (!isPaperExecutableQuality(quality.quality)) {
    return blocked({
      code: "QUALITY_NOT_EXECUTABLE",
      symbol,
      purpose,
      qualityLabel: quality.statusLabel,
      sourceLabel: quality.sourceLabel,
      whatFailed: `Market data quality “${quality.quality}” is not executable for paper fills on ${symbol}.`,
      whyBlocked:
        "Only Fixture, Live, or Delayed marks are accepted as paper trading authority.",
      whatIsNeeded:
        "Use fixture practice data, or wait until the feed reports Delayed/Live quality with a valid price.",
    });
  }

  const purposeLabel =
    purpose === "close"
      ? "close"
      : purpose === "reduce"
        ? "reduce"
        : "open";

  return {
    allowed: true,
    code: "OK",
    fillPrice: price,
    qualityLabel: quality.statusLabel,
    sourceLabel: quality.sourceLabel,
    message: `Paper ${purposeLabel} authorized on ${quality.statusLabel} data from ${quality.sourceLabel}.`,
    whatFailed: "",
    whyBlocked: "",
    whatIsNeeded: "",
  };
}

export function isPaperExecutableQuality(
  quality: string,
): quality is PaperExecutableQuality {
  return (PAPER_EXECUTABLE_QUALITIES as readonly string[]).includes(quality);
}

/**
 * Hermes-style multi-line explanation for blocked paper execution.
 */
export function formatPaperAuthorityMessage(
  result: Pick<
    PaperMarketAuthorityResult,
    "whatFailed" | "whyBlocked" | "whatIsNeeded" | "code"
  >,
): string {
  if (result.code === "OK") {
    return "";
  }
  return [
    "Hermes cannot execute this paper trade.",
    `What failed: ${result.whatFailed}`,
    `Why: ${result.whyBlocked}`,
    `What is needed: ${result.whatIsNeeded}`,
  ].join(" ");
}

function blocked(args: {
  code: Exclude<PaperMarketAuthorityCode, "OK">;
  symbol: string;
  purpose: "open" | "close" | "reduce";
  whatFailed: string;
  whyBlocked: string;
  whatIsNeeded: string;
  qualityLabel?: string;
  sourceLabel?: string;
}): PaperMarketAuthorityResult {
  const base = {
    allowed: false as const,
    code: args.code,
    qualityLabel: args.qualityLabel,
    sourceLabel: args.sourceLabel,
    whatFailed: args.whatFailed,
    whyBlocked: args.whyBlocked,
    whatIsNeeded: args.whatIsNeeded,
    message: "",
  };
  return {
    ...base,
    message: formatPaperAuthorityMessage(base),
  };
}
