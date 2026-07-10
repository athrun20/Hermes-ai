import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { Candle } from "@/lib/market-data";
import { formatCurrency } from "@/lib/market-data";
import { buildHermesChartSeries } from "@/lib/hermes-chart-engine/indicators";
import {
  buildRsiSignal,
  buildVolumeAverage,
  findMacdCrossovers,
} from "@/lib/hermes-chart-engine/indicator-calculations";
import { buildHermesZones } from "@/lib/hermes-chart-engine/hermes-zone-engine";
import {
  buildChartBounds,
  getPriceRange,
  getVisibleCandles,
  indexToX,
  priceToY,
  valueToY,
} from "@/lib/hermes-chart-engine/scales";
import type { ChartRect, HermesChartRenderInput } from "@/lib/hermes-chart-engine/types";

export function renderHermesChart(input: HermesChartRenderInput) {
  const {
    canvas,
    candles,
    viewport,
    indicators,
    drawings,
    tradeLevels,
    visionLabels,
    crosshair,
    selectedCandleIndex,
  } = input;
  const context = canvas.getContext("2d");
  if (!context) return;

  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#060910";
  context.fillRect(0, 0, width, height);

  const bounds = buildChartBounds(width, height, indicators);
  const visible = getVisibleCandles(candles, viewport);
  const priceRange = getPriceRange(visible.length ? visible : candles);
  const series = buildHermesChartSeries(candles);

  drawGrid(context, bounds.plot);
  drawHermesZones(context, buildHermesZones({ candles, labels: visionLabels, tradeLevels }), bounds.plot, priceRange);
  drawCandles(context, candles, viewport, bounds.plot, priceRange, selectedCandleIndex ?? null);
  if (indicators.ema20) drawLine(context, series.ema20, viewport, bounds.plot, priceRange, "#8CF7CA", 1.85);
  if (indicators.ema50) drawLine(context, series.ema50, viewport, bounds.plot, priceRange, "#F4C066", 1.85, [7, 5]);
  if (indicators.sma20) drawLine(context, series.sma20, viewport, bounds.plot, priceRange, "#C4B5FD", 1.65, [2, 5]);
  if (indicators.vwap) drawLine(context, series.vwap, viewport, bounds.plot, priceRange, "#8DDFFC", 1.8, [1, 6]);
  drawDrawings(context, drawings, bounds.plot, priceRange);
  drawTradeLevels(context, tradeLevels, bounds.plot, priceRange);
  drawVisionLabels(context, visionLabels, bounds.plot, priceRange);
  drawCurrentPrice(context, candles.at(-1)?.close, bounds.plot, priceRange, width);
  drawPriceAxis(context, bounds.plot, priceRange, width);
  drawTimeAxis(context, candles, viewport, bounds.plot, height);

  if (bounds.volume) drawVolume(context, series.volume, candles, viewport, bounds.volume);
  if (bounds.rsi) drawRsi(context, series.rsi, viewport, bounds.rsi);
  if (bounds.macd) drawMacd(context, series.macd, viewport, bounds.macd);
  if (crosshair.visible) drawCrosshair(context, crosshair.x, crosshair.y, candles, viewport, bounds.plot, priceRange, width, height);
}

function drawGrid(context: CanvasRenderingContext2D, rect: ChartRect) {
  context.lineWidth = 0.75;
  for (let i = 0; i <= 5; i += 1) {
    const y = rect.y + (rect.height / 5) * i;
    context.strokeStyle = i === 0 || i === 5 ? "rgba(255,255,255,0.052)" : "rgba(255,255,255,0.032)";
    context.beginPath();
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
    context.stroke();
  }
  context.strokeStyle = "rgba(255,255,255,0.02)";
  for (let i = 0; i <= 8; i += 1) {
    const x = rect.x + (rect.width / 8) * i;
    context.beginPath();
    context.moveTo(x, rect.y);
    context.lineTo(x, rect.y + rect.height);
    context.stroke();
  }
}

function drawCandles(
  context: CanvasRenderingContext2D,
  candles: Candle[],
  viewport: { start: number; end: number },
  rect: ChartRect,
  range: { min: number; max: number },
  selectedIndex: number | null,
) {
  const count = Math.max(1, viewport.end - viewport.start + 1);
  const slot = rect.width / count;
  const bodyWidth = Math.max(4.5, Math.min(17, slot * 0.72));
  for (let index = viewport.start; index <= viewport.end; index += 1) {
    const candle = candles[index];
    if (!candle) continue;
    const x = indexToX(index, viewport, rect);
    const openY = priceToY(candle.open, range, rect);
    const closeY = priceToY(candle.close, range, rect);
    const highY = priceToY(candle.high, range, rect);
    const lowY = priceToY(candle.low, range, rect);
    const up = candle.close >= candle.open;
    context.strokeStyle = up ? "rgba(140,247,202,0.92)" : "rgba(253,164,175,0.92)";
    context.fillStyle = up ? "#2FD49A" : "#F25F7A";
    context.lineWidth = 1;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, highY);
    context.lineTo(x, lowY);
    context.stroke();
    context.beginPath();
    context.roundRect(x - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.max(2, Math.abs(openY - closeY)), 1.8);
    context.fill();
    if (selectedIndex === index) {
      context.strokeStyle = "rgba(245,184,75,0.9)";
      context.lineWidth = 1.5;
      context.strokeRect(x - bodyWidth / 2 - 2, Math.min(openY, closeY) - 2, bodyWidth + 4, Math.max(6, Math.abs(openY - closeY) + 4));
    }
  }
}

function drawHermesZones(
  context: CanvasRenderingContext2D,
  zones: ReturnType<typeof buildHermesZones>,
  rect: ChartRect,
  range: { min: number; max: number },
) {
  const tones = {
    gold: "245,184,75",
    mint: "121,242,192",
    rose: "253,164,175",
    blue: "125,211,252",
  };
  zones.forEach((zone, index) => {
    const y = priceToY(zone.price, range, rect);
    const rgb = tones[zone.tone];
    context.fillStyle = `rgba(${rgb},0.06)`;
    context.strokeStyle = `rgba(${rgb},0.18)`;
    context.fillRect(rect.x, y - 20, rect.width, 40);
    context.strokeRect(rect.x, y - 20, rect.width, 40);
    drawTag(context, zone.label, rect.x + 14, y - 11 + index * 26, `rgb(${rgb})`);
  });
}

function drawLine(context: CanvasRenderingContext2D, values: number[], viewport: { start: number; end: number }, rect: ChartRect, range: { min: number; max: number }, color: string, width: number, dash: number[] = []) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = color;
  context.shadowBlur = 2;
  context.setLineDash(dash);
  context.beginPath();
  let started = false;
  for (let index = viewport.start; index <= viewport.end; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) continue;
    const x = indexToX(index, viewport, rect);
    const y = priceToY(value, range, rect);
    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  context.restore();
}

function drawDrawings(context: CanvasRenderingContext2D, drawings: ChartDrawing[], rect: ChartRect, range: { min: number; max: number }) {
  drawings.forEach((drawing) => {
    const y = priceToY(drawing.price, range, rect);
    const tone = drawing.type === "resistance-zone" ? "#FDA4AF" : drawing.type === "support-zone" ? "#79F2C0" : "#F5B84B";
    context.strokeStyle = tone;
    context.fillStyle = tone;
    context.lineWidth = 1;
    context.globalAlpha = drawing.type === "support-zone" || drawing.type === "resistance-zone" || drawing.type === "rectangle" ? 0.18 : 0.85;
    if (drawing.type === "support-zone" || drawing.type === "resistance-zone" || drawing.type === "rectangle") {
      context.fillRect(rect.x, y - 14, rect.width, 28);
      context.strokeRect(rect.x, y - 14, rect.width, 28);
    } else if (drawing.type === "trend-line" || drawing.type === "ray") {
      context.beginPath();
      context.moveTo(rect.x + rect.width * 0.18, y + 32);
      context.lineTo(rect.x + rect.width * 0.84, y - 28);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(rect.x, y);
      context.lineTo(rect.x + rect.width, y);
      context.stroke();
    }
    context.globalAlpha = 1;
  });
}

function drawTradeLevels(context: CanvasRenderingContext2D, levels: ChartTradeLevels, rect: ChartRect, range: { min: number; max: number }) {
  const placed: number[] = [];
  [
    ["Entry", levels.entry, "#79F2C0"],
    ["Stop", levels.stop, "#FDA4AF"],
    ["Target", levels.target, "#F5B84B"],
  ].forEach(([label, price, color]) => {
    if (typeof price !== "number") return;
    let y = priceToY(price, range, rect);
    while (placed.some((placedY) => Math.abs(placedY - y) < 24)) y += 24;
    y = Math.max(rect.y + 4, Math.min(rect.y + rect.height - 26, y));
    placed.push(y);
    context.strokeStyle = color as string;
    context.lineWidth = 1.25;
    context.beginPath();
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
    context.stroke();
    drawTag(context, `${label} ${formatCurrency(price)}`, rect.x + rect.width - 150, y - 12, color as string);
  });
}

function drawCurrentPrice(
  context: CanvasRenderingContext2D,
  price: number | undefined,
  rect: ChartRect,
  range: { min: number; max: number },
  width: number,
) {
  if (typeof price !== "number") return;
  const y = priceToY(price, range, rect);
  context.save();
  context.strokeStyle = "rgba(245,184,75,0.58)";
  context.lineWidth = 1;
  context.setLineDash([3, 5]);
  context.beginPath();
  context.moveTo(rect.x, y);
  context.lineTo(rect.x + rect.width, y);
  context.stroke();
  context.restore();
  drawPriceTag(context, formatCurrency(price), width - 88, y - 12, "#F5B84B");
}

function drawVisionLabels(context: CanvasRenderingContext2D, labels: HermesChartRenderInput["visionLabels"], rect: ChartRect, range: { min: number; max: number }) {
  labels.slice(0, 5).forEach((label, index) => {
    const y = priceToY(label.price ?? range.max, range, rect) + index * 28;
    const color = label.tone === "danger" ? "#FDA4AF" : label.tone === "mint" ? "#79F2C0" : "#F5B84B";
    const delta = label.explanation?.confidenceDelta;
    const text = typeof delta === "number" && Math.abs(delta) >= 3
      ? `${label.text} ${delta >= 0 ? "+" : ""}${delta}`
      : label.text;
    drawTag(context, text, rect.x + 14, Math.max(rect.y + 10, Math.min(rect.y + rect.height - 26, y)), color);
  });
}

function drawPriceAxis(context: CanvasRenderingContext2D, rect: ChartRect, range: { min: number; max: number }, width: number) {
  context.fillStyle = "rgba(203,213,225,0.72)";
  context.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (let i = 0; i <= 5; i += 1) {
    const value = range.max - ((range.max - range.min) / 5) * i;
    const y = rect.y + (rect.height / 5) * i;
    context.fillText(formatCurrency(value), width - 68, y + 4);
  }
}

function drawTimeAxis(context: CanvasRenderingContext2D, candles: Candle[], viewport: { start: number; end: number }, rect: ChartRect, height: number) {
  context.fillStyle = "rgba(138,150,168,0.78)";
  context.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (let i = 0; i <= 4; i += 1) {
    const index = Math.round(viewport.start + ((viewport.end - viewport.start) / 4) * i);
    const candle = candles[index];
    if (!candle) continue;
    const x = indexToX(index, viewport, rect);
    const label = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(candle.time * 1000));
    context.fillText(label, x - 22, height - 8);
  }
}

function drawVolume(context: CanvasRenderingContext2D, volume: number[], candles: Candle[], viewport: { start: number; end: number }, rect: ChartRect) {
  drawPanelShell(context, rect, "Volume");
  const average = buildVolumeAverage(volume, 20);
  const visible = volume.slice(viewport.start, viewport.end + 1);
  const visibleAverage = average.slice(viewport.start, viewport.end + 1);
  const max = Math.max(...visible, 1);
  const slot = rect.width / Math.max(1, visible.length);
  visible.forEach((value, offset) => {
    const candle = candles[viewport.start + offset];
    const avg = visibleAverage[offset] ?? value;
    const ratio = avg > 0 ? value / avg : 1;
    const isUp = candle && candle.close >= candle.open;
    const alpha = ratio >= 1.35 ? 0.78 : ratio <= 0.65 ? 0.2 : 0.48;
    context.fillStyle = isUp ? `rgba(121,242,192,${alpha})` : `rgba(253,164,175,${alpha})`;
    const height = Math.max(2, (value / max) * (rect.height - 30));
    const barWidth = Math.max(2, slot * 0.58);
    context.fillRect(rect.x + offset * slot + (slot - barWidth) / 2, rect.y + rect.height - height - 8, barWidth, height);
  });
  drawPanelLine(context, average, viewport, rect, { min: 0, max }, "rgba(245,184,75,0.82)", 1.25);

  const current = volume[viewport.end] ?? 0;
  const currentAverage = average[viewport.end] ?? current;
  const ratio = currentAverage > 0 ? ((current / currentAverage - 1) * 100) : 0;
  drawPanelValue(
    context,
    rect,
    `${compactNumber(current)} | ${ratio >= 0 ? "+" : ""}${Math.round(ratio)}% vs avg`,
    ratio >= 35 ? "#F5B84B" : ratio < -35 ? "#8A96A8" : "#CBD5E1",
  );
  drawRightScale(context, rect, [max, max / 2, 0], compactNumber);
}

function drawRsi(context: CanvasRenderingContext2D, rsi: number[], viewport: { start: number; end: number }, rect: ChartRect) {
  drawPanelShell(context, rect, "RSI");
  shadeBand(context, rect, 70, 100, "rgba(253,164,175,0.045)");
  shadeBand(context, rect, 0, 30, "rgba(121,242,192,0.045)");
  drawReference(context, rect, 70, 0, 100, "70");
  drawReference(context, rect, 50, 0, 100, "50");
  drawReference(context, rect, 30, 0, 100, "30");
  drawPanelLine(context, buildRsiSignal(rsi), viewport, rect, { min: 0, max: 100 }, "rgba(141,223,252,0.58)", 1);
  drawPanelLine(context, rsi, viewport, rect, { min: 0, max: 100 }, "#F4C066", 1.75);
  drawPanelValue(context, rect, `RSI ${Math.round(rsi[viewport.end] ?? 50)}`, "#F5B84B");
}

function drawMacd(context: CanvasRenderingContext2D, macd: Array<{ macd: number; signal: number; histogram: number }>, viewport: { start: number; end: number }, rect: ChartRect) {
  drawPanelShell(context, rect, "MACD");
  const histogram = macd.map((point) => point.histogram);
  const visible = histogram.slice(viewport.start, viewport.end + 1);
  const max = Math.max(...visible.map((value) => Math.abs(value)), 1);
  const slot = rect.width / Math.max(1, visible.length);
  const zero = rect.y + rect.height / 2;
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(rect.x, zero);
  context.lineTo(rect.x + rect.width, zero);
  context.stroke();
  visible.forEach((value, offset) => {
    context.fillStyle = value >= 0 ? "rgba(121,242,192,0.56)" : "rgba(253,164,175,0.54)";
    const height = Math.max(2, (Math.abs(value) / max) * (rect.height * 0.42));
    const barWidth = Math.max(2, slot * 0.52);
    context.fillRect(rect.x + offset * slot + (slot - barWidth) / 2, value >= 0 ? zero - height : zero, barWidth, height);
  });
  drawPanelLine(context, macd.map((point) => point.macd), viewport, rect, { min: -2.5, max: 2.5 }, "#8CF7CA", 1.7);
  drawPanelLine(context, macd.map((point) => point.signal), viewport, rect, { min: -2.5, max: 2.5 }, "#F4C066", 1.45);
  drawMacdCrossovers(context, macd, viewport, rect, { min: -2.5, max: 2.5 });
  const current = macd[viewport.end] ?? { macd: 0, signal: 0 };
  drawPanelValue(context, rect, `MACD ${current.macd.toFixed(2)} | Signal ${current.signal.toFixed(2)}`, "#CBD5E1");
}

function drawPanelShell(context: CanvasRenderingContext2D, rect: ChartRect, title: string) {
  context.save();
  context.fillStyle = "rgba(255,255,255,0.012)";
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "rgba(255,255,255,0.07)";
  context.lineWidth = 0.8;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  context.fillStyle = "rgba(203,213,225,0.76)";
  context.font = "600 11px Inter, sans-serif";
  context.fillText(title, rect.x + 10, rect.y + 17);
  context.restore();
}

function drawReference(context: CanvasRenderingContext2D, rect: ChartRect, value: number, min: number, max: number, label?: string) {
  const y = valueToY(value, { min, max }, rect);
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 0.75;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(rect.x, y);
  context.lineTo(rect.x + rect.width, y);
  context.stroke();
  context.setLineDash([]);
  if (label) {
    context.fillStyle = "rgba(138,150,168,0.72)";
    context.font = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText(label, rect.x + rect.width - 22, y - 3);
  }
}

function drawPanelLine(context: CanvasRenderingContext2D, values: number[], viewport: { start: number; end: number }, rect: ChartRect, range: { min: number; max: number }, color: string, width = 1.5) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  let started = false;
  for (let index = viewport.start; index <= viewport.end; index += 1) {
    const value = values[index];
    const x = indexToX(index, viewport, rect);
    const y = valueToY(value, range, rect);
    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  context.restore();
}

function drawCrosshair(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  candles: Candle[],
  viewport: { start: number; end: number },
  rect: ChartRect,
  range: { min: number; max: number },
  width: number,
  height: number,
) {
  context.save();
  context.strokeStyle = "rgba(245,184,75,0.34)";
  context.lineWidth = 0.85;
  context.setLineDash([4, 5]);
  context.beginPath();
  context.moveTo(x, rect.y);
  context.lineTo(x, height - 28);
  context.moveTo(rect.x, y);
  context.lineTo(rect.x + rect.width, y);
  context.stroke();
  context.setLineDash([]);
  const price = range.max - ((y - rect.y) / rect.height) * (range.max - range.min);
  drawPriceTag(context, formatCurrency(price), width - 88, y - 12, "#F5B84B");
  const ratioX = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
  const index = Math.round(viewport.start + ratioX * Math.max(0, viewport.end - viewport.start));
  const candle = candles[index];
  if (candle) {
    const label = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(candle.time * 1000));
    drawPriceTag(context, label, Math.max(rect.x, Math.min(rect.x + rect.width - 78, x - 39)), height - 27, "#F5B84B");
  }
  context.restore();
}

function shadeBand(context: CanvasRenderingContext2D, rect: ChartRect, min: number, max: number, color: string) {
  const yTop = valueToY(max, { min: 0, max: 100 }, rect);
  const yBottom = valueToY(min, { min: 0, max: 100 }, rect);
  context.fillStyle = color;
  context.fillRect(rect.x, yTop, rect.width, yBottom - yTop);
}

function drawPanelValue(context: CanvasRenderingContext2D, rect: ChartRect, text: string, color: string) {
  context.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  const width = context.measureText(text).width;
  context.fillStyle = color;
  context.fillText(text, rect.x + rect.width - width - 10, rect.y + 15);
}

function drawRightScale(context: CanvasRenderingContext2D, rect: ChartRect, values: number[], format: (value: number) => string) {
  context.fillStyle = "rgba(105,115,134,0.85)";
  context.font = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  values.forEach((value, index) => {
    const y = rect.y + 24 + ((rect.height - 34) / Math.max(1, values.length - 1)) * index;
    context.fillText(format(value), rect.x + rect.width - 46, y);
  });
}

function drawMacdCrossovers(
  context: CanvasRenderingContext2D,
  macd: Array<{ macd: number; signal: number; histogram: number }>,
  viewport: { start: number; end: number },
  rect: ChartRect,
  range: { min: number; max: number },
) {
  const crossovers = findMacdCrossovers(macd);
  for (let index = viewport.start; index <= viewport.end; index += 1) {
    const crossover = crossovers[index];
    if (crossover === "none") continue;
    const x = indexToX(index, viewport, rect);
    const y = valueToY(macd[index]?.macd ?? 0, range, rect);
    context.fillStyle = crossover === "bullish" ? "#79F2C0" : "#FDA4AF";
    context.beginPath();
    if (crossover === "bullish") {
      context.moveTo(x, y - 6);
      context.lineTo(x - 5, y + 4);
      context.lineTo(x + 5, y + 4);
    } else {
      context.moveTo(x, y + 6);
      context.lineTo(x - 5, y - 4);
      context.lineTo(x + 5, y - 4);
    }
    context.closePath();
    context.fill();
  }
}

function compactNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
}

function drawTag(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  context.font = "11px Inter, sans-serif";
  const width = Math.min(180, context.measureText(text).width + 14);
  context.fillStyle = "rgba(7,10,15,0.9)";
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, 22, 5);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.fillText(text, x + 7, y + 15);
}

function drawPriceTag(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  context.save();
  context.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  const width = Math.min(122, context.measureText(text).width + 16);
  context.fillStyle = "rgba(6,9,16,0.94)";
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.shadowColor = "rgba(0,0,0,0.35)";
  context.shadowBlur = 8;
  context.beginPath();
  context.roundRect(x, y, width, 24, 6);
  context.fill();
  context.shadowBlur = 0;
  context.stroke();
  context.fillStyle = color;
  context.fillText(text, x + 8, y + 16);
  context.restore();
}
