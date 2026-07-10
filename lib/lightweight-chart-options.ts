import {
  ColorType,
  type ChartOptions,
  type DeepPartial,
} from "lightweight-charts";

export const tradingViewAttributionHref = "https://www.tradingview.com/";

export function createHermesLightweightChartOptions(
  overrides: DeepPartial<ChartOptions> = {},
): DeepPartial<ChartOptions> {
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "#070A0F" },
      textColor: "#6B7A90",
      attributionLogo: false,
      ...overrides.layout,
    },
    grid: {
      vertLines: { color: "rgba(255,255,255,0.045)" },
      horzLines: { color: "rgba(255,255,255,0.055)" },
      ...overrides.grid,
    },
    rightPriceScale: {
      borderColor: "rgba(255,255,255,0.10)",
      ...overrides.rightPriceScale,
    },
    timeScale: {
      borderColor: "rgba(255,255,255,0.10)",
      timeVisible: true,
      secondsVisible: false,
      ...overrides.timeScale,
    },
    ...overrides,
  };
}
