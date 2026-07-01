"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatCurrency, type AssetQuote } from "@/lib/market-data";
import type { OrderAction, PositionSide } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export type TradeTicket = {
  action: OrderAction;
  side: PositionSide;
  notional: number;
  stopLoss?: number;
  takeProfit?: number;
};

export function TradeControls({
  buyingPower,
  quote,
  onSubmit,
}: {
  buyingPower: number;
  quote: AssetQuote;
  onSubmit: (ticket: TradeTicket) => string | undefined;
}) {
  const [side, setSide] = useState<PositionSide>("Long");
  const [notional, setNotional] = useState("500");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [message, setMessage] = useState("Paper orders only. No broker connection.");

  const submit = (action: OrderAction) => {
    const response = onSubmit({
      action,
      side,
      notional: Number(notional),
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
    });
    setMessage(response ?? getSuccessMessage(action, side));
  };

  return (
    <Panel>
      <PanelHeader
        eyebrow="Trade Controls"
        title={`${quote.symbol} Paper Ticket`}
        action={<span className="text-xs text-slate-500">{formatCurrency(quote.price)}</span>}
      />
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-1">
          {(["Long", "Short"] as const).map((option) => (
            <button
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                side === option ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"
              }`}
              key={option}
              onClick={() => setSide(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>

        <div className="grid gap-3 text-sm">
          <Input label="Position Size" prefix="$" value={notional} onChange={setNotional} />
          <Input label="Stop-loss" prefix="$" value={stopLoss} onChange={setStopLoss} />
          <Input label="Take-profit" prefix="$" value={takeProfit} onChange={setTakeProfit} />
        </div>

        {side === "Long" ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-mint-400 px-4 py-3 text-sm font-bold text-surface-950 transition hover:bg-mint-300"
              onClick={() => submit("Buy")}
              type="button"
            >
              <ArrowUpFromLine className="size-4" aria-hidden="true" />
              Buy
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-400 px-4 py-3 text-sm font-bold text-surface-950 transition hover:bg-rose-300"
              onClick={() => submit("Sell")}
              type="button"
            >
              <ArrowDownToLine className="size-4" aria-hidden="true" />
              Sell
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amberline px-4 py-3 text-sm font-bold text-surface-950 transition hover:brightness-110"
              onClick={() => submit("Short")}
              type="button"
            >
              <ArrowDownToLine className="size-4" aria-hidden="true" />
              Short
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-200 px-4 py-3 text-sm font-bold text-surface-950 transition hover:bg-white"
              onClick={() => submit("Cover")}
              type="button"
            >
              <ArrowUpFromLine className="size-4" aria-hidden="true" />
              Cover
            </button>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-surface-950/50 p-3 text-xs leading-5 text-slate-400">
          <p>Buying power: {formatCurrency(buyingPower)}</p>
          <p className="mt-1">{message}</p>
        </div>
      </div>
    </Panel>
  );
}

function getSuccessMessage(action: OrderAction, side: PositionSide) {
  if (action === "Buy") {
    return "Long paper position opened.";
  }

  if (action === "Sell") {
    return "Long paper position sold.";
  }

  if (action === "Short") {
    return "Short paper position opened.";
  }

  return "Short paper position covered.";
}

function Input({
  label,
  prefix,
  value,
  onChange,
}: {
  label: string;
  prefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-surface-950/55 px-3">
        <span className="text-slate-500">{prefix}</span>
        <input
          className="h-10 w-full bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-600"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          type="number"
          value={value}
        />
      </div>
    </label>
  );
}
